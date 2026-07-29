from sqlalchemy import Column, Integer, String, Boolean, DateTime
from db.database import Base
from datetime import datetime, timezone

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    mac_address = Column(String, unique=True, index=True)
    ip_address = Column(String, index=True)
    hostname = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_online = Column(Boolean, default=True)
    device_type = Column(String, nullable=True) # Router, Phone, Laptop, etc.
    os_match = Column(String, nullable=True) # OS Fingerprint from Nmap
    open_ports = Column(String, nullable=True) # Comma separated list of open ports
    interface = Column(String, nullable=True) # Which network interface it was found on

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    severity = Column(String) # INFO, WARN, CRITICAL
    message = Column(String)
    source_mac = Column(String, nullable=True)
    related_packet_id = Column(Integer, nullable=True)
