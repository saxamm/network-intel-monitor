# 📡 Network Intelligence Monitor

A real-time network intelligence and packet monitoring desktop interface built with a **FastAPI** backend and a **React (Vite) + Framer Motion** hacker-terminal frontend.

![Hacker Terminal Dashboard UI](https://raw.githubusercontent.com/placeholder/demo.png)

---

## ⚡ Features

- 🟢 **Hacker Terminal UI:** Neon phosphor-green cyber aesthetic with CRT scanlines, live metrics, protocol distributions, and expanding pulse animations.
- 📡 **Mac-Native Wi-Fi Signal Radar:** Direct integration with macOS CoreWLAN (`pyobjc`) to display real-time nearby BSSIDs, SSIDs, channels, and RSSI levels.
- 🔍 **Active Nmap & mDNS Device Scanning:** Auto-discovers local network devices (IP, MAC, hostname, OS matching, open ports) with custom device category visualizers (Router, Phone, PC, TV, IoT).
- 🛡️ **Live Packet Capture & Alert Engine:** Uses Scapy & WebSockets to monitor real-time traffic protocols (TCP, UDP, ICMP, DNS) and emit security alerts (e.g., Telnet unencrypted data detection).
- 🖱️ **Interactive Block Modals:** Clickable interface elements that expand into full-screen animated detail views.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.9+, FastAPI, Scapy, PyObjC (CoreWLAN), python-nmap, SQLAlchemy (SQLite), WebSockets.
- **Frontend:** React 18, Vite, Framer Motion, Recharts, Lucide React, CSS Variables (Phosphor Cyberpunk System).

---

## 🚀 Quick Start

### Prerequisites

- **macOS** (for CoreWLAN Wi-Fi scanning support)
- **Python 3.9+** & **Node.js 18+**
- **Nmap** installed on system (`brew install nmap`)

### 1. Setup Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Setup Frontend

```bash
cd frontend
npm install
```

### 3. Launch Application

From the root project directory, run the startup script:

```bash
./run.sh
```

- **Dashboard UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`

> ⚠️ **Note:** Packet capture via Scapy requires administrator (`sudo`) privileges on macOS. `run.sh` will prompt for your local password to start the backend observer thread.

---

## 📄 License

MIT License. Free to use and extend!
