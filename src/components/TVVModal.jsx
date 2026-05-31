import React from 'react'
import { formatNum } from '../utils/parseExcel'

function fmtDate(val) {
  if (!val) return '—'
  if (val instanceof Date) return val.toLocaleDateString('vi-VN')
  const s = String(val)
  if (s.includes('T')) return s.split('T')[0]
  return s
}

// Format percent: value is 0-1 ratio → display xx.xx%
function fmtPct(val) {
  if (val === null || val === undefined) return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return (n * 100).toFixed(2) + '%'
}

const InfoBlock = ({ label, value, color, sub }) => (
  <div className="info-block">
    <div className="info-block-label">{label}</div>
    <div className="info-block-value" style={color ? { color, fontSize: 14 } : { fontSize: 14 }}>{value ?? '—'}</div>
    {sub && <div className="info-block-sub">{sub}</div>}
  </div>
)

function PEBadge({ val }) {
  if (!val || val === '0' || val === 0) return <span style={{ color: '#ccc' }}>—</span>
  const v = String(val).toUpperCase()
  let bg, color
  if (v.includes('KIM CƯƠNG')) { bg = '#e3f2fd'; color = '#1e88e5' }
  else if (v.includes('BẠCH KIM')) { bg = '#e8f5e9'; color = '#43a047' }
  else if (v.includes('VÀNG') || v.includes('VANG')) { bg = '#fff3cd'; color = '#7a5c00' }
  else { bg = '#f0f4ff'; color = '#4361ee' }
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{val}</span>
}

function ActCheck({ val }) {
  if (!val || val === 'NaN') return <span style={{ color: '#e0e0e0', fontSize: 16 }}>○</span>
  if (String(val).includes('ü') || String(val).toLowerCase() === 'true') {
    return <span style={{ color: '#06d6a0', fontSize: 16, fontWeight: 700 }}>✓</span>
  }
  return <span style={{ color: '#e0e0e0', fontSize: 16 }}>○</span>
}

function MdrtBadge({ val }) {
  if (!val) return <span style={{ color: '#ccc' }}>—</span>
  return <span style={{ background: '#fff3cd', color: '#7a5c00', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{val}</span>
}

export default function TVVModal({ tvv, onClose }) {
  if (!tvv) return null

  const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
  const monthly = tvv.monthly || []

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 1000 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">👤 {tvv.agentName}</div>
            <div style={{ fontSize: 12, color: '#8896aa', marginTop: 2 }}>
              Mã: {tvv.msddl} · {tvv.office}/{tvv.ban}/{tvv.unit} · Ngày vào: {fmtDate(tvv.appDate)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Basic info */}
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 12 }}>
            <InfoBlock label="Phòng / Ban / Unit" value={`${tvv.office}/${tvv.ban}/${tvv.unit}`} />
            <InfoBlock label="Điện thoại" value={tvv.phone || '—'} />
            <InfoBlock label="MDRT 2026" value={<MdrtBadge val={tvv.mdrt} />} />
            <InfoBlock label="AG Segment" value={tvv.agSeg || '—'} />
          </div>

          {/* === A. KẾT QUẢ KINH DOANH === */}
          <div className="section-divider">📊 A. KẾT QUẢ KINH DOANH 2026</div>
          {/* Monthly table */}
          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table className="data-table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  <th>Tháng</th>
                  <th>HĐ (tháng)</th>
                  <th>IP (tháng)</th>
                  <th>FYP (tháng)</th>
                  <th>FYC (tháng)</th>
                  <th>ACT</th>
                  <th>FYC L12M</th>
                  <th>HĐ (lũy kế)</th>
                  <th>FYC (lũy kế)</th>
                  <th>FYP (lũy kế)</th>
                  <th>IP (lũy kế)</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{m.month}</td>
                    <td>{formatNum(m.hd)}</td>
                    <td>{formatNum(m.ip)}</td>
                    <td className="val-fyp">{formatNum(m.fyp)}</td>
                    <td className="val-fyc">{formatNum(m.fyc)}</td>
                    <td>{m.act ? <span style={{ color: '#06d6a0', fontWeight: 700 }}>✓</span> : <span style={{ color: '#ddd' }}>—</span>}</td>
                    <td style={{ color: '#7209b7' }}>{formatNum(m.fycL12m)}</td>
                    <td>{formatNum(m.hdYtd)}</td>
                    <td className="val-fyc">{formatNum(m.fycYtd)}</td>
                    <td className="val-fyp">{formatNum(m.fypYtd)}</td>
                    <td>{formatNum(m.ipYtd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* === B. MDRT 2027 === */}
          <div className="section-divider">🏆 B. MDRT 2027</div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <InfoBlock label="FYP 12T vừa qua" value={formatNum(tvv.mdrt2027_fyp12m)} color="#4361ee" sub="triệu VND" />
            <InfoBlock label="FYC 12T vừa qua" value={formatNum(tvv.mdrt2027_fyc12m)} color="#f72585" sub="triệu VND" />
            <InfoBlock label="TLDT Phí Tái Tục" value={fmtPct(tvv.mdrt2027_tldtptt)} color="#7209b7" />
            <InfoBlock label="MDRT OT Tạm Đạt" value={tvv.mdrt2027_tamDat || '—'} color="#06d6a0" />
            <InfoBlock label="FYP cần - QUÝ 1" value={formatNum(tvv.mdrt2027_q1)} color="#ef476f" sub="triệu VND" />
            <InfoBlock label="FYP cần - QUÝ 2" value={formatNum(tvv.mdrt2027_q2)} color="#ef476f" sub="triệu VND" />
            <InfoBlock label="FYP cần - QUÝ 3" value={formatNum(tvv.mdrt2027_q3)} color="#ef476f" sub="triệu VND" />
            <InfoBlock label="MDRT 2027 (cả năm)" value={formatNum(tvv.mdrt2027_total)} color="#fb8500" sub="triệu VND" />
          </div>

          {/* === C. PRU ELITE === */}
          <div className="section-divider">💎 C. PRU ELITE</div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <InfoBlock label="PE Hiện tại" value={<PEBadge val={tvv.peHienTai} />} />
            <InfoBlock label="PE Dự kiến" value={<PEBadge val={tvv.peDuKien} />} />
            <InfoBlock label="FYC 12T vừa qua" value={formatNum(tvv.pe_fyc12m)} color="#4361ee" sub="triệu VND" />
            <InfoBlock label="TLDT Phí Tái Tục" value={fmtPct(tvv.pe_tldtptt)} color="#7209b7" />
          </div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="info-block">
              <div className="info-block-label">Hoạt động T1</div>
              <ActCheck val={tvv.act1} />
            </div>
            <div className="info-block">
              <div className="info-block-label">Hoạt động T2</div>
              <ActCheck val={tvv.act2} />
            </div>
            <div className="info-block">
              <div className="info-block-label">Hoạt động T3</div>
              <ActCheck val={tvv.act3} />
            </div>
            <InfoBlock label="Số tháng HĐ" value={formatNum(tvv.tongHd3m)} color="#06d6a0" />
          </div>
          {/* PE chỉ tiêu cần chạy */}
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <InfoBlock label="PE Tạm Đạt (Kim Cương)" value={tvv.pe_tamDatKimCuong || '—'} color="#1e88e5" />
            <InfoBlock label="FYC Cần Thêm" value={formatNum(tvv.pe_fycCanThem)} color="#ef476f" sub="triệu VND" />
            <InfoBlock label="Tháng HĐ Cần Thêm" value={formatNum(tvv.pe_thangCanThem)} color="#ef476f" />
            <InfoBlock label="TLDTPTT Cần Khôi Phục" value={tvv.pe_tldtCanKhoiPhuc || '—'} color="#ef476f" />
          </div>

          {/* === D. THƯỞNG QUÝ CÁ NHÂN === */}
          <div className="section-divider">💰 D. THƯỞNG QUÝ CÁ NHÂN</div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <InfoBlock label="FYC trong quý" value={formatNum(tvv.quy_fyc)} color="#4361ee" sub="triệu VND" />
            <InfoBlock label="SYC trong quý" value={formatNum(tvv.quy_syc)} color="#7209b7" sub="triệu VND" />
            <InfoBlock label="TLDT Phí Tái Tục" value={fmtPct(tvv.quy_tldtptt)} color="#7209b7" />
            <InfoBlock label="Mức Hỗ Trợ" value={tvv.quy_mucHoTro || '—'} color="#fb8500" />
            <InfoBlock label="Mức Chi Trả" value={tvv.quy_mucChiTra || '—'} color="#06d6a0" />
            <InfoBlock label="Tiền Thưởng Tạm Tính" value={formatNum(tvv.quy_tienThuong)} color="#f72585" sub="triệu VND" />
            <InfoBlock label="FYC Cần Thêm" value={formatNum(tvv.quy_fycCanThem)} color="#ef476f" sub="triệu VND" />
            <InfoBlock label="TLDTPTT Nâng Cao Hơn" value={fmtPct(tvv.quy_tldtNangCao)} color="#7209b7" />
          </div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <InfoBlock label="Mức Chi Trả Cao Hơn" value={tvv.quy_chiTraCaoHon || '—'} color="#06d6a0" />
            <InfoBlock label="Tiền Thưởng Mức Cao Hơn" value={formatNum(tvv.quy_thuongCaoHon)} color="#f72585" sub="triệu VND" />
          </div>

          {/* === E. STAR CLUB 2026 === */}
          <div className="section-divider">⭐ E. STAR CLUB 2026</div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <InfoBlock label="Số HĐ (Star Club)" value={formatNum(tvv.sc_soHd)} color="#4361ee" />
            <InfoBlock label="Tổng IP" value={tvv.sc_tongIp ? Number(tvv.sc_tongIp).toLocaleString('vi-VN') : '—'} color="#fb8500" sub="VND" />
            <InfoBlock label="TLDT Phí Tái Tục" value={tvv.sc_tldtptt != null ? (tvv.sc_tldtptt > 1 ? tvv.sc_tldtptt.toFixed(2) + '%' : (tvv.sc_tldtptt * 100).toFixed(2) + '%') : '—'} color="#7209b7" />
            <InfoBlock label="TLDTHD" value={tvv.sc_tldthd != null ? (tvv.sc_tldthd > 1 ? tvv.sc_tldthd.toFixed(2) + '%' : (tvv.sc_tldthd * 100).toFixed(2) + '%') : '—'} color="#7209b7" />
            <InfoBlock label="Tạm Thỏa Điều Kiện" value={tvv.sc_tamThoa || '—'} color="#06d6a0" />
            <InfoBlock label="Tạm Đạt Vé" value={tvv.sc_tamDatVe || '—'} color="#06d6a0" />
            <InfoBlock label="Vé Star Club" value={tvv.sc_ve || '—'} color="#ffd166" />
          </div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <InfoBlock label="HĐ Cần Thêm" value={formatNum(tvv.sc_hdCanThem)} color="#ef476f" />
            <InfoBlock label="Tổng IP Cần Thêm" value={tvv.sc_ipCanThem ? Number(tvv.sc_ipCanThem).toLocaleString('vi-VN') : '—'} color="#ef476f" sub="VND" />
            <InfoBlock label="TLDTPTT Cần Khôi Phục" value={tvv.sc_tldtCanThem || '—'} color="#ef476f" />
          </div>
        </div>
      </div>
    </div>
  )
}
