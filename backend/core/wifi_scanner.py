import sys
import os
import site
import json

# Dynamically add user site-packages for PyObjC if available
user_site = site.getusersitepackages()
if user_site and user_site not in sys.path:
    sys.path.append(user_site)

py_ver = f"{sys.version_info.major}.{sys.version_info.minor}"
mac_user_site = os.path.expanduser(f"~/Library/Python/{py_ver}/lib/python/site-packages")
if os.path.exists(mac_user_site) and mac_user_site not in sys.path:
    sys.path.append(mac_user_site)

try:
    import objc
    objc.loadBundle('CoreWLAN', bundle_path='/System/Library/Frameworks/CoreWLAN.framework', module_globals=globals())
    HAS_COREWLAN = True
except Exception:
    HAS_COREWLAN = False

def scan():
    if not HAS_COREWLAN:
        print(json.dumps({"status": "error", "message": "CoreWLAN framework not available on this platform."}))
        return

    try:
        cw = CWInterface.interface()
        if not cw:
            print(json.dumps({"status": "error", "message": "Failed to access WLAN interface."}))
            return
            
        networks, err = cw.scanForNetworksWithSSID_error_(None, None)
        if err:
            print(json.dumps({"status": "error", "message": str(err)}))
            return
            
        if not networks:
            print(json.dumps({"status": "error", "message": "No networks found."}))
            return
            
        results = []
        for n in networks:
            rssi = n.rssiValue()
            
            channel = "Unknown"
            if hasattr(n, 'wlanChannel') and n.wlanChannel():
                channel = n.wlanChannel().channelNumber()
            elif hasattr(n, 'channel') and n.channel():
                channel = int(n.channel())
                
            ssid = n.ssid()
            bssid = n.bssid()
            
            results.append({
                "ssid": ssid or "<Hidden>",
                "bssid": bssid or "Unknown",
                "rssi": rssi,
                "channel": channel,
                "security": "WPA2/WPA3"
            })
            
        results = sorted(results, key=lambda x: x["rssi"], reverse=True)
        print(json.dumps({"status": "success", "networks": results}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    scan()
