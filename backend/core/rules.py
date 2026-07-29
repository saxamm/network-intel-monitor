import os
from datetime import datetime, timezone
from db.database import SessionLocal
from db.models import Alert
import subprocess

def trigger_macos_notification(title, message):
    """Triggers a native macOS notification."""
    script = f'display notification "{message}" with title "{title}"'
    subprocess.run(["osascript", "-e", script])

def evaluate_packet(packet_data):
    """
    Evaluates packet data against simple rules.
    packet_data: dict from capture.py
    """
    # Example Rule: Detect unusual protocols
    proto = packet_data.get("protocol")
    src_ip = packet_data.get('src_ip', 'Unknown')
    dst_ip = packet_data.get('dst_ip', 'Unknown')
    size = packet_data.get('size', 0)
    
    if proto == "Telnet":
        create_alert("CRITICAL", f"Unencrypted Telnet Traffic | SRC: {src_ip} | DST: {dst_ip} | Size: {size}B", packet_data.get("src_mac"))
    elif proto == "ARP" and size > 100:
        create_alert("WARN", f"Unusual ARP Broadcast | SRC: {src_ip} | Size: {size}B", packet_data.get("src_mac"))

def evaluate_new_device(device_dict):
    """
    Evaluates a newly discovered device.
    """
    vendor = device_dict.get('vendor', 'Unknown')
    ip = device_dict.get('ip', 'Unknown')
    mac = device_dict.get('mac', 'Unknown')
    os_match = device_dict.get('os_match')
    
    details = f"IP: {ip} | Vendor: {vendor}"
    if os_match: details += f" | OS: {os_match}"
        
    create_alert("INFO", f"Target Discovered | {details}", mac)

def create_alert(severity, message, source_mac=None):
    """
    Saves the alert to the database and optionally triggers a desktop notification.
    """
    db = SessionLocal()
    try:
        new_alert = Alert(
            timestamp=datetime.now(timezone.utc),
            severity=severity,
            message=message,
            source_mac=source_mac
        )
        db.add(new_alert)
        db.commit()
        
        # Trigger desktop notification for WARN or CRITICAL
        if severity in ["WARN", "CRITICAL"]:
            trigger_macos_notification(f"Network Alert: {severity}", message)
            
        # Broadcast via websocket could also be added here, 
        # but the frontend can poll /alerts or we can push it.
    finally:
        db.close()
