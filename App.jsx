import React, { useState, useEffect, useRef } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, onValue, set } from 'firebase/database'
import { parseExcelFile } from './utils/parseExcel'
import DashboardTab from './components/DashboardTab'
import GATab from './components/GATab'
import UMTab from './components/UMTab'
import TVVTab from './components/TVVTab'

// ============================================================
// FIREBASE CONFIG — điền vào đây sau khi tạo project Firebase
// Hướng dẫn: xem file FIREBASE_SETUP.md
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC6pQL16It6EficYFP7yZSBKqQ56Gkfv-E",
  authDomain: "ga-dashboard-59e2a.firebaseapp.com",
  projectId: "ga-dashboard-59e2a",
  storageBucket: "ga-dashboard-59e2a.firebasestorage.app",
  messagingSenderId: "135229272496",
  appId: "1:135229272496:web:99144d60e73801cb74a675"
};
const FB_ENABLED = firebaseConfig.apiKey !== "AIzaSyC6pQL16It6EficYFP7yZSBKqQ56Gkfv-E"
// ============================================================

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'ga',        label: 'GA',        icon: '🏢' },
  { id: 'um',        label: 'UM',        icon: '👤' },
  { id: 'tvv',       label: 'TVV',       icon: '🧑‍💼' },
]

const TAB_TITLES = {
  dashboard: 'Dashboard Tổng Quan — GA D03 Quận 3',
  ga: 'GA Tổng Hợp',
  um: 'Danh Sách UM',
  tvv: 'Danh Sách TVV',
}

// Minimal default data — chỉ để trang không trắng trước khi upload
const EMPTY_DATA = {
  kpis: { netManpower:72, fycThang:121.2, fypThang:506.7, apeNet:545.7, ipNet:490, caseNet:20, fycYtd:848.9, ipNetYtd:3273.7, apeNetYtd:3457.5, fypYtd:3333.0, syc:51.3, ryc:81.9, tongDaiLy:408, activeFyc:7, activeCase:11, mdrt:0 },
  topAgents: [
    { code:'60792209', name:'PHẠM HOÀNG THÁI TÀI', level:'AG', branch:'A64', fyc:34.9, ape:137.2, caseNet:6.5 },
    { code:'60789390', name:'NGUYỄN VĂN LỢI QUÝ',  level:'AG', branch:'A64', fyc:21.6, ape:92.5,  caseNet:2.5 },
    { code:'60532739', name:'LÊ VĂN XÈN',           level:'AG', branch:'A69', fyc:18.1, ape:75.0,  caseNet:3.0 },
    { code:'60804930', name:'PHẠM THẢO NGUYÊN',     level:'AG', branch:'A64', fyc:12.7, ape:55.9,  caseNet:2.0 },
    { code:'60032137', name:'VŨ THỊ MINH TUYẾT',    level:'AG', branch:'A69', fyc:11.5, ape:42.5,  caseNet:2.0 },
  ],
  levelDist: [{ name:'AG', value:401 }, { name:'UM', value:7 }],
  officeData: [{ vanPhong:'GA710 - Quận 3', netMp:72, fyc:121.2, apeNet:545.7, caseNet:20 }],
  gaData: {
    fyp2026: [
      { month:'Jan', achieved:397.6, plan:300 }, { month:'Feb', achieved:379.4, plan:500 },
      { month:'Mar', achieved:1195.5,plan:770 }, { month:'Apr', achieved:853.8, plan:800 },
      { month:'May', achieved:373.1, plan:800 },
    ],
    act2026:  [{ month:'Jan',value:14},{ month:'Feb',value:14},{ month:'Mar',value:17},{ month:'Apr',value:16},{ month:'May',value:11}],
    mp2026:   [{ month:'Jan',value:73},{ month:'Feb',value:75},{ month:'Mar',value:78},{ month:'Apr',value:73},{ month:'May',value:72}],
    tldtptt:  [{ month:'Jan',value:.838},{ month:'Feb',value:.873},{ month:'Mar',value:.869},{ month:'Apr',value:.876},{ month:'May',value:.871}],
    totalFypYtd:3199.3, totalFypPlan:4070, totalAct:72,
  },
  umList: [], agList: [],
}

// ── Firebase helpers ─────────────────────────────────────────
let db = null
const FB_PATH = 'ga_d03/dashboard'   // path in Realtime DB

function initFB() {
  if (!FB_ENABLED || db) return
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    db = getDatabase(app)
  } catch (e) { console.error('Firebase init:', e) }
}

// Chunk helpers — Firebase node limit ~10 MB; we split big JSON
const CHUNK_SIZE = 800_000   // 800 KB per chunk

function chunkJSON(json) {
  const chunks = []
  for (let i = 0; i < json.length; i += CHUNK_SIZE)
    chunks.push(json.slice(i, i + CHUNK_SIZE))
  return chunks
}

async function pushData(data) {
  if (!db) return
  const json = JSON.stringify(data)
  const chunks = chunkJSON(json)
  const payload = {
    chunks,
    total: chunks.length,
    updatedAt: new Date().toISOString(),
  }
  await set(ref(db, FB_PATH), payload)
}

function assembleData(snapshot) {
  const val = snapshot.val()
  if (!val || !val.chunks) return null
  try {
    return { data: JSON.parse(val.chunks.join('')), updatedAt: val.updatedAt }
  } catch { return null }
}

// ── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { err: null }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) return (
      <div style={{ padding:40, textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
        <div style={{ color:'#ef476f', fontWeight:700, marginBottom:8 }}>Lỗi hiển thị tab</div>
        <div style={{ fontSize:12, color:'#8896aa', marginBottom:16 }}>{String(this.state.err)}</div>
        <button onClick={() => this.setState({ err:null })}
          style={{ padding:'8px 20px', background:'#4361ee', color:'white', border:'none', borderRadius:8, cursor:'pointer' }}>
          Thử lại
        </button>
      </div>
    )
    return this.props.children
  }
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {message}</div>
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [activeTab,  setActiveTab]  = useState('dashboard')
  const [data,       setData]       = useState(EMPTY_DATA)
  const [loading,    setLoading]    = useState(false)
  const [syncing,    setSyncing]    = useState(false)   // uploading to FB
  const [fbStatus,   setFbStatus]   = useState('init')  // init | connected | error | disabled
  const [lastUpdated,setLastUpdated]= useState(null)
  const [toast,      setToast]      = useState(null)
  const [dragOver,   setDragOver]   = useState(false)
  const fileInputRef = useRef()
  const unsubRef     = useRef(null)

  // ── Connect to Firebase & subscribe ──
  useEffect(() => {
    if (!FB_ENABLED) { setFbStatus('disabled'); return }
    try {
      initFB()
      if (!db) { setFbStatus('error'); return }

      setFbStatus('connecting')
      unsubRef.current = onValue(
        ref(db, FB_PATH),
        (snapshot) => {
          const result = assembleData(snapshot)
          if (result) {
            setData(result.data)
            setLastUpdated(result.updatedAt)
            setFbStatus('connected')
          } else {
            // No data yet on Firebase — keep default, still connected
            setFbStatus('connected')
          }
        },
        (err) => {
          console.error('FB listen:', err)
          setFbStatus('error')
        }
      )
    } catch (e) {
      console.error('FB setup:', e)
      setFbStatus('error')
    }
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  // ── Handle file upload ──
  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      setToast({ message: 'Vui lòng chọn file Excel (.xlsx)', type: 'error' }); return
    }
    setLoading(true)
    try {
      const parsed = await parseExcelFile(file)
      setData(parsed)  // update local immediately

      if (FB_ENABLED && db) {
        setSyncing(true)
        await pushData(parsed)
        setSyncing(false)
        setToast({ message: `✓ Đã tải "${file.name}" & đồng bộ cho tất cả users`, type: 'success' })
      } else {
        setToast({ message: `✓ Đã tải "${file.name}" (chỉ local — chưa cấu hình Firebase)`, type: 'success' })
      }
    } catch (err) {
      setSyncing(false)
      setToast({ message: 'Lỗi: ' + (err.message || String(err)), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const onFileInput  = (e) => { handleFile(e.target.files[0]); e.target.value = '' }
  const onDrop       = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }
  const onDragOver   = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave  = ()  => setDragOver(false)

  // ── FB status indicator ──
  const fbDot = {
    connected:  { color: '#06d6a0', label: 'Firebase · Realtime' },
    connecting: { color: '#ffd166', label: 'Đang kết nối...' },
    error:      { color: '#ef476f', label: 'Firebase lỗi' },
    disabled:   { color: '#8896aa', label: 'Firebase chưa cấu hình' },
    init:       { color: '#8896aa', label: '' },
  }[fbStatus] || { color: '#8896aa', label: '' }

  return (
    <div className="app-layout" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">G</div>
          <span>GA D03 Dashboard</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <div key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}

          <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', margin:'16px 0 12px', paddingTop:12 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:600, textTransform:'uppercase', padding:'0 12px', marginBottom:8 }}>
              Hệ thống
            </div>
          </div>

          <div className="nav-item" onClick={() => fileInputRef.current?.click()}>
            <span style={{ fontSize:15 }}>📤</span>
            <span>Upload Excel</span>
          </div>
        </nav>

        {/* FB status */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:fbDot.color,
              animation: fbStatus === 'connected' ? 'pulse 2.5s infinite' : 'none' }} />
            <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.55)', fontWeight:500 }}>
              {fbDot.label}
            </span>
            {syncing && <span style={{ fontSize:9, color:'#ffd166' }}>↑ đang đồng bộ...</span>}
          </div>
          {lastUpdated && (
            <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.3)', marginBottom:4 }}>
              🕐 {new Date(lastUpdated).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', textAlign:'center' }}>
            GA D03 · Quận 3 · 2026
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-title">{TAB_TITLES[activeTab]}</div>
          <div className="topbar-actions">
            <div className="date-badge">
              📅 {new Date().toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })}
            </div>
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              {syncing ? 'Đang đồng bộ...' : 'Cập nhật Excel'}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <div style={{ fontSize:13, color:'#8896aa' }}>Đang xử lý file Excel...</div>
          </div>
        ) : (
          <ErrorBoundary key={activeTab}>
            {activeTab === 'dashboard' && <DashboardTab data={data} />}
            {activeTab === 'ga'        && <GATab        data={data} />}
            {activeTab === 'um'        && <UMTab        data={data} />}
            {activeTab === 'tvv'       && <TVVTab       data={data} />}
          </ErrorBoundary>
        )}

        {/* Drag overlay */}
        {dragOver && (
          <div style={{ position:'fixed', inset:0, background:'rgba(67,97,238,0.15)',
            backdropFilter:'blur(4px)', zIndex:999, display:'flex', alignItems:'center',
            justifyContent:'center', border:'3px dashed #4361ee', margin:20, borderRadius:18 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48 }}>📁</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#4361ee', marginTop:10 }}>Thả file Excel vào đây</div>
              <div style={{ fontSize:13, color:'#8896aa', marginTop:4 }}>Hỗ trợ .xlsx</div>
            </div>
          </div>
        )}
      </main>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
        style={{ display:'none' }} onChange={onFileInput} />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  )
}
