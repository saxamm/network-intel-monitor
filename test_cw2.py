import sys
sys.path.append('/Users/sak7x/Library/Python/3.9/lib/python/site-packages')
import objc
objc.loadBundle('CoreWLAN', bundle_path='/System/Library/Frameworks/CoreWLAN.framework', module_globals=globals())
cw = CWInterface.interface()
networks, err = cw.scanForNetworksWithSSID_error_(None, None)
if networks:
    n = list(networks)[0]
    print(f"Type of channel: {type(n.channel())}")
    print(f"Value of channel: {n.channel()}")
    
    if hasattr(n, 'wlanChannel'):
        wlan = n.wlanChannel()
        print(f"wlanChannel: {wlan}")
        if wlan:
            print(f"wlanChannel channelNumber: {wlan.channelNumber()}")
