import React, { useState, useEffect, useRef } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, onValue, set } from 'firebase/database'
import { parseExcelFile } from './utils/parseExcel'
import DashboardTab from './components/DashboardTab'
import GATab from './components/GATab'
import UMTab from './components/UMTab'
import TVVTab from './components/TVVTab'
import SalesReportTab from './components/SalesReportTab'

// ── Firebase config — tự động kết nối cho tất cả users ──────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6pQL16It6EficYFP7yZSBKqQ56Gkfv-E",
  authDomain: "ga-dashboard-59e2a.firebaseapp.com",
  databaseURL: "https://ga-dashboard-59e2a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ga-dashboard-59e2a",
  storageBucket: "ga-dashboard-59e2a.firebasestorage.app",
  messagingSenderId: "135229272496",
  appId: "1:135229272496:web:4c93a501821e4acc74a675",
}
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'ga',        label: 'GA',        icon: '🏢' },
  { id: 'um',        label: 'UM',        icon: '👤' },
  { id: 'tvv',       label: 'TVV',       icon: '🧑‍💼' },
  { id: 'sales',     label: 'Sales Report', icon: '📋' },
]
const TAB_TITLES = {
  dashboard: 'Dashboard Tổng Quan — GA D03 Quận 3',
  ga: 'GA Tổng Hợp', um: 'Danh Sách UM', tvv: 'Danh Sách TVV',
  sales: 'D03 — Theo Dõi Doanh Số 2026',
}

const EMPTY_DATA = {
  kpis: { netManpower:72, fycThang:121.2, fypThang:506.7, apeNet:545.7, ipNet:490, caseNet:20, fycYtd:848.9, ipNetYtd:3273.7, apeNetYtd:3457.5, fypYtd:3333.0, syc:51.3, ryc:81.9, tongDaiLy:408, activeFyc:7, activeCase:11, mdrt:0 },
  topAgents: [
    { code:'60792209', name:'PHẠM HOÀNG THÁI TÀI', level:'AG', fyc:34.9, ape:137.2, caseNet:6.5 },
    { code:'60789390', name:'NGUYỄN VĂN LỢI QUÝ',  level:'AG', fyc:21.6, ape:92.5,  caseNet:2.5 },
    { code:'60532739', name:'LÊ VĂN XÈN',           level:'AG', fyc:18.1, ape:75.0,  caseNet:3.0 },
    { code:'60804930', name:'PHẠM THẢO NGUYÊN',     level:'AG', fyc:12.7, ape:55.9,  caseNet:2.0 },
    { code:'60032137', name:'VŨ THỊ MINH TUYẾT',    level:'AG', fyc:11.5, ape:42.5,  caseNet:2.0 },
  ],
  levelDist: [{ name:'AG', value:401 }, { name:'UM', value:7 }],
  officeData: [{ vanPhong:'GA710 - Quận 3', netMp:72, fyc:121.2, apeNet:545.7, caseNet:20 }],
  gaData: {
    fyp2026: [
      { month:'Jan', achieved:397.6, plan:300 }, { month:'Feb', achieved:379.4, plan:500 },
      { month:'Mar', achieved:1195.5,plan:770 }, { month:'Apr', achieved:853.8, plan:800 },
      { month:'May', achieved:373.1, plan:800 },
    ],
    act2026: [{month:'Jan',value:14},{month:'Feb',value:14},{month:'Mar',value:17},{month:'Apr',value:16},{month:'May',value:11}],
    mp2026:  [{month:'Jan',value:73},{month:'Feb',value:75},{month:'Mar',value:78},{month:'Apr',value:73},{month:'May',value:72}],
    tldtptt: [{month:'Jan',value:.838},{month:'Feb',value:.873},{month:'Mar',value:.869},{month:'Apr',value:.876},{month:'May',value:.871}],
    totalFypYtd:3199.3, totalFypPlan:4070, totalAct:72,
  },
  umList: [], agList: [],
}

const FB_PATH = 'ga_d03/dashboard'
const FB_CHUNK = 800_000

function chunkJSON(json) {
  const out = []
  for (let i = 0; i < json.length; i += FB_CHUNK) out.push(json.slice(i, i + FB_CHUNK))
  return out
}
function assembleSnapshot(snapshot) {
  const val = snapshot.val()
  if (!val?.chunks) return null
  try { return { data: JSON.parse(val.chunks.join('')), updatedAt: val.updatedAt } }
  catch { return null }
}

// ── Firebase Setup Modal ──────────────────────────────────────
function FirebaseSetupModal({ onSave, onClose, current }) {
  const [cfg, setCfg] = useState(current || { apiKey:'', authDomain:'', databaseURL:'', projectId:'', storageBucket:'', messagingSenderId:'', appId:'' })
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [err, setErr] = useState('')

  const parsePaste = (text) => {
    try {
      // Hỗ trợ paste nguyên block config từ Firebase console
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) { setErr('Không tìm thấy JSON config'); return }
      const cleaned = match[0]
        .replace(/\/\/.*$/gm, '')
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"')
      const parsed = JSON.parse(cleaned)
      setCfg(parsed)
      setPasteMode(false)
      setErr('')
    } catch (e) {
      setErr('Lỗi parse: ' + e.message + '. Hãy điền từng ô thủ công.')
    }
  }

  const handleSave = () => {
    if (!cfg.apiKey || !cfg.databaseURL) { setErr('Cần điền ít nhất apiKey và databaseURL'); return }
    if (!cfg.databaseURL.includes('firebasedatabase.app')) { setErr('databaseURL không hợp lệ'); return }
    localStorage.setItem('fb_config', JSON.stringify(cfg))
    onSave(cfg)
  }

  const F = ({ label, k, placeholder }) => (
    <div style={{ marginBottom:10 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'#4a5568', marginBottom:4 }}>{label}</div>
      <input value={cfg[k] || ''} onChange={e => setCfg(p => ({ ...p, [k]: e.target.value }))}
        placeholder={placeholder}
        style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #e8ecf4', borderRadius:8,
          fontSize:12, fontFamily:'monospace', outline:'none' }}
        onFocus={e => e.target.style.borderColor='#4361ee'}
        onBlur={e => e.target.style.borderColor='#e8ecf4'} />
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth:560 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">🔥 Cấu hình Firebase Realtime</div>
            <div style={{ fontSize:12, color:'#8896aa', marginTop:3 }}>
              Để sync data realtime giữa nhiều users
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Hướng dẫn nhanh */}
          <div style={{ background:'#f0f4ff', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:12, color:'#4a5568', lineHeight:1.8 }}>
            <strong style={{ color:'#4361ee' }}>📋 Cách lấy config:</strong><br/>
            1. Vào <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color:'#4361ee' }}>console.firebase.google.com</a><br/>
            2. Tạo project → Build → <strong>Realtime Database</strong> → Create → Singapore → Test mode<br/>
            3. Project Settings (⚙️) → General → Your apps → <strong>&lt;/&gt; Web</strong> → Register<br/>
            4. Copy toàn bộ block <code>firebaseConfig = &#123;...&#125;</code> rồi dán vào ô bên dưới
          </div>

          {pasteMode ? (
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'#4a5568', marginBottom:6 }}>
                Dán toàn bộ firebaseConfig block:
              </div>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                rows={8} placeholder={`const firebaseConfig = {\n  apiKey: "AIza...",\n  authDomain: "...",\n  databaseURL: "https://...",\n  ...\n}`}
                style={{ width:'100%', padding:'10px', border:'1.5px solid #e8ecf4', borderRadius:8,
                  fontSize:11, fontFamily:'monospace', outline:'none', resize:'vertical' }} />
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button onClick={() => parsePaste(pasteText)}
                  style={{ flex:1, padding:'8px', background:'#4361ee', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
                  Parse & Điền tự động
                </button>
                <button onClick={() => setPasteMode(false)}
                  style={{ padding:'8px 16px', background:'#f0f4ff', color:'#4361ee', border:'none', borderRadius:8, cursor:'pointer' }}>
                  Huỷ
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => setPasteMode(true)}
                style={{ width:'100%', padding:'9px', background:'linear-gradient(135deg,#4361ee,#7209b7)',
                  color:'white', border:'none', borderRadius:9, cursor:'pointer', fontWeight:600,
                  fontSize:13, marginBottom:14 }}>
                📋 Dán firebaseConfig block tự động điền
              </button>

              <F label="apiKey *" k="apiKey" placeholder="AIzaSy..." />
              <F label="databaseURL * (quan trọng nhất)" k="databaseURL" placeholder="https://your-project-rtdb.asia-southeast1.firebasedatabase.app" />
              <F label="authDomain" k="authDomain" placeholder="your-project.firebaseapp.com" />
              <F label="projectId" k="projectId" placeholder="your-project-id" />
              <F label="storageBucket" k="storageBucket" placeholder="your-project.appspot.com" />
              <F label="messagingSenderId" k="messagingSenderId" placeholder="123456789" />
              <F label="appId" k="appId" placeholder="1:123:web:abc..." />
            </>
          )}

          {err && <div style={{ color:'#ef476f', fontSize:12, margin:'8px 0', padding:'8px 12px', background:'#fff0f0', borderRadius:8 }}>{err}</div>}

          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button onClick={handleSave}
              style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#06d6a0,#4361ee)',
                color:'white', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14 }}>
              💾 Lưu & Kết nối Firebase
            </button>
            <button onClick={onClose}
              style={{ padding:'11px 20px', background:'#f0f4ff', color:'#4361ee', border:'none', borderRadius:10, cursor:'pointer' }}>
              Bỏ qua
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { err: null }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) return (
      <div style={{ padding:40, textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
        <div style={{ color:'#ef476f', fontWeight:700, marginBottom:8 }}>Lỗi hiển thị</div>
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

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {message}</div>
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [activeTab,   setActiveTab]   = useState('dashboard')
  const [data,        setData]        = useState(EMPTY_DATA)
  const [loading,     setLoading]     = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [fbStatus,    setFbStatus]    = useState('disconnected')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [toast,       setToast]       = useState(null)
  const [dragOver,    setDragOver]    = useState(false)
  const [showFBSetup, setShowFBSetup] = useState(false)
  const fileInputRef = useRef()
  const unsubRef     = useRef(null)
  const dbRef        = useRef(null)

  // ── Connect Firebase ──
  const connectFirebase = (config) => {
    try {
      // Cleanup old listener
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }

      const app = getApps().length ? getApps()[0] : initializeApp(config)
      const database = getDatabase(app)
      dbRef.current = database
      setFbStatus('connecting')

      unsubRef.current = onValue(
        ref(database, FB_PATH),
        (snapshot) => {
          const result = assembleSnapshot(snapshot)
          if (result) {
            setData(result.data)
            setLastUpdated(result.updatedAt)
          }
          setFbStatus('connected')
        },
        (err) => {
          console.error('FB:', err)
          setFbStatus('error')
        }
      )
    } catch (e) {
      console.error('FB init:', e)
      setFbStatus('error')
      setToast({ message: 'Firebase lỗi: ' + e.message, type: 'error' })
    }
  }

  // Auto-connect Firebase on mount using hardcoded config
  useEffect(() => {
    connectFirebase(FIREBASE_CONFIG)
    return () => { if (unsubRef.current) unsubRef.current() }
  }, [])

  const handleFBSave = (cfg) => {
    setShowFBSetup(false)
    connectFirebase(cfg)
    setToast({ message: 'Đang kết nối Firebase...', type: 'success' })
  }

  // ── Handle file upload ──
  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      setToast({ message: 'Vui lòng chọn file Excel (.xlsx)', type: 'error' }); return
    }
    setLoading(true)
    try {
      const parsed = await parseExcelFile(file)
      setData(parsed)

      if (dbRef.current) {
        setSyncing(true)
        await set(ref(dbRef.current, FB_PATH), {
          chunks: chunkJSON(JSON.stringify(parsed)),
          total: 1,
          updatedAt: new Date().toISOString(),
        })
        setSyncing(false)
        setToast({ message: `✓ Đã tải & đồng bộ realtime cho tất cả users`, type: 'success' })
      } else {
        setToast({ message: `✓ Đã tải "${file.name}" (chỉ local — chưa kết nối Firebase)`, type: 'success' })
      }
    } catch (err) {
      setSyncing(false)
      setToast({ message: 'Lỗi: ' + (err.message || String(err)), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // ── FB dot status ──
  const dotInfo = {
    connected:    { color: '#06d6a0', label: 'Firebase · Realtime', pulse: true },
    connecting:   { color: '#ffd166', label: 'Đang kết nối...', pulse: false },
    error:        { color: '#ef476f', label: 'Firebase lỗi', pulse: false },
    disconnected: { color: '#8896aa', label: 'Chưa kết nối Firebase', pulse: false },
  }[fbStatus] || { color: '#8896aa', label: '', pulse: false }

  return (
    <div className="app-layout"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}>

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
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:600,
              textTransform:'uppercase', padding:'0 12px', marginBottom:8 }}>Hệ thống</div>
          </div>

          <div className="nav-item" onClick={() => fileInputRef.current?.click()}>
            <span style={{ fontSize:15 }}>📤</span>
            <span>Upload Excel</span>
          </div>

          {/* Firebase setup button */}
          <div className="nav-item" onClick={() => setShowFBSetup(true)}
            style={{ marginTop:4, opacity: fbStatus === 'connected' ? 0.7 : 1 }}>
            <span style={{ fontSize:15 }}>🔥</span>
            <span>{fbStatus === 'connected' ? 'Firebase (đã kết nối)' : 'Cấu hình Firebase'}</span>
          </div>
        </nav>

        {/* Status footer */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
            <div style={{
              width:9, height:9, borderRadius:'50%', background:dotInfo.color,
              animation: dotInfo.pulse ? 'pulse 2.5s infinite' : 'none',
              flexShrink:0,
            }} />
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:500 }}>
              {dotInfo.label}
            </span>
            {syncing && (
              <span style={{ fontSize:9.5, color:'#ffd166', marginLeft:2 }}>↑ sync...</span>
            )}
          </div>
          {lastUpdated && (
            <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.3)', marginBottom:3 }}>
              🕐 {new Date(lastUpdated).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.22)', textAlign:'center' }}>
            GA D03 · Quận 3 · 2026
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-title">{TAB_TITLES[activeTab]}</div>
          <div className="topbar-actions">
            {/* Firebase badge in topbar */}
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 12px', borderRadius:8,
              background: fbStatus === 'connected' ? '#e6faf2' : '#f8f9ff',
              border: `1px solid ${fbStatus === 'connected' ? '#6ee7b7' : '#e8ecf4'}`,
              cursor: fbStatus !== 'connected' ? 'pointer' : 'default',
              fontSize:11.5, fontWeight:500,
              color: fbStatus === 'connected' ? '#065f46' : '#8896aa',
            }} onClick={() => fbStatus !== 'connected' && setShowFBSetup(true)}>
              <div style={{
                width:7, height:7, borderRadius:'50%', background:dotInfo.color,
                animation: dotInfo.pulse ? 'pulse 2.5s infinite' : 'none',
              }} />
              {fbStatus === 'connected' ? 'Realtime sync' : 'Kết nối Firebase →'}
            </div>
            <div className="date-badge">
              📅 {new Date().toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })}
            </div>
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              {syncing ? 'Đang sync...' : 'Cập nhật Excel'}
            </button>
          </div>
        </div>

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
            {activeTab === 'sales'     && <SalesReportTab />}
          </ErrorBoundary>
        )}

        {dragOver && (
          <div style={{ position:'fixed', inset:0, background:'rgba(67,97,238,0.15)',
            backdropFilter:'blur(4px)', zIndex:999, display:'flex', alignItems:'center',
            justifyContent:'center', border:'3px dashed #4361ee', margin:20, borderRadius:18 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48 }}>📁</div>
              <div style={{ fontSize:18, fontWeight:700, color:'#4361ee', marginTop:10 }}>Thả file Excel vào đây</div>
            </div>
          </div>
        )}
      </main>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
        style={{ display:'none' }}
        onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />

      {showFBSetup && (
        <FirebaseSetupModal
          current={(() => { try { return JSON.parse(localStorage.getItem('fb_config') || 'null') } catch { return null } })()}
          onSave={handleFBSave}
          onClose={() => setShowFBSetup(false)} />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
