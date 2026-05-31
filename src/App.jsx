import React, { useState, useEffect, useRef } from 'react'
import { parseExcelFile } from './utils/parseExcel'
import DashboardTab from './components/DashboardTab'
import GATab from './components/GATab'
import UMTab from './components/UMTab'
import TVVTab from './components/TVVTab'

// ========== FIREBASE CONFIG ==========
// Replace with your Firebase project config from console.firebase.google.com
// Project Settings → General → Your apps → Web app → Config
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
// =====================================

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { id: 'ga', label: 'GA', icon: '🏢' },
  { id: 'um', label: 'UM', icon: '👤' },
  { id: 'tvv', label: 'TVV', icon: '🧑‍💼' },
]

const DEFAULT_DATA = {
  kpis: {
    netManpower: 72, fycThang: 121.2, fypThang: 506.7, apeNet: 545.7,
    ipNet: 490, caseNet: 20, fycYtd: 848.9, ipNetYtd: 3273.7,
    apeNetYtd: 3457.5, fypYtd: 3333.0, syc: 51.3, ryc: 81.9,
    tongDaiLy: 408, activeFyc: 7, activeCase: 11, mdrt: 0,
  },
  topAgents: [
    { code: '60792209', name: 'PHẠM HOÀNG THÁI TÀI', level: 'AG', branch: 'A64', fyc: 34.9, ape: 137.2, caseNet: 6.5, syc: 0 },
    { code: '60789390', name: 'NGUYỄN VĂN LỢI QUÝ', level: 'AG', branch: 'A64', fyc: 21.6, ape: 92.5, caseNet: 2.5, syc: 0 },
    { code: '60532739', name: 'LÊ VĂN XÈN', level: 'AG', branch: 'A69', fyc: 18.1, ape: 75.0, caseNet: 3.0, syc: 11.2 },
    { code: '60804930', name: 'PHẠM THẢO NGUYÊN', level: 'AG', branch: 'A64', fyc: 12.7, ape: 55.9, caseNet: 2.0, syc: 0 },
    { code: '60032137', name: 'VŨ THỊ MINH TUYẾT', level: 'AG', branch: 'A69', fyc: 11.5, ape: 42.5, caseNet: 2.0, syc: 0 },
    { code: '60295804', name: 'NGUYỄN HỮU THỜI', level: 'AG', branch: 'Q80', fyc: 6.8, ape: 26.4, caseNet: 1.0, syc: 12.1 },
    { code: '60715572', name: 'NGUYỄN THỊ KIM NGỌC', level: 'AG', branch: 'Q80', fyc: 5.4, ape: 22.9, caseNet: 1.0, syc: 0 },
    { code: '60627375', name: 'TRỊNH MINH TÚ', level: 'AG', branch: 'Q80', fyc: 4.5, ape: 18.6, caseNet: 1.0, syc: 4.1 },
    { code: '60043681', name: 'NGUYỄN THỊ BÍCH THUẬN', level: 'AG', branch: 'A64', fyc: 4.1, ape: 67.8, caseNet: 1.0, syc: 0 },
    { code: '60770351', name: 'NGUYỄN CAO KỲ PHONG', level: 'AG', branch: 'A64', fyc: 3.9, ape: 17.2, caseNet: 0.5, syc: 0 },
    { code: '60807190', name: 'NGUYỄN THỊ PHI NHUNG', level: 'AG', branch: 'A64', fyc: 2.2, ape: 8.2, caseNet: 0.5, syc: 0 },
  ],
  levelDist: [{ name: 'AG', value: 401 }, { name: 'UM', value: 7 }],
  officeData: [{ vanPhong: 'GA710 - Quận 3', netMp: 72, fyc: 121.2, apeNet: 545.7, caseNet: 20 }],
  gaData: {
    fyp2026: [
      { month: 'Jan', achieved: 397.6, plan: 300 }, { month: 'Feb', achieved: 379.4, plan: 500 },
      { month: 'Mar', achieved: 1195.5, plan: 770 }, { month: 'Apr', achieved: 853.8, plan: 800 },
      { month: 'May', achieved: 373.1, plan: 800 }, { month: 'Jun', achieved: null, plan: 900 },
    ],
    act2026: [
      { month: 'Jan', value: 14 }, { month: 'Feb', value: 14 }, { month: 'Mar', value: 17 },
      { month: 'Apr', value: 16 }, { month: 'May', value: 11 }, { month: 'Jun', value: null },
    ],
    mp2026: [
      { month: 'Jan', value: 73 }, { month: 'Feb', value: 75 }, { month: 'Mar', value: 78 },
      { month: 'Apr', value: 73 }, { month: 'May', value: 72 }, { month: 'Jun', value: null },
    ],
    tldtptt: [
      { month: 'Jan', value: 0.838 }, { month: 'Feb', value: 0.873 }, { month: 'Mar', value: 0.869 },
      { month: 'Apr', value: 0.876 }, { month: 'May', value: 0.871 }, { month: 'Jun', value: null },
    ],
    totalFypYtd: 3199.3, totalFypPlan: 4070, totalAct: 72,
  },
  umList: [
    { stt:1, off:'D03', bm:'A64', unit:'9CG', leaderCode:'60728345', leaderName:'BÙI PHI LONG', agType:'UM', appDate:'2026-01-15', phone:'0334546920', pcHienTai:'VÀNG', fycPhongTT:367.5, tvvmcl:2, tongTvvmclGen1:2, tldtptt:1.0, pcTamDat:'Bạch Kim', pcDuKien:'KIM CƯƠNG', fycCanThem:432.5, tvvMoiCl:1, tongFyc:161.9, tongTvvAct:8, mucHoTro:'0.24', mucChiTra:'1.1', tienThuong:42.8, fycTangMucThuong:42.5, thuongTangThem:53.4, moc_fyc6thang:368.4, moc_luotTvvAct:18, moc_tvvMoiCl:6, moc_tongLuot:24, moc_tldtptt:1.0, moc_tamDat:'ü', moc_fycCanThem:0, moc_luotCanThem:0, moc_tldtCanThem:'-', luotTvvHdTb:3.2, tongIp:1711772100, tamThoaDK:null, veThamDu:0 },
    { stt:2, off:'D03', bm:'A69', unit:'A69', leaderCode:'60000127', leaderName:'LƯU THỊ HUYỀN TRANG', agType:'UM', appDate:'2020-03-24', phone:'0903647651', pcHienTai:null, fycPhongTT:323.0, tvvmcl:0, tongTvvmclGen1:0, tldtptt:0.819, pcTamDat:null, pcDuKien:'KIM CƯƠNG', fycCanThem:477.0, tvvMoiCl:3, tongFyc:76.2, tongTvvAct:6, mucHoTro:'0.24', mucChiTra:'1.0', tienThuong:4.4, fycTangMucThuong:null, thuongTangThem:25.2, moc_fyc6thang:133.9, moc_luotTvvAct:10, moc_tvvMoiCl:0, moc_tongLuot:10, moc_tldtptt:0.819, moc_tamDat:'ü', moc_fycCanThem:0, moc_luotCanThem:0, moc_tldtCanThem:'-', luotTvvHdTb:3.0, tongIp:null, tamThoaDK:null, veThamDu:0 },
    { stt:3, off:'D03', bm:'A69', unit:'RVV', leaderCode:'60185585', leaderName:'CAO ANH THƯ', agType:'UM', appDate:'2025-12-22', phone:'0907986379', pcHienTai:null, fycPhongTT:39.6, tvvmcl:0, tongTvvmclGen1:0, tldtptt:0.92, pcTamDat:null, pcDuKien:'VÀNG', fycCanThem:110.4, tvvMoiCl:1, tongFyc:16.7, tongTvvAct:2, mucHoTro:'0.00', mucChiTra:'1.1', tienThuong:0, fycTangMucThuong:null, thuongTangThem:2.2, moc_fyc6thang:22.4, moc_luotTvvAct:3, moc_tvvMoiCl:0, moc_tongLuot:3, moc_tldtptt:0.92, moc_tamDat:null, moc_fycCanThem:0, moc_luotCanThem:3, moc_tldtCanThem:'-', luotTvvHdTb:0.857, tongIp:null, tamThoaDK:null, veThamDu:0 },
    { stt:4, off:'D03', bm:'A98', unit:'NJ3', leaderCode:'60109237', leaderName:'DƯƠNG THỊ TRÀ MY', agType:'UM', appDate:'2025-02-17', phone:'0903059928', pcHienTai:'VÀNG', fycPhongTT:142.3, tvvmcl:0, tongTvvmclGen1:0, tldtptt:0.686, pcTamDat:null, pcDuKien:'VÀNG', fycCanThem:7.7, tvvMoiCl:1, tongFyc:null, tongTvvAct:null, mucHoTro:null, mucChiTra:null, tienThuong:0, fycTangMucThuong:null, thuongTangThem:0, moc_fyc6thang:63.5, moc_luotTvvAct:9, moc_tvvMoiCl:3, moc_tongLuot:12, moc_tldtptt:0.686, moc_tamDat:'ü', moc_fycCanThem:0, moc_luotCanThem:0, moc_tldtCanThem:'-', luotTvvHdTb:null, tongIp:null, tamThoaDK:null, veThamDu:0 },
    { stt:5, off:'D03', bm:'A98', unit:'U8Y', leaderCode:'60784872', leaderName:'NGUYỄN THỊ THANH TUYỀN', agType:'UM', appDate:'2024-01-15', phone:'0908555781', pcHienTai:null, fycPhongTT:80.6, tvvmcl:0, tongTvvmclGen1:0, tldtptt:0.871, pcTamDat:null, pcDuKien:'VÀNG', fycCanThem:69.4, tvvMoiCl:1, tongFyc:null, tongTvvAct:null, mucHoTro:null, mucChiTra:null, tienThuong:0, fycTangMucThuong:null, thuongTangThem:0, moc_fyc6thang:18.8, moc_luotTvvAct:1, moc_tvvMoiCl:1, moc_tongLuot:2, moc_tldtptt:0.871, moc_tamDat:'ü', moc_fycCanThem:0, moc_luotCanThem:4, moc_tldtCanThem:'-', luotTvvHdTb:null, tongIp:null, tamThoaDK:null, veThamDu:0 },
    { stt:6, off:'D03', bm:'A98', unit:'ZV2', leaderCode:'60049837', leaderName:'BÙI THỊ THÀNH', agType:'UM', appDate:'2010-06-15', phone:'0903786895', pcHienTai:null, fycPhongTT:43.8, tvvmcl:0, tongTvvmclGen1:0, tldtptt:0.887, pcTamDat:null, pcDuKien:'VÀNG', fycCanThem:106.2, tvvMoiCl:1, tongFyc:null, tongTvvAct:null, mucHoTro:null, mucChiTra:null, tienThuong:0, fycTangMucThuong:null, thuongTangThem:0, moc_fyc6thang:19.6, moc_luotTvvAct:2, moc_tvvMoiCl:0, moc_tongLuot:2, moc_tldtptt:0.887, moc_tamDat:'ü', moc_fycCanThem:0, moc_luotCanThem:4, moc_tldtCanThem:'-', luotTvvHdTb:null, tongIp:null, tamThoaDK:null, veThamDu:0 },
    { stt:7, off:'D03', bm:'Q80', unit:'J5I', leaderCode:'60098076', leaderName:'PHẠM THỊ VÂN', agType:'UM', appDate:'2015-12-16', phone:'0906846434', pcHienTai:'VÀNG', fycPhongTT:230.2, tvvmcl:0, tongTvvmclGen1:0, tldtptt:0.876, pcTamDat:null, pcDuKien:'BẠCH KIM', fycCanThem:69.8, tvvMoiCl:2, tongFyc:null, tongTvvAct:null, mucHoTro:null, mucChiTra:null, tienThuong:0, fycTangMucThuong:null, thuongTangThem:0, moc_fyc6thang:119.6, moc_luotTvvAct:11, moc_tvvMoiCl:1, moc_tongLuot:12, moc_tldtptt:0.876, moc_tamDat:'ü', moc_fycCanThem:0, moc_luotCanThem:0, moc_tldtCanThem:'-', luotTvvHdTb:null, tongIp:null, tamThoaDK:null, veThamDu:0 },
  ],
  agList: [
    { no:1, office:'D03', ban:'A64', unit:'9CG', msddl:'60792209', agentName:'PHẠM HOÀNG THÁI TÀI', appDate:'2023-10-13', phone:null, mdrt:null, peHienTai:'BẠCH KIM', fyc12m:243.2, act1:'ü', act2:'ü', act3:null, tongHd3m:2, tldtptt:1.0, ketQuaTamTinh:'Vàng', peDuKien:'BẠCH KIM', fyc:87.5, syc:0, mucHoTro:'0.5', mucChiTra:'1.1', thuongTamTinh:48.1, fycCanThem:42.5, fypYtd:868.5, sc_tldthd:1.0, sc_tongIp:1176844000, sc_ve:'Thượng Hải', sc_soHd:22, sc_tldtptt:1.0, sc_tamThoa:null, sc_tamDatVe:null, sc_hdCanThem:null, sc_ipCanThem:null, sc_tldtCanThem:null, pe_fyc12m:243.2, pe_tldtptt:1.0, pe_tamDatKimCuong:null, pe_fycCanThem:null, pe_thangCanThem:null, pe_tldtCanKhoiPhuc:null, quy_fyc:87.5, quy_syc:0, quy_tldtptt:1.0, quy_mucHoTro:'0.5', quy_mucChiTra:'1.1', quy_tienThuong:48.1, quy_fycCanThem:42.5, quy_tldtNangCao:null, quy_chiTraCaoHon:null, quy_thuongCaoHon:null, mdrt2027_fyp12m:868.5, mdrt2027_fyc12m:218.0, mdrt2027_tldtptt:1.0, mdrt2027_tamDat:null, mdrt2027_q1:205.2, mdrt2027_q2:455.2, mdrt2027_q3:705.2, mdrt2027_total:1073.7 },
    { no:2, office:'D03', ban:'A69', unit:'A69', msddl:'60532739', agentName:'LÊ VĂN XÈN', appDate:'2020-04-28', phone:null, mdrt:null, peHienTai:'BẠCH KIM', fyc12m:128.2, act1:'ü', act2:'ü', act3:null, tongHd3m:2, tldtptt:0.9, ketQuaTamTinh:'Vàng', peDuKien:'BẠCH KIM', fyc:28.2, syc:11.7, mucHoTro:'0.2', mucChiTra:'1.1', thuongTamTinh:9.4, fycCanThem:11.8, fypYtd:210.4, sc_tldthd:0.9, sc_tongIp:641820100, sc_ve:null, sc_soHd:16, sc_tldtptt:0.946, sc_tamThoa:null, sc_tamDatVe:null, sc_hdCanThem:null, sc_ipCanThem:null, sc_tldtCanThem:null, pe_fyc12m:128.2, pe_tldtptt:0.9, pe_tamDatKimCuong:'BẠCH KIM', pe_fycCanThem:11.8, pe_thangCanThem:1, pe_tldtCanKhoiPhuc:'-', quy_fyc:28.2, quy_syc:11.7, quy_tldtptt:0.9, quy_mucHoTro:'0.2', quy_mucChiTra:'1.1', quy_tienThuong:9.4, quy_fycCanThem:11.8, quy_tldtNangCao:0.1, quy_chiTraCaoHon:'1.1', quy_thuongCaoHon:9.8 },
    { no:3, office:'D03', ban:'Q80', unit:'J5I', msddl:'60627375', agentName:'TRỊNH MINH TÚ', appDate:'2017-10-24', phone:null, mdrt:null, peHienTai:'BẠCH KIM', fyc12m:115.4, act1:'ü', act2:null, act3:null, tongHd3m:1, tldtptt:0.797, ketQuaTamTinh:null, peDuKien:'BẠCH KIM', fyc:31.3, syc:6.6, mucHoTro:'0.2', mucChiTra:'0.8', thuongTamTinh:6.3, fycCanThem:8.7, fypYtd:200.5, sc_tldthd:0.797, sc_tongIp:582869000, sc_ve:null, sc_soHd:16, sc_tldtptt:0.886, sc_tamThoa:null, sc_tamDatVe:null, sc_hdCanThem:null, sc_ipCanThem:null, sc_tldtCanThem:null, pe_fyc12m:115.4, pe_tldtptt:0.797, pe_tamDatKimCuong:'BẠCH KIM', pe_fycCanThem:8.7, pe_thangCanThem:2, pe_tldtCanKhoiPhuc:'-', quy_fyc:31.3, quy_syc:6.6, quy_tldtptt:0.797, quy_mucHoTro:'0.2', quy_mucChiTra:'0.8', quy_tienThuong:6.3, quy_fycCanThem:8.7, quy_tldtNangCao:0.1, quy_chiTraCaoHon:'1.1', quy_thuongCaoHon:6.5 },
    { no:4, office:'D03', ban:'A64', unit:'9CG', msddl:'60807190', agentName:'NGUYỄN THỊ PHI NHUNG', appDate:'2020-01-02', phone:'—', mdrt:null, peHienTai:null, fyc12m:38.5, act1:'ü', act2:null, act3:null, tongHd3m:1, tldtptt:0.8, ketQuaTamTinh:null, peDuKien:null, fyc:9.3, syc:0, mucHoTro:'0', mucChiTra:'1', thuongTamTinh:0, fycCanThem:0.7, fypYtd:130.9, sc_tldthd:0.8, sc_tongIp:164582450, sc_ve:'Thượng Hải', sc_soHd:7, sc_tldtptt:1.0, sc_tamThoa:null, sc_tamDatVe:null, sc_hdCanThem:4.5, sc_ipCanThem:3035417550, sc_tldtCanThem:'-', pe_fyc12m:38.5, pe_tldtptt:0.8, pe_tamDatKimCuong:null, pe_fycCanThem:141.5, pe_thangCanThem:2, pe_tldtCanKhoiPhuc:'-', quy_fyc:9.3, quy_syc:0, quy_tldtptt:0.8, quy_mucHoTro:'0', quy_mucChiTra:'1', quy_tienThuong:0, quy_fycCanThem:0.7, quy_tldtNangCao:0.1, quy_chiTraCaoHon:'1.1', quy_thuongCaoHon:1.5, mdrt2027_fyp12m:130.9, mdrt2027_fyc12m:34.3, mdrt2027_tldtptt:0.8, mdrt2027_tamDat:null, mdrt2027_q1:119.1, mdrt2027_q2:369.1, mdrt2027_q3:619.1, mdrt2027_total:942.7,
      monthly: [
        { month:'T1', hd:1, ip:24.15, fyp:0, fyc:1, act:false, fycL12m:0, hdYtd:1, fycYtd:1, fypYtd:0, ipYtd:24.15 },
        { month:'T2', hd:2.5, ip:51.7, fyp:0, fyc:1, act:false, fycL12m:0, hdYtd:3.5, fycYtd:2, fypYtd:0, ipYtd:75.9 },
        { month:'T3', hd:1, ip:19.3, fyp:0, fyc:1, act:false, fycL12m:0, hdYtd:4.5, fycYtd:3, fypYtd:0, ipYtd:95.2 },
        { month:'T4', hd:1, ip:27.6, fyp:27.6, fyc:7.1, act:true, fycL12m:36.3, hdYtd:5.5, fycYtd:10.1, fypYtd:27.6, ipYtd:122.8 },
        { month:'T5', hd:0.5, ip:8.2, fyp:8.2, fyc:2.2, act:false, fycL12m:38.3, hdYtd:6, fycYtd:12.3, fypYtd:35.8, ipYtd:130.9 },
      ]
    },
  ]
}

// Firebase dynamic import (only if config is set)
async function initFirebase(config) {
  if (!config.apiKey || config.apiKey === 'YOUR_API_KEY') return null
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js')
    const { getDatabase, ref, onValue, set } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js')
    const app = initializeApp(config)
    const db = getDatabase(app)
    return { db, ref, onValue, set }
  } catch (e) {
    console.warn('Firebase init failed:', e)
    return null
  }
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return <div className={`toast ${type}`}>{type === 'success' ? '✅' : '❌'} {message}</div>
}

const tabTitles = {
  dashboard: 'Dashboard Tổng Quan — GA D03 Quận 3',
  ga: 'GA Tổng Hợp',
  um: 'Danh Sách UM',
  tvv: 'Danh Sách TVV',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [data, setData] = useState(DEFAULT_DATA)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [fbStatus, setFbStatus] = useState('') // 'connected' | 'error' | ''
  const [lastUpdated, setLastUpdated] = useState(null)
  const fileInputRef = useRef()
  const fbRef = useRef(null)

  // Init Firebase on mount
  useEffect(() => {
    initFirebase(FIREBASE_CONFIG).then(fb => {
      if (!fb) return
      fbRef.current = fb
      const { db, ref, onValue } = fb
      const dataRef = ref(db, 'ga_d03/data')
      // Listen for realtime updates
      onValue(dataRef, (snapshot) => {
        const val = snapshot.val()
        if (val) {
          try {
            const parsed = JSON.parse(val.json)
            setData(parsed)
            setLastUpdated(val.updatedAt)
            setFbStatus('connected')
          } catch (e) {
            console.error('Parse FB data error', e)
          }
        }
      }, (err) => {
        console.error('FB listen error', err)
        setFbStatus('error')
      })
    })
  }, [])

  const pushToFirebase = async (parsedData) => {
    if (!fbRef.current) return
    try {
      const { db, ref, set } = fbRef.current
      await set(ref(db, 'ga_d03/data'), {
        json: JSON.stringify(parsedData),
        updatedAt: new Date().toISOString(),
      })
    } catch (e) {
      console.error('FB push error', e)
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.xlsx?$/i)) {
      setToast({ message: 'Vui lòng chọn file Excel (.xlsx)', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const parsed = await parseExcelFile(file)
      setData(parsed)
      await pushToFirebase(parsed)
      setToast({ message: `✓ Đã tải "${file.name}" thành công${fbRef.current ? ' & đồng bộ Firebase' : ''}`, type: 'success' })
    } catch (err) {
      setToast({ message: 'Lỗi đọc file: ' + err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="app-layout"
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* SIDEBAR */}
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
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0 12px', paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>Hệ thống</div>
          </div>
          <div className="nav-item" onClick={() => fileInputRef.current?.click()}>
            <span style={{ fontSize: 15 }}>📤</span>
            <span>Upload Excel</span>
          </div>
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {fbStatus === 'connected' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#06d6a0', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Firebase Realtime</span>
            </div>
          )}
          {lastUpdated && (
            <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)' }}>
              Cập nhật: {new Date(lastUpdated).toLocaleString('vi-VN')}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, textAlign: 'center' }}>
            GA D03 · Quận 3 · 2026
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        <div className="topbar">
          <div className="topbar-title">{tabTitles[activeTab]}</div>
          <div className="topbar-actions">
            <div className="date-badge">
              📅 {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Cập nhật Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <div style={{ fontSize: 13, color: '#8896aa' }}>Đang xử lý file Excel...</div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab data={data} />}
            {activeTab === 'ga' && <GATab data={data} />}
            {activeTab === 'um' && <UMTab data={data} />}
            {activeTab === 'tvv' && <TVVTab data={data} />}
          </>
        )}

        {dragOver && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(67,97,238,0.15)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed #4361ee', margin: 20, borderRadius: 18 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>📁</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#4361ee', marginTop: 10 }}>Thả file Excel vào đây</div>
              <div style={{ fontSize: 13, color: '#8896aa', marginTop: 4 }}>Hỗ trợ .xlsx</div>
            </div>
          </div>
        )}
      </main>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
