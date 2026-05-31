import React from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { formatNum } from '../utils/parseExcel'

const MetricCard = ({ label, value, unit, color = '#4361ee', icon }) => (
  <div className="card" style={{ textAlign: 'center', padding: '18px 10px' }}>
    <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 10.5, color: '#8896aa', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value || '—'}</div>
    {unit && <div style={{ fontSize: 10, color: '#8896aa', marginTop: 2 }}>{unit}</div>}
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'white', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {formatNum(p.value)}</div>
        ))}
      </div>
    )
  }
  return null
}

// Format TLDTPTT correctly: value is 0-1 (ratio), display as xx.xx%
function fmtPct(val) {
  if (val === null || val === undefined) return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  // If value > 1 it's already a percentage (e.g. 87.1), else multiply by 100
  const pct = n > 1 ? n : n * 100
  return pct.toFixed(2) + '%'
}

export default function GATab({ data }) {
  const ga = data?.gaData || {}
  const k = data?.kpis || {}

  const fypData = ga.fyp2026 || []
  const actData = ga.act2026 || []
  const tldtData = ga.tldtptt || []
  const mpData = ga.mp2026 || []

  // Only the 6 requested metrics
  const summaryCards = [
    { label: 'FYP Kế Hoạch', value: formatNum(ga.totalFypPlan), unit: 'triệu VND', color: '#4361ee', icon: '🎯' },
    { label: 'FYP Thực Hiện', value: formatNum(ga.totalFypYtd), unit: 'triệu VND', color: '#06d6a0', icon: '✅' },
    { label: 'APE Net YTD', value: k.apeNetYtd >= 1000 ? (Math.round(k.apeNetYtd / 100) / 10).toFixed(1) + 'T' : formatNum(k.apeNetYtd), unit: 'triệu VND', color: '#7209b7', icon: '💰' },
    { label: 'Net Manpower', value: formatNum(k.netManpower), unit: 'đại lý', color: '#00b4d8', icon: '👥' },
    { label: 'Active FYC', value: formatNum(k.activeFyc), unit: 'đại lý hoạt động', color: '#ef476f', icon: '🔥' },
    { label: 'Active Case', value: formatNum(k.activeCase ?? 11), unit: 'đại lý hoạt động', color: '#fb8500', icon: '⚡' },
  ]

  // Combined chart data
  const combinedData = fypData.map((f, i) => ({
    month: f.month,
    fypPlan: f.plan,
    fypThucHien: f.achieved,
    act: actData[i]?.value,
    mp: mpData[i]?.value,
  })).filter(d => d.fypThucHien !== null || d.fypPlan !== null)

  const tldtChartData = tldtData
    .filter(d => d.value !== null)
    .map(d => ({
      month: d.month,
      // Ensure correct percentage display
      pct: d.value > 1 ? Math.round(d.value * 10) / 10 : Math.round(d.value * 1000) / 10
    }))

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1f36', marginBottom: 4 }}>GA Tổng Hợp — D03 Quận 3</h2>
        <p style={{ fontSize: 12, color: '#8896aa' }}>Dữ liệu tổng hợp theo năm 2026</p>
      </div>

      {/* 6 summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {summaryCards.map((c, i) => <MetricCard key={i} {...c} />)}
      </div>

      {/* Charts row 1 */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="section-header">
            <div className="section-icon">📈</div>
            FYP 2026 — Kế Hoạch vs Thực Hiện (triệu VND)
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                <Bar dataKey="fypPlan" name="Kế hoạch" fill="#e8edff" stroke="#4361ee" strokeWidth={1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="fypThucHien" name="Thực hiện" fill="#4361ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div className="section-icon">⚡</div>
            Hoạt Động (ACT) & Net Manpower theo Tháng
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                <Line type="monotone" dataKey="act" name="ACT" stroke="#f72585" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="mp" name="Net MP" stroke="#06d6a0" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TLDTPTT chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-header">
          <div className="section-icon">📊</div>
          TLDTPTT theo Tháng (%)
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tldtChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[70, 100]} tickFormatter={v => v + '%'} />
              <Tooltip content={<CustomTooltip />} formatter={(v) => [v.toFixed(2) + '%', 'TLDTPTT']} />
              <Line type="monotone" dataKey="pct" name="TLDTPTT" stroke="#7209b7" strokeWidth={2.5} dot={{ r: 4, fill: '#7209b7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table */}
      <div className="card">
        <div className="section-header">
          <div className="section-icon">📋</div>
          Số Liệu Chi Tiết Theo Tháng
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>FYP Kế Hoạch</th>
                <th>FYP Thực Hiện</th>
                <th>ACT</th>
                <th>Net MP</th>
                <th>TLDTPTT</th>
              </tr>
            </thead>
            <tbody>
              {fypData.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.month}</td>
                  <td>{formatNum(row.plan)}</td>
                  <td className="val-fyc">{formatNum(row.achieved)}</td>
                  <td className="val-green">{formatNum(actData[i]?.value)}</td>
                  <td>{formatNum(mpData[i]?.value)}</td>
                  <td className="val-orange">
                    {tldtData[i]?.value != null
                      ? (tldtData[i].value > 1
                          ? tldtData[i].value.toFixed(2) + '%'
                          : (tldtData[i].value * 100).toFixed(2) + '%')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
