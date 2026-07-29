import sys
sys.path.append('/Users/sak7x/Library/Python/3.9/lib/python/site-packages')
import objc
import json

objc.loadBundle('CoreWLAN', bundle_path='/System/Library/Frameworks/CoreWLAN.framework', module_globals=globals())

def scan():
    try:
        cw = CWInterface.interface()
        if not cw:
            print(json.dumps({"status": "error", "message": "Failed to get CoreWLAN interface. Check Location Services."}))
            return
            
        networks, err = cw.scanForNetworksWithSSID_error_(None, None)
        if err:
            print(json.dumps({"status": "error", "message": str(err)}))
            return
            
        if not networks:
            print(json.dumps({"status": "error", "message": "No networks found or Location Services blocked."}))
            return
            
        results = []
        for n in networks:
            # security is an enum or string, but we can simplify by checking supports security type
            sec = "Unknown"
            # CWSecurityWPA2Personal = 4
            # CWSecurityWPA3Personal = 11
            # We will just print the basic info as CoreWLAN returns integers for security types.
            rssi = n.rssiValue()
            
            # n.channel() returns the integer channel directly in PyObjC on modern macOS
            channel = "Unknown"
            if hasattr(n, 'wlanChannel') and n.wlanChannel():
                channel = n.wlanChannel().channelNumber()
            elif n.channel():
                channel = int(n.channel())
                
            ssid = n.ssid()
            bssid = n.bssid()
            
            results.append({
                "ssid": ssid or "<Hidden>",
                "bssid": bssid,
                "rssi": rssi,
                "channel": channel,
                "security": "WPA2/3 (CoreWLAN)"
            })
            
        # Sort by signal strength
        results = sorted(results, key=lambda x: x["rssi"], reverse=True)
        print(json.dumps({"status": "success", "networks": results}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == "__main__":
    scan()
