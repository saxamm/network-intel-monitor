import subprocess
import re
import os

AIRPORT_PATH = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"

import json

def scan_wifi():
    """
    Scans nearby Wi-Fi networks using a custom CoreWLAN python script.
    Bypasses macOS Sequoia's SSID redaction.
    """
    try:
        script_path = os.path.join(os.path.dirname(__file__), "wifi_scanner.py")
        result = subprocess.run(["/usr/bin/python3", script_path], capture_output=True, text=True, timeout=15)
        
        if result.returncode != 0:
            return {"status": "error", "message": f"CoreWLAN scan failed: {result.stderr.strip()}"}
            
        data = json.loads(result.stdout)
        return data

    except Exception as e:
        return {"status": "error", "message": str(e)}
