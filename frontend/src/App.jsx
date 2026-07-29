import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Shield, Wifi, Server, AlertTriangle, Radio, Loader2, Router, Smartphone, Monitor, Tv, Cpu, X, Terminal, Zap, Eye, Crosshair, Lock, Unlock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

const WS_URL = "ws://localhost:8000/ws";
const API_URL = "http://localhost:8000/api";

const PROTO_COLORS = { TCP: '#00ff41', UDP: '#bf40ff', ARP: '#ffb300', ICMP: '#ff0040', Unknown: '#3d6b4e' };

// ─── Device Type Inference ───
const inferDevice = (d) => {
  const v = (d.vendor || "").toLowerCase();
  const os = (d.os_match || "").toLowerCase();
  const h = (d.hostname || "").toLowerCase();
  const ip = d.ip_address || "";

  if (ip.endsWith('.1') || v.includes('router') || v.includes('netgear') || v.includes('cisco') || v.includes('tp-link') || v.includes('huawei'))
    return { icon: <Router size={22} />, label: "ROUTER", color: "#ffb300" };
  if (v.includes('apple') || os.includes('ios') || h.includes('iphone') || h.includes('ipad'))
    return { icon: <Smartphone size={22} />, label: "MOBILE", color: "#00ff41" };
  if (os.includes('android') || v.includes('samsung') || v.includes('xiaomi') || v.includes('oneplus'))
    return { icon: <Smartphone size={22} />, label: "MOBILE", color: "#bf40ff" };
  if (os.includes('windows') || os.includes('mac') || os.includes('linux') || h.includes('macbook') || h.includes('desktop'))
    return { icon: <Monitor size={22} />, label: "WORKSTATION", color: "#00ff41" };
  if (h.includes('tv') || v.includes('lg electronics') || v.includes('sony') || v.includes('roku') || v.includes('vizio'))
    return { icon: <Tv size={22} />, label: "SMART TV", color: "#ffb300" };

  return { icon: <Cpu size={22} />, label: "UNKNOWN", color: "#3d6b4e" };
};

// ─── Typing Animation Component ───
const TypeWriter = ({ text, speed = 30 }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <span>{displayed}<span className="typing-cursor"></span></span>;
};

// ─── Signal Strength Bar ───
const SignalBar = ({ rssi }) => {
  const pct = Math.max(0, Math.min(100, ((rssi + 100) / 60) * 100));
  const color = rssi > -50 ? '#00ff41' : rssi > -70 ? '#ffb300' : '#ff0040';
  return (
    <div className="signal-bar">
      <div className="signal-bar-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
    </div>
  );
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ bandwidth_bps: 0, protocols: {} });
  const [bandwidthHistory, setBandwidthHistory] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [wifiError, setWifiError] = useState(null);
  const [activeDevice, setActiveDevice] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [activeWifi, setActiveWifi] = useState(null);

  const ws = useRef(null);

  useEffect(() => {
    fetchDevices();
    fetchAlerts();
    connectWebSocket();
    return () => { if (ws.current) ws.current.close(); };
  }, []);

  const connectWebSocket = () => {
    ws.current = new WebSocket(WS_URL);
    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => {
      setConnected(false);
      setTimeout(connectWebSocket, 3000);
    };
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "packet") {
        setPackets(prev => {
          const n = [msg.data, ...prev];
          if (n.length > 60) n.pop();
          return n;
        });
      } else if (msg.type === "stats") {
        setStats(msg.data);
        setBandwidthHistory(prev => {
          const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
          const n = [...prev, { time: now, bps: msg.data.bandwidth_bps / 1024 }];
          if (n.length > 30) n.shift();
          return n;
        });
      }
    };
  };

  const fetchDevices = async () => { try { const r = await fetch(`${API_URL}/devices`); setDevices(await r.json()); } catch (e) { console.error(e); } };
  const fetchAlerts = async () => { try { const r = await fetch(`${API_URL}/alerts`); setAlerts(await r.json()); } catch (e) { console.error(e); } };

  const triggerScan = async (deepScan = false) => {
    setIsScanningDevices(true);
    try { await fetch(`${API_URL}/scan?deep_scan=${deepScan}`, { method: 'POST' }); await fetchDevices(); } catch (e) { console.error(e); }
    setIsScanningDevices(false);
  };

  const toggleCapture = async () => {
    try {
      const endpoint = isCapturing ? "/capture/stop" : "/capture/start";
      await fetch(`${API_URL}${endpoint}`, { method: 'POST' });
      setIsCapturing(!isCapturing);
    } catch (e) { console.error(e); }
  };

  const triggerWifiScan = async () => {
    setIsScanningWifi(true);
    setWifiError(null);
    try {
      const r = await fetch(`${API_URL}/wifi/scan`);
      const data = await r.json();
      if (data.status === "success") setWifiNetworks(data.networks);
      else setWifiError(data.message);
    } catch (e) { setWifiError("Connection failed."); }
    setIsScanningWifi(false);
  };

  const protocolData = Object.entries(stats.protocols).map(([name, value]) => ({ name, value }));
  const totalPkts = protocolData.reduce((s, p) => s + p.value, 0) || 1;

  return (
    <div className="dashboard-container">

      {/* ═══ DEVICE DETAIL MODAL ═══ */}
      <AnimatePresence>
        {activeDevice && (() => {
          const devInfo = inferDevice(activeDevice);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setActiveDevice(null)}>
              <motion.div
                initial={{ scale: 0.7, y: 80, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.7, y: 80, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="modal-content" onClick={e => e.stopPropagation()}>

                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="modal-icon-wrap" style={{ color: devInfo.color }}>
                      {devInfo.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>TARGET IDENTIFIED</div>
                      <h2 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.1rem', textShadow: '0 0 10px var(--green-glow)' }}>
                        {activeDevice.ip_address}
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '2px' }}>{activeDevice.vendor}</div>
                      <div style={{ fontSize: '0.65rem', color: devInfo.color, marginTop: '4px', padding: '2px 8px', border: `1px solid ${devInfo.color}`, borderRadius: '2px', display: 'inline-block' }}>
                        {devInfo.label}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setActiveDevice(null)} className="btn-hack red" style={{ padding: '6px 8px' }}><X size={16} /></button>
                </div>

                <div className="modal-body">
                  <div className="modal-stat-grid">
                    <div className="modal-stat-box"><div className="label">MAC ADDRESS</div><div className="value">{activeDevice.mac_address}</div></div>
                    <div className="modal-stat-box"><div className="label">HOSTNAME</div><div className="value">{activeDevice.hostname || '—'}</div></div>
                    <div className="modal-stat-box"><div className="label">OS FINGERPRINT</div><div className="value" style={{ color: activeDevice.os_match ? 'var(--amber)' : 'var(--text-dim)' }}>{activeDevice.os_match || 'Run deep scan'}</div></div>
                    <div className="modal-stat-box"><div className="label">INTERFACE</div><div className="value">{activeDevice.interface || '—'}</div></div>
                    <div className="modal-stat-box"><div className="label">FIRST SEEN</div><div className="value">{activeDevice.first_seen ? new Date(activeDevice.first_seen).toLocaleString() : '—'}</div></div>
                    <div className="modal-stat-box"><div className="label">STATUS</div><div className="value" style={{ color: activeDevice.is_online ? 'var(--text-bright)' : 'var(--red)' }}>{activeDevice.is_online ? '● ONLINE' : '○ OFFLINE'}</div></div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-green)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '8px' }}>OPEN PORTS & SERVICES</div>
                    {activeDevice.open_ports ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeDevice.open_ports.split(',').map(port => (
                          <span key={port} className="port-tag">{port}</span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        <Terminal size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        No ports detected. Execute deep scan for enumeration.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ WIFI DETAIL MODAL ═══ */}
      <AnimatePresence>
        {activeWifi && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setActiveWifi(null)}>
            <motion.div
              initial={{ scale: 0.7, y: 80, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="modal-icon-wrap" style={{ color: '#bf40ff' }}><Wifi size={22} /></div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>SIGNAL INTERCEPTED</div>
                    <h2 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.1rem' }}>{activeWifi.ssid || '<HIDDEN>'}</h2>
                  </div>
                </div>
                <button onClick={() => setActiveWifi(null)} className="btn-hack red" style={{ padding: '6px 8px' }}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="modal-stat-grid">
                  <div className="modal-stat-box"><div className="label">BSSID</div><div className="value">{activeWifi.bssid}</div></div>
                  <div className="modal-stat-box"><div className="label">CHANNEL</div><div className="value">{activeWifi.channel}</div></div>
                  <div className="modal-stat-box"><div className="label">SIGNAL STRENGTH</div><div className="value" style={{ color: activeWifi.rssi > -50 ? 'var(--text-bright)' : activeWifi.rssi > -70 ? 'var(--amber)' : 'var(--red)' }}>{activeWifi.rssi} dBm</div></div>
                  <div className="modal-stat-box"><div className="label">ENCRYPTION</div><div className="value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{activeWifi.security?.includes('WPA') ? <Lock size={14} color="var(--text-bright)" /> : <Unlock size={14} color="var(--red)" />}{activeWifi.security}</div></div>
                </div>
                <SignalBar rssi={activeWifi.rssi} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ALERT DETAIL MODAL ═══ */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setActiveAlert(null)}>
            <motion.div
              initial={{ scale: 0.7, y: 80, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="modal-icon-wrap" style={{ color: activeAlert.severity === 'CRITICAL' ? 'var(--red)' : activeAlert.severity === 'WARN' ? 'var(--amber)' : 'var(--text-bright)' }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>INTEL REPORT</div>
                    <h2 style={{ margin: 0, color: activeAlert.severity === 'CRITICAL' ? 'var(--red)' : activeAlert.severity === 'WARN' ? 'var(--amber)' : 'var(--text-bright)', fontSize: '1rem' }}>[{activeAlert.severity}]</h2>
                  </div>
                </div>
                <button onClick={() => setActiveAlert(null)} className="btn-hack red" style={{ padding: '6px 8px' }}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="modal-stat-grid">
                  <div className="modal-stat-box" style={{ gridColumn: '1 / -1' }}><div className="label">MESSAGE</div><div className="value">{activeAlert.message}</div></div>
                  <div className="modal-stat-box"><div className="label">TIMESTAMP</div><div className="value">{new Date(activeAlert.timestamp).toLocaleString()}</div></div>
                  <div className="modal-stat-box"><div className="label">SOURCE MAC</div><div className="value">{activeAlert.source_mac || '—'}</div></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOP BAR ═══ */}
      <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", damping: 20 }} className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Crosshair size={20} color="var(--text-bright)" style={{ filter: 'drop-shadow(0 0 6px var(--green-glow))' }} />
          <h2 className="glitch-text" style={{ fontSize: '0.9rem', color: 'var(--text-bright)', margin: 0 }}>NET::INTEL_MONITOR</h2>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', borderLeft: '1px solid var(--border-green)', paddingLeft: '12px' }}>v2.0</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {connected ? <span className="pulse"></span> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', boxShadow: '0 0 8px var(--red)' }}></span>}
            <span style={{ fontSize: '0.75rem', color: connected ? 'var(--text-bright)' : 'var(--red)' }}>{connected ? 'LINK::ACTIVE' : 'LINK::DOWN'}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleCapture}
            className={`btn-hack ${isCapturing ? 'red' : 'green-fill'}`}
            style={{ padding: '6px 14px' }}>
            <Zap size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {isCapturing ? 'KILL CAPTURE' : 'INIT CAPTURE'}
          </motion.button>
        </div>
      </motion.div>

      {/* ═══ LEFT: TARGETS & WIFI ═══ */}
      <motion.div initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="panel" style={{ gridColumn: '1', gridRow: '2 / span 2', position: 'relative' }}>
        <div className="panel-header">
          <Eye size={14} /> TARGETS
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button onClick={() => triggerScan(false)} disabled={isScanningDevices} className="btn-hack">QUICK</button>
            <button onClick={() => triggerScan(true)} disabled={isScanningDevices} className="btn-hack amber">DEEP</button>
          </div>
        </div>

        <AnimatePresence>
          {isScanningDevices && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="scanner-overlay">
              {/* Hex streams on sides */}
              <div className="hex-stream left">
                {'0xA3F2 0x0D1C 0xBE47 0x9A05 0xF38E 0x12D6 0x7C9B 0xE4A1 0x5F03 0x8D72 0xC6E9 0x31B8 0xA7F4 0x0E2D 0xD95A 0x6B1F 0x43C8 0xFA67 0x2E90 0x85DB 0xBC34 0x19A6 0x70ED 0xC852 0x4F1B 0xA3F2 0x0D1C 0xBE47'.split(' ').join('\n')}
              </div>
              <div className="hex-stream right">
                {'0x7E01 0xD4B9 0x2A83 0xF5C6 0x9108 0x6DFA 0xE3B7 0x4825 0xB09C 0x1F64 0x87DE 0xCA53 0x36AF 0xA1E8 0x5C72 0x0B49 0x78D3 0xED16 0x429B 0xBF60 0x1DA7 0x94CE 0x63F5 0xA82B 0x50E4 0x7E01 0xD4B9 0x2A83'.split(' ').join('\n')}
              </div>

              {/* Center: expanding rings */}
              <div className="scan-rings">
                <div className="scan-ring"></div>
                <div className="scan-ring"></div>
                <div className="scan-ring"></div>
                <div className="scan-center-dot"></div>
              </div>

              {/* Status text */}
              <div style={{ marginTop: '20px', color: 'var(--text-bright)', fontSize: '0.75rem', textShadow: '0 0 10px var(--green-glow)', zIndex: 3 }}>
                <TypeWriter text="ENUMERATING HOSTS..." speed={50} />
              </div>

              {/* Progress bar */}
              <div className="scan-progress" style={{ zIndex: 3 }}>
                <div className="scan-progress-fill"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', minHeight: 0 }}>
          <AnimatePresence>
            {devices.map((d, idx) => {
              const devInfo = inferDevice(d);
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setActiveDevice(d)}
                  className="device-item" style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ color: devInfo.color, marginTop: '2px', filter: `drop-shadow(0 0 4px ${devInfo.color})` }}>
                    {devInfo.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--text-bright)', fontSize: '0.82rem' }}>{d.ip_address}</strong>
                      {d.is_online && <span style={{ color: 'var(--text-bright)', fontSize: '0.6rem', textShadow: '0 0 6px var(--green-glow)' }}>●</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.mac_address}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', marginTop: '1px' }}>{d.vendor}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="panel-header" style={{ marginTop: '16px' }}>
          <Wifi size={14} /> SIGNALS
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
            {isScanningWifi && <Loader2 size={12} className="animate-spin" color="var(--text-bright)" />}
            <button onClick={triggerWifiScan} disabled={isScanningWifi} className="btn-hack">SCAN</button>
          </div>
        </div>

        {wifiError && (
          <div style={{ padding: '8px', background: 'var(--red-dim)', border: '1px solid rgba(255,0,64,0.3)', borderRadius: '3px', color: 'var(--red)', fontSize: '0.7rem', marginBottom: '8px' }}>{wifiError}</div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', minHeight: 0 }}>
          <AnimatePresence>
            {wifiNetworks.map((w, idx) => (
              <motion.div
                key={w.bssid || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setActiveWifi(w)}
                className="device-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>{w.ssid || '<HIDDEN>'}</strong>
                  <span style={{ fontSize: '0.7rem', color: w.rssi > -50 ? 'var(--text-bright)' : w.rssi > -70 ? 'var(--amber)' : 'var(--red)' }}>{w.rssi} dBm</span>
                </div>
                <SignalBar rssi={w.rssi} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '3px' }}>CH:{w.channel} | {w.security}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ═══ CENTER: TRAFFIC STREAM ═══ */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }} className="panel" style={{ gridColumn: '2', gridRow: '2' }}>
        <div className="panel-header">
          <Terminal size={14} /> TRAFFIC::STREAM
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-dim)' }}>{packets.length} PKT</span>
        </div>
        <div className="packet-row header">
          <div>PROTO</div><div>SOURCE</div><div>DESTINATION</div><div>SIZE</div><div>TIME</div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <AnimatePresence>
            {packets.map((p, i) => (
              <motion.div
                key={`${p.timestamp}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="packet-row">
                <div style={{ color: PROTO_COLORS[p.protocol] || PROTO_COLORS.Unknown, textShadow: `0 0 6px ${PROTO_COLORS[p.protocol] || 'transparent'}` }}>{p.protocol}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{p.src_ip || p.src_mac}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{p.dst_ip || p.dst_mac}</div>
                <div style={{ color: 'var(--text-dim)' }}>{p.size}B</div>
                <div style={{ color: 'var(--text-dim)' }}>{new Date(p.timestamp * 1000).toLocaleTimeString()}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ═══ RIGHT: CHARTS ═══ */}
      <div style={{ gridColumn: '3', gridRow: '2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="panel" style={{ flex: 1 }}>
          <div className="panel-header"><Radio size={14} /> BANDWIDTH</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bandwidthHistory}>
                <defs>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ff41" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00ff41" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={t => t.toFixed(0)} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-green-bright)', color: 'var(--text-bright)', fontSize: '0.75rem' }} />
                <Area type="monotone" dataKey="bps" stroke="#00ff41" strokeWidth={2} fill="url(#gGreen)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="panel" style={{ flex: 1 }}>
          <div className="panel-header"><Activity size={14} /> PROTOCOLS</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px', padding: '4px 0' }}>
            {protocolData.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textAlign: 'center' }}>Awaiting capture data...</div>}
            {protocolData.map(p => {
              const pct = (p.value / totalPkts) * 100;
              const col = PROTO_COLORS[p.name] || PROTO_COLORS.Unknown;
              return (
                <div key={p.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '2px' }}>
                    <span style={{ color: col, textShadow: `0 0 6px ${col}` }}>{p.name}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(0,255,65,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', background: col, borderRadius: '2px', boxShadow: `0 0 8px ${col}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ═══ BOTTOM: ALERTS ═══ */}
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="panel" style={{ gridColumn: '2 / span 2', gridRow: '3' }}>
        <div className="panel-header">
          <AlertTriangle size={14} /> INTEL::ALERTS
          <span style={{ marginLeft: '8px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>({alerts.length})</span>
          <button onClick={fetchAlerts} className="btn-hack" style={{ marginLeft: 'auto' }}>REFRESH</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <AnimatePresence>
            {alerts.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setActiveAlert(a)}
                className={`alert-item ${a.severity.toLowerCase()}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                  <strong style={{ fontSize: '0.72rem' }}>[{a.severity}]</strong>
                  <span style={{ fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
