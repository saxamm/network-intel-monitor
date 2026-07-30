# 📡 Network Intelligence Monitor

A real-time network intelligence and packet monitoring desktop dashboard built with a **FastAPI** backend and a **React (Vite) + Framer Motion** cyberpunk terminal frontend.

---

## ⚡ Features

- 🟢 **Cyber Terminal UI:** Neon phosphor-green cyber aesthetic with CRT scanlines, live metrics, protocol distributions, and animated radar sweeps.
- 📡 **Multi-Platform Wi-Fi Signal Radar:** Displays real-time nearby BSSIDs, SSIDs, channels, and RSSI signal levels (supports macOS CoreWLAN, Linux `nmcli`, and Windows `netsh`).
- 🔍 **Active Nmap & mDNS Device Discovery:** Auto-discovers local network devices (IP, MAC, hostname, OS fingerprinting, open ports) with custom device categorization (Router, Phone, PC, TV, IoT).
- 🛡️ **Live Packet Capture & Alert Engine:** Utilizes Scapy & WebSockets to monitor real-time traffic protocols (TCP, UDP, ICMP, DNS) and emit security alerts for unencrypted or suspicious traffic.
- 🖱️ **Interactive Block Inspection:** Clickable UI components expand into full-screen detailed analysis modals.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.9+, FastAPI, Scapy, python-nmap, SQLAlchemy (SQLite), WebSockets.
- **Frontend:** React 18, Vite, Framer Motion, Recharts, Lucide React.

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** & **Node.js 18+**
- **Nmap** installed on system (`brew install nmap` on macOS or `sudo apt install nmap` on Linux)

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

From the project root directory, execute:

```bash
./run.sh
```

- **Dashboard UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`

> ⚠️ **Note:** Low-level packet capture via Scapy requires administrator (`sudo`) privileges.

---

## 📄 License

MIT License. Free to use and extend.
