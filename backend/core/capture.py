import threading
import time
import asyncio
import logging
logging.getLogger("scapy.runtime").setLevel(logging.ERROR)
from scapy.all import sniff, IP, TCP, UDP, ARP, ICMP, Ether
from api.websockets import manager
from core.rules import evaluate_packet
from collections import defaultdict

class PacketCapture(threading.Thread):
    def __init__(self, interface=None, loop=None):
        super().__init__()
        self.interface = interface
        self.loop = loop
        self.daemon = True
        self._stop_event = threading.Event()
        
        # Stats tracking
        self.bytes_in = 0
        self.bytes_out = 0
        self.protocol_counts = defaultdict(int)
        self.last_stats_time = time.time()

    def stop(self):
        self._stop_event.set()

    def run(self):
        # We need a stop filter function for scapy
        def stop_filter(x):
            return self._stop_event.is_set()
            
        try:
            sniff(
                iface=self.interface,
                prn=self.process_packet,
                stop_filter=stop_filter,
                store=False # Very important to prevent memory leak
            )
        except Exception as e:
            print(f"Capture error: {e}")

    def process_packet(self, packet):
        try:
            size = len(packet)
            self.bytes_in += size # Simplification: total bytes on interface
            
            payload = {
                "type": "packet",
                "data": {
                    "timestamp": time.time(),
                    "size": size,
                    "protocol": "Unknown",
                    "src_mac": packet.src if packet.haslayer(Ether) else None,
                    "dst_mac": packet.dst if packet.haslayer(Ether) else None,
                }
            }

            if packet.haslayer(IP):
                payload["data"]["src_ip"] = packet[IP].src
                payload["data"]["dst_ip"] = packet[IP].dst
                
                if packet.haslayer(TCP):
                    payload["data"]["protocol"] = "TCP"
                    payload["data"]["src_port"] = packet[TCP].sport
                    payload["data"]["dst_port"] = packet[TCP].dport
                elif packet.haslayer(UDP):
                    payload["data"]["protocol"] = "UDP"
                    payload["data"]["src_port"] = packet[UDP].sport
                    payload["data"]["dst_port"] = packet[UDP].dport
                elif packet.haslayer(ICMP):
                    payload["data"]["protocol"] = "ICMP"
            elif packet.haslayer(ARP):
                payload["data"]["protocol"] = "ARP"
                payload["data"]["src_ip"] = packet[ARP].psrc
                payload["data"]["dst_ip"] = packet[ARP].pdst
                
            self.protocol_counts[payload["data"]["protocol"]] += 1
            
            # Evaluate packet for alerts
            evaluate_packet(payload["data"])
            
            # Broadcast packet event (throttling might be needed in production)
            if self.loop:
                asyncio.run_coroutine_threadsafe(manager.broadcast(payload), self.loop)
                
            # Periodic stats tick
            now = time.time()
            if now - self.last_stats_time >= 1.0:
                stats_payload = {
                    "type": "stats",
                    "data": {
                        "bandwidth_bps": self.bytes_in * 8, # bits per second
                        "protocols": dict(self.protocol_counts)
                    }
                }
                if self.loop:
                    asyncio.run_coroutine_threadsafe(manager.broadcast(stats_payload), self.loop)
                self.bytes_in = 0
                self.last_stats_time = now
                
        except Exception as e:
            pass # Ignore malformed packets

# Global capture instance
capture_thread = None

def start_capture(interface=None, loop=None):
    global capture_thread
    if capture_thread is None or not capture_thread.is_alive():
        capture_thread = PacketCapture(interface=interface, loop=loop)
        capture_thread.start()
        return True
    return False

def stop_capture():
    global capture_thread
    if capture_thread and capture_thread.is_alive():
        capture_thread.stop()
        capture_thread.join()
        return True
    return False
