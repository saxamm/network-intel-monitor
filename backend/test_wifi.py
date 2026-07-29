import objc
objc.loadBundle('CoreWLAN', bundle_path='/System/Library/Frameworks/CoreWLAN.framework', module_globals=globals())

cw = CWInterface.interface()
try:
    networks, err = cw.scanForNetworksWithSSID_error_(None, None)
    if networks:
        for n in networks:
            print(n.ssid(), n.bssid(), n.rssiValue(), n.channel().channelNumber())
    else:
        print("No networks or Location Services blocked")
except Exception as e:
    print(f"Error: {e}")
