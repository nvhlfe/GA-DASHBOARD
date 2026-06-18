import React, { useState } from 'react'
import { formatNum } from '../utils/parseExcel'

// Risk thresholds — tunable
const TLDTPTT_WARN = 80     // %
const TLDTPTT_DANGER = 70   // %
const FYC_DROP_WARN = -15   // % so với tháng trước

function buildAlerts(data) {
  const alerts = []
  const umList = data?.umList || []
  const agList = data?.agList || []
  const monthlyKpis = data?.monthlyKpis || {}
  const availableMonths = data?.availableMonths || []

  // 1. UM nguy cơ rớt MOC (duy trì UM)
  const umAtRisk = umList.filter(u => {
    if (u.moc_tamDat && String(u.moc_tamDat).includes('ü')) return false // đã đạt, an toàn
    const tldt = parseFloat(u.moc_tldtptt)
    return !isNaN(tldt) && tldt < TLDTPTT_WARN
  })
  if (umAtRisk.length > 0) {
    alerts.push({
      level: umAtRisk.some(u => parseFloat(u.moc_tldtptt) < TLDTPTT_DANGER) ? 'danger' : 'warn',
      icon: '🔐',
      title: `${umAtRisk.length} UM có nguy cơ rớt duy trì (MOC)`,
      detail: umAtRisk.slice(0, 5).map(u => `${u.leaderName} (TLDTPTT ${parseFloat(u.moc_tldtptt).toFixed(1)}%)`).join(', ')
        + (umAtRisk.length > 5 ? ` và ${umAtRisk.length - 5} người khác` : ''),
      tab: 'um',
    })
  }

  // 2. TVV TLDTPTT thấp (nguy cơ rớt PE)
  const tvvLowTldt = agList.filter(a => {
    const tldt = parseFloat(a.tldtptt)
    return !isNaN(tldt) && tldt < TLDTPTT_WARN
  })
  if (tvvLowTldt.length > 0) {
    alerts.push({
      level: tvvLowTldt.some(a => parseFloat(a.tldtptt) < TLDTPTT_DANGER) ? 'danger' : 'warn',
      icon: '💎',
      title: `${tvvLowTldt.length} TVV có TLDTPTT dưới ${TLDTPTT_WARN}%`,
      detail: tvvLowTldt.slice(0, 5).map(a => `${a.agentName} (${parseFloat(a.tldtptt).toFixed(1)}%)`).join(', ')
        + (tvvLowTldt.length > 5 ? ` và ${tvvLowTldt.length - 5} người khác` : ''),
      tab: 'tvv',
    })
  }

  // 3. FYC giảm mạnh so với tháng trước (cần ≥2 tháng)
  if (availableMonths.length >= 2) {
    const latest = availableMonths[availableMonths.length - 1]
    const prev = availableMonths[availableMonths.length - 2]
    const fycLatest = monthlyKpis[latest]?.fycThang
    const fycPrev = monthlyKpis[prev]?.fycThang
    if (fycLatest != null && fycPrev != null && fycPrev > 0) {
      const pctChange = ((fycLatest - fycPrev) / fycPrev) * 100
      if (pctChange <= FYC_DROP_WARN) {
        alerts.push({
          level: pctChange <= FYC_DROP_WARN * 2 ? 'danger' : 'warn',
          icon: '📉',
          title: `FYC tháng ${latest} giảm ${Math.abs(pctChange).toFixed(1)}% so với tháng ${prev}`,
          detail: `Từ ${formatNum(fycPrev)} triệu xuống ${formatNum(fycLatest)} triệu VND`,
          tab: 'dashboard',
        })
      }
    }
  }

  // 4. Net Manpower giảm
  if (availableMonths.length >= 2) {
    const latest = availableMonths[availableMonths.length - 1]
    const prev = availableMonths[availableMonths.length - 2]
    const mpLatest = monthlyKpis[latest]?.netManpower
    const mpPrev = monthlyKpis[prev]?.netManpower
    if (mpLatest != null && mpPrev != null && mpLatest < mpPrev) {
      alerts.push({
        level: 'info',
        icon: '👥',
        title: `Net Manpower giảm từ ${mpPrev} xuống ${mpLatest} đại lý`,
        detail: `Tháng ${latest} so với tháng ${prev}`,
        tab: 'dashboard',
      })
    }
  }

  return alerts
}

const LEVEL_STYLE = {
  danger: { bg:'#fff1f2', border:'#fca5a5', text:'#991b1b', badge:'#ef4444' },
  warn:   { bg:'#fffbeb', border:'#fde68a', text:'#92400e', badge:'#f59e0b' },
  info:   { bg:'#eff6ff', border:'#bfdbfe', text:'#1e40af', badge:'#3b82f6' },
}

export default function RiskAlerts({ data, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false)
  const alerts = buildAlerts(data)

  if (alerts.length === 0) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:10, marginBottom:14,
        background:'#e6faf2', border:'1px solid #6ee7b7', borderRadius:10,
        padding:'10px 16px',
      }}>
        <span style={{ fontSize:18 }}>✅</span>
        <span style={{ fontSize:12.5, color:'#065f46', fontWeight:600 }}>
          Không phát hiện rủi ro nào — tất cả chỉ số đang trong ngưỡng an toàn
        </span>
      </div>
    )
  }

  const dangerCount = alerts.filter(a => a.level === 'danger').length
  const warnCount = alerts.filter(a => a.level === 'warn').length

  return (
    <div style={{ marginBottom:16 }}>
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          display:'flex', alignItems:'center', gap:10, cursor:'pointer',
          background: dangerCount > 0 ? '#fff1f2' : '#fffbeb',
          border: `1px solid ${dangerCount > 0 ? '#fca5a5' : '#fde68a'}`,
          borderRadius: collapsed ? 10 : '10px 10px 0 0',
          padding:'10px 16px',
        }}>
        <span style={{ fontSize:18 }}>{dangerCount > 0 ? '🚨' : '⚠️'}</span>
        <span style={{ fontSize:12.5, fontWeight:700, color: dangerCount > 0 ? '#991b1b' : '#92400e' }}>
          {alerts.length} cảnh báo cần chú ý
        </span>
        <div style={{ display:'flex', gap:6, marginLeft:4 }}>
          {dangerCount > 0 && (
            <span style={{ background:'#ef4444', color:'white', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
              {dangerCount} nghiêm trọng
            </span>
          )}
          {warnCount > 0 && (
            <span style={{ background:'#f59e0b', color:'white', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
              {warnCount} cần theo dõi
            </span>
          )}
        </div>
        <span style={{ marginLeft:'auto', fontSize:13, color:'#8896aa' }}>{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (
        <div style={{
          border:'1px solid #e8ecf4', borderTop:'none',
          borderRadius:'0 0 10px 10px', background:'white',
          padding:'4px 0',
        }}>
          {alerts.map((a, i) => {
            const s = LEVEL_STYLE[a.level]
            return (
              <div key={i}
                onClick={() => onNavigate && onNavigate(a.tab)}
                style={{
                  display:'flex', alignItems:'flex-start', gap:10,
                  padding:'10px 16px',
                  borderBottom: i < alerts.length - 1 ? '1px solid #f0f4ff' : 'none',
                  cursor: onNavigate ? 'pointer' : 'default',
                  transition:'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize:16, flexShrink:0 }}>{a.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color: s.text }}>{a.title}</div>
                  <div style={{ fontSize:11, color:'#8896aa', marginTop:2 }}>{a.detail}</div>
                </div>
                {onNavigate && <span style={{ fontSize:11, color: s.text, flexShrink:0, fontWeight:600 }}>Xem →</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
