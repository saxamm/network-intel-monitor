import sys
sys.path.append('/Users/sak7x/Library/Python/3.9/lib/python/site-packages')
import objc
objc.loadBundle('CoreWLAN', bundle_path='/System/Library/Frameworks/CoreWLAN.framework', module_globals=globals())
cw = CWInterface.interface()
try:
    networks, err = cw.scanForNetworksWithSSID_error_(None, None)
    if networks:
        for n in networks:
            print(f"SSID: {n.ssid()}")
    else:
        print("No networks")
except Exception as e:
    print(e)
