import subprocess
import os
import sys
import json
import shutil

def scan_wifi():
    """
    Cross-platform Wi-Fi signal scanning.
    Uses CoreWLAN on macOS, nmcli/iwlist on Linux, and netsh on Windows.
    """
    try:
        # 1. macOS (CoreWLAN)
        if sys.platform == "darwin":
            python_bin = sys.executable or "/usr/bin/python3"
            script_path = os.path.join(os.path.dirname(__file__), "wifi_scanner.py")
            result = subprocess.run([python_bin, script_path], capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0 and result.stdout:
                try:
                    data = json.loads(result.stdout)
                    if data.get("status") == "success":
                        return data
                except json.JSONDecodeError:
                    pass

        # 2. Linux (nmcli)
        elif sys.platform.startswith("linux"):
            if shutil.which("nmcli"):
                res = subprocess.run(["nmcli", "-t", "-f", "SSID,BSSID,SIGNAL,CHAN,SECURITY", "dev", "wifi"], capture_output=True, text=True, timeout=10)
                if res.returncode == 0:
                    networks = []
                    for line in res.stdout.strip().split("\n"):
                        parts = line.split(":")
                        if len(parts) >= 5:
                            ssid, bssid, signal, chan, sec = parts[0], parts[1], parts[2], parts[3], parts[4]
                            try:
                                rssi = int(signal) // 2 - 100
                            except ValueError:
                                rssi = -70
                            networks.append({
                                "ssid": ssid or "<Hidden>",
                                "bssid": bssid,
                                "rssi": rssi,
                                "channel": chan,
                                "security": sec or "WPA2"
                            })
                    return {"status": "success", "networks": networks}

        # 3. Windows (netsh)
        elif sys.platform == "win32":
            if shutil.which("netsh"):
                res = subprocess.run(["netsh", "wlan", "show", "networks", "mode=bssid"], capture_output=True, text=True, timeout=10)
                if res.returncode == 0:
                    # Basic netsh parser fallback
                    networks = []
                    lines = res.stdout.split("\n")
                    curr_ssid = "Unknown"
                    for line in lines:
                        if "SSID" in line and "BSSID" not in line:
                            curr_ssid = line.split(":")[-1].strip() or "<Hidden>"
                        elif "Signal" in line:
                            sig_str = line.split(":")[-1].replace("%", "").strip()
                            try:
                                sig_pct = int(sig_str)
                                rssi = sig_pct // 2 - 100
                            except ValueError:
                                rssi = -70
                            networks.append({
                                "ssid": curr_ssid,
                                "bssid": "Unknown",
                                "rssi": rssi,
                                "channel": "Auto",
                                "security": "WPA2"
                            })
                    return {"status": "success", "networks": networks}

        return {"status": "error", "message": "No compatible Wi-Fi scanning backend available for this device/OS."}

    except Exception as e:
        return {"status": "error", "message": str(e)}
