import nmap
import psutil
import netifaces
import ipaddress
import threading
import os
import time
from zeroconf import Zeroconf, ServiceBrowser

OUI_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "oui.txt")

class OUIDatabase:
    def __init__(self):
        self.mac_map = {}
        self._load()

    def _load(self):
        if not os.path.exists(OUI_FILE):
            return
        with open(OUI_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                if '(hex)' in line:
                    parts = line.split('(hex)')
                    if len(parts) == 2:
                        mac_prefix = parts[0].strip().replace('-', ':').upper()
                        vendor = parts[1].strip()
                        self.mac_map[mac_prefix] = vendor

    def get_vendor(self, mac_address):
        if not mac_address:
            return "Unknown"
        mac_upper = mac_address.upper()
        prefix = mac_upper[:8]
        return self.mac_map.get(prefix, "Unknown")

oui_db = OUIDatabase()

def get_active_subnets():
    """Finds all active IPv4 subnets across primary network interfaces."""
    subnets = []
    ignored_prefixes = ('lo', 'docker', 'veth', 'tun', 'tap', 'virbr', 'br-', 'vmnet')
    
    interfaces = netifaces.interfaces()
    for iface in interfaces:
        if iface.lower().startswith(ignored_prefixes):
            continue
            
        addrs = netifaces.ifaddresses(iface)
        if netifaces.AF_INET in addrs:
            for addr in addrs[netifaces.AF_INET]:
                ip = addr.get('addr')
                netmask = addr.get('netmask')
                if ip and netmask and ip != '127.0.0.1':
                    try:
                        network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
                        subnets.append({
                            "interface": iface,
                            "network": str(network)
                        })
                    except ValueError:
                        continue
    return subnets

def get_mdns_hostnames(timeout=3):
    """Collects hostnames via mDNS/Zeroconf."""
    hostnames = {}
    zeroconf = Zeroconf()
    
    class Listener:
        def remove_service(self, zc, type_, name): pass
        def update_service(self, zc, type_, name): pass
        def add_service(self, zc, type_, name):
            info = zc.get_service_info(type_, name)
            if info:
                for addr in info.parsed_addresses():
                    if addr not in hostnames:
                        clean_name = name.split('.')[0]
                        hostnames[addr] = clean_name
                        
    browser = ServiceBrowser(zeroconf, ["_http._tcp.local.", "_airplay._tcp.local.", "_googlecast._tcp.local.", "_smb._tcp.local.", "_printer._tcp.local."], Listener())
    time.sleep(timeout)
    zeroconf.close()
    return hostnames

def scan_network_advanced(deep_scan=False):
    """
    Scans active local subnets with Nmap.
    If deep_scan is True, attempts OS fingerprinting and service detection.
    """
    nm = nmap.PortScanner()
    devices = []
    subnets = get_active_subnets()
    
    mdns_hosts = get_mdns_hostnames(timeout=2)
    
    for subnet in subnets:
        target = subnet["network"]
        scan_args = "-sn --min-rate 300"
        
        if deep_scan:
            scan_args = "-O -sV -F --host-timeout 1m --max-retries 0 --min-rate 300"

        try:
            nm.scan(hosts=target, arguments=scan_args) 
            
            for host in nm.all_hosts():
                if nm[host].state() == 'up':
                    mac = None
                    vendor = "Unknown"
                    if 'mac' in nm[host]['addresses']:
                        mac = nm[host]['addresses']['mac']
                        vendor = nm[host]['vendor'].get(mac, oui_db.get_vendor(mac))
                    
                    os_match = None
                    if deep_scan and 'osmatch' in nm[host] and len(nm[host]['osmatch']) > 0:
                        os_match = nm[host]['osmatch'][0]['name']
                    
                    open_ports = []
                    if deep_scan and 'tcp' in nm[host]:
                        for port in nm[host]['tcp']:
                            if nm[host]['tcp'][port]['state'] == 'open':
                                name = nm[host]['tcp'][port]['name']
                                open_ports.append(f"{port}/{name}")
                    
                    devices.append({
                        "ip": host,
                        "mac": mac or "Unknown",
                        "vendor": vendor,
                        "hostname": mdns_hosts.get(host) or nm[host].hostname(),
                        "os_match": os_match,
                        "open_ports": ",".join(open_ports) if open_ports else None,
                        "interface": subnet["interface"]
                    })
        except Exception as e:
            print(f"Nmap scan error on {target}: {e}")
            
    return devices
