from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import models
from core.scanner import scan_network_advanced
from core.capture import start_capture, stop_capture
from core.wifi import scan_wifi
from core.rules import evaluate_new_device
from datetime import datetime, timezone
import asyncio

router = APIRouter()

@router.get("/devices")
def get_devices(db: Session = Depends(get_db)):
    devices = db.query(models.Device).all()
    return devices

@router.post("/scan")
def trigger_scan(deep_scan: bool = False, db: Session = Depends(get_db)):
    results = scan_network_advanced(deep_scan)
    
    # Update database
    now = datetime.now(timezone.utc)
    for res in results:
        device = db.query(models.Device).filter(models.Device.mac_address == res["mac"]).first()
        if device:
            device.last_seen = now
            device.ip_address = res["ip"]
            device.is_online = True
            device.hostname = res["hostname"] or device.hostname
            if res.get("os_match"): device.os_match = res["os_match"]
            if res.get("open_ports"): device.open_ports = res["open_ports"]
            device.interface = res["interface"]
        else:
            device = models.Device(
                mac_address=res["mac"],
                ip_address=res["ip"],
                vendor=res["vendor"],
                hostname=res["hostname"],
                os_match=res.get("os_match"),
                open_ports=res.get("open_ports"),
                interface=res.get("interface"),
                first_seen=now,
                last_seen=now,
                is_online=True
            )
            db.add(device)
            # Evaluate new device
            evaluate_new_device(res)
    db.commit()
    return {"status": "success", "devices_found": len(results)}

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(models.Alert).order_by(models.Alert.timestamp.desc()).limit(100).all()
    return alerts

@router.post("/capture/start")
async def start_packet_capture(interface: str = None):
    # Get current event loop using get_running_loop
    loop = asyncio.get_running_loop()
    if start_capture(interface=interface, loop=loop):
        return {"status": "success", "message": "Capture started"}
    return {"status": "error", "message": "Capture already running or failed to start"}

@router.post("/capture/stop")
def stop_packet_capture():
    if stop_capture():
        return {"status": "success", "message": "Capture stopped"}
    return {"status": "error", "message": "No capture running"}

@router.get("/wifi/scan")
def get_wifi_scan():
    """Trigger a Wi-Fi scan and return nearby networks."""
    return scan_wifi()
