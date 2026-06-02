import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNum } from '../utils/parseExcel'

const KpiCard = ({ label, value, unit, badge, icon, colorClass = 'c1' }) => (
  <div className={`kpi-card ${colorClass}`}>
    <div className="kpi-header">
      <div className="kpi-icon" style={{ background: 'var(--primary-light)' }}>{icon}</div>
      <div className="kpi-label">{label}</div>
    </div>
    <div className="kpi-value">{value ?? '-'}</div>
    {unit && <div className="kpi-unit">{unit}</div>}
    {badge && (
      <div className={`kpi-badge ${badge.type}`}>
        {badge.type === 'up' ? '↑' : badge.type === 'down' ? '↓' : '—'} {badge.text}
      </div>
    )}
  </div>
)

export default function DashboardTab({ data }) {
  const k = data?.kpis || {}
  const top = data?.topAgents || []
  const offData = data?.officeData || []

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'white', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}>
          <strong>{payload[0]?.payload?.name}</strong>: {formatNum(payload[0]?.value)}
        </div>
      )
    }
    return null
  }

  // Only 8 KPI cards as requested
  const kpis = [
    { label: 'NET MANPOWER', value: formatNum(k.netManpower), unit: 'đại lý tuyển mới', badge: { type: 'up', text: '9 (14,3%)' }, icon: '👥', colorClass: 'c1' },
    { label: 'FYP THÁNG', value: formatNum(k.fypThang), unit: 'triệu VND', badge: { type: 'up', text: '21%' }, icon: '📋', colorClass: 'c2' },
    { label: 'APE NET', value: formatNum(k.apeNet), unit: 'triệu VND', badge: { type: 'up', text: '16,2%' }, icon: '💰', colorClass: 'c3' },
    { label: 'CASE NET', value: formatNum(k.caseNet), unit: 'case', badge: { type: 'up', text: '25%' }, icon: '✅', colorClass: 'c4' },
    { label: 'ACTIVE (FYC)', value: formatNum(k.activeFyc), unit: 'đại lý active', icon: '⚡', colorClass: 'c5' },
    { label: 'ACTIVE (CASE)', value: formatNum(k.activeCase ?? 11), unit: 'đại lý active', icon: '🔥', colorClass: 'c6' },
    { label: 'FYC YTD', value: formatNum(k.fycYtd), unit: 'lũy kế năm', icon: '📈', colorClass: 'c7' },
    { label: 'FYP YTD', value: formatNum(k.fypYtd), unit: 'lũy kế năm', icon: '📊', colorClass: 'c8' },
  ]

  return (
    <div className="page-content">
      {/* 8 KPI cards */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

      {/* MAIN CONTENT ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* TOP AGENTS */}
        <div className="card">
          <div className="section-header">
            <div className="section-icon">🏆</div>
            TOP ĐẠI LÝ THEO FYP
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên đại lý</th>
                <th>Mã</th>
                <th>Cấp bậc</th>
                <th>FYP</th>
                <th>FYC</th>
                <th>IP NET</th>
              </tr>
            </thead>
            <tbody>
              {top.map((ag, i) => (
                <tr key={i}>
                  <td>
                    <div className={`rank-num ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                      {i + 1}
                    </div>
                  </td>
                  <td style={{ color: '#4361ee', fontWeight: 600, fontSize: 11.5 }}>{ag.name}</td>
                  <td style={{ color: '#8896aa', fontSize: 11 }}>{ag.code}</td>
                  <td><span className={`level-badge level-${ag.level}`}>{ag.level}</span></td>
                  <td className="val-fyp">{formatNum(ag.fyp)}</td>
                  <td className="val-fyc">{formatNum(ag.fyc)}</td>
                  <td style={{color:"#fb8500",fontWeight:600}}>{formatNum(ag.ipNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11.5, color: '#8896aa' }}>
            Top 11 theo FYP · {top.length} đại lý
          </div>
        </div>

        {/* FYC THEO VĂN PHÒNG */}
        <div className="card">
          <div className="section-header">
            <div className="section-icon">📊</div>
            FYC THEO VĂN PHÒNG
          </div>
          <div style={{ fontSize: 11, color: '#8896aa', marginBottom: 6 }}>Triệu VND</div>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={offData.length > 0 ? offData.map(o => ({ name: 'Quận 3', value: o.fyc })) : [{ name: 'Quận 3', value: k.fycThang }]}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#fb8500" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 22, color: '#fb8500', marginTop: 4 }}>
            {formatNum(k.fycThang)}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#8896aa' }}>triệu VND</div>
        </div>

        {/* APE NET THEO VĂN PHÒNG */}
        <div className="card">
          <div className="section-header">
            <div className="section-icon">💰</div>
            APE NET THEO VĂN PHÒNG
          </div>
          <div style={{ fontSize: 11, color: '#8896aa', marginBottom: 6 }}>Triệu VND</div>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Quận 3', value: k.apeNet }]}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#4361ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 22, color: '#4361ee', marginTop: 4 }}>
            {formatNum(k.apeNet)}
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#8896aa' }}>triệu VND</div>
        </div>
      </div>

      {/* BOTTOM: NET MANPOWER & FYC TABLE */}
      <div className="card">
        <div className="section-header">
          <div className="section-icon">📋</div>
          NET MANPOWER & FYC MỖI VĂN PHÒNG
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Văn phòng</th>
              <th>Net MP</th>
              <th>FYC (Triệu VND)</th>
              <th>APE Net (Triệu VND)</th>
              <th>Case Net</th>
            </tr>
          </thead>
          <tbody>
            {(offData.length > 0 ? offData : [{ vanPhong: 'GA710 - Quận 3', netMp: k.netManpower, fyc: k.fycThang, apeNet: k.apeNet, caseNet: k.caseNet }]).map((o, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{o.vanPhong}</td>
                <td className="val-green">{formatNum(o.netMp)}</td>
                <td className="val-fyc">{formatNum(o.fyc)}</td>
                <td className="val-ape">{formatNum(o.apeNet)}</td>
                <td className="val-green">{formatNum(o.caseNet)}</td>
              </tr>
            ))}
            <tr style={{ background: '#f8f9ff', fontWeight: 700 }}>
              <td>Tổng cộng</td>
              <td className="val-green">{formatNum(k.netManpower)}</td>
              <td className="val-fyc">{formatNum(k.fycThang)}</td>
              <td className="val-ape">{formatNum(k.apeNet)}</td>
              <td className="val-green">{formatNum(k.caseNet)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
