import * as XLSX from 'xlsx'

function fmt(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  return Math.round(n * 10) / 10
}
function fmtInt(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return 0
  return Math.round(n)
}
function fmtDate(val) {
  if (!val) return null
  if (val instanceof Date) return val.toLocaleDateString('vi-VN')
  const s = String(val)
  if (s.includes('T')) return s.split('T')[0]
  return s
}

export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        resolve(extractData(wb))
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function extractData(wb) {
  const result = {}

  // ===== TẤT CẢ SHEET THÁNG X → Dashboard KPIs + monthly per-agent =====
  // Đọc tất cả sheet có tên "Tháng N" (1-12), lấy sheet mới nhất cho KPI
  const agentMonthly = {}

  // Helper: parse 1 sheet tháng, trả về { headers, allRows, d03rows, C, sheetMonth }
  function parseMonthSheet(wsName) {
    const ws = wb.Sheets[wsName]
    if (!ws) return null
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    // Tháng 5 có extra row 0 (số thứ tự cột), Tháng 6+ header ở row 0
    // Detect: if row[0][0] là số (1,2,3...) → header ở row[1], data từ row[2]
    //         nếu row[0][0] là string 'YearMonth' → header ở row[0], data từ row[1]
    let headerRow, dataStart
    if (raw[0] && String(raw[0][0]).match(/^\d+$/)) {
      headerRow = raw[1] || []; dataStart = 2
    } else {
      headerRow = raw[0] || []; dataStart = 1
    }
    const allRows = raw.slice(dataStart)
    const d03rows = allRows.filter(r => r[11] === 'D03')
    const col = (name) => headerRow.indexOf(name)
    const C = {
      AGCODE: col('AGCode'), AGNAME: col('AGName'), AGLEVEL: col('AGLevel'),
      BRANCH: col('BranchCode'), UNIT: col('UnitCode'),
      NET_MP: col('Net Manpower'), FYC: col('FYC'), FYP: col('FYP'),
      APE_NET: col('APE Net'), IP_NET: col('IP Net'), CASE_NET: col('Case Net'),
      FYC_YTD: col('FYC YTD'), IP_YTD: col('IP Net YTD'), APE_YTD: col('APE Net YTD'),
      FYP_YTD: col('FYP YTD'), SYC: col('SYC'), RYC: col('RYC'),
      ACT_FYC: col('Active Net (FYC)'), ACT_CASE: col('Active Net (Case)'),
      MDRT: col('MDRT Title'), TLDTPTT: col('TLDTPTT'),
      FYC_L12M: col('FYC L12M'), APE_SUB: col('APE Sub'),
      MONTH: col('YearMonth'),
    }
    // Detect sheet month number from name "Tháng N"
    const mNum = parseInt(wsName.replace(/[^0-9]/g, ''))
    return { C, d03rows, allRows, mNum }
  }

  // Collect all Tháng sheets sorted by month number
  const thangSheets = wb.SheetNames
    .filter(n => /^Tháng\s*\d+$/i.test(n))
    .sort((a, b) => {
      const ma = parseInt(a.replace(/[^0-9]/g, ''))
      const mb = parseInt(b.replace(/[^0-9]/g, ''))
      return ma - mb
    })

  // Latest sheet → KPIs & top agents
  const latestSheetName = thangSheets[thangSheets.length - 1]
  const latestSheet = latestSheetName ? parseMonthSheet(latestSheetName) : null

  if (latestSheet) {
    const { C, d03rows } = latestSheet
    const sum = (ci) => d03rows.reduce((acc, r) => acc + (parseFloat(r[ci]) || 0), 0)

    result.kpis = {
      netManpower: fmtInt(sum(C.NET_MP)),
      fycThang:    fmt(sum(C.FYC)),
      fypThang:    fmt(sum(C.FYP)),
      apeNet:      fmt(sum(C.APE_NET)),
      ipNet:       fmtInt(sum(C.IP_NET)),
      caseNet:     fmtInt(sum(C.CASE_NET)),
      fycYtd:      fmt(sum(C.FYC_YTD)),
      ipNetYtd:    fmt(sum(C.IP_YTD)),
      apeNetYtd:   fmt(sum(C.APE_YTD)),
      fypYtd:      fmt(sum(C.FYP_YTD)),
      syc:         fmt(sum(C.SYC)),
      ryc:         fmt(sum(C.RYC)),
      tongDaiLy:   d03rows.length,
      activeFyc:   fmtInt(sum(C.ACT_FYC)),
      activeCase:  fmtInt(sum(C.ACT_CASE)),
      mdrt:        d03rows.filter(r => r[C.MDRT] && r[C.MDRT] !== 'Not MDRT').length,
      dataMonth:   latestSheet.mNum,  // tháng mấy
    }

    const agentMap = {}
    d03rows.forEach(r => {
      const code = String(r[C.AGCODE] || '').trim()
      if (!code) return
      if (!agentMap[code]) agentMap[code] = {
        code, name: r[C.AGNAME], level: r[C.AGLEVEL], branch: r[C.BRANCH],
        fyc: 0, fyp: 0, ape: 0, ipNet: 0, caseNet: 0, syc: 0
      }
      agentMap[code].fyc    += parseFloat(r[C.FYC])    || 0
      agentMap[code].fyp    += parseFloat(r[C.FYP])    || 0
      agentMap[code].ipNet  += parseFloat(r[C.IP_NET]) || 0
      agentMap[code].ape    += parseFloat(r[C.APE_NET])|| 0
      agentMap[code].caseNet+= parseFloat(r[C.CASE_NET])|| 0
      agentMap[code].syc    += parseFloat(r[C.SYC])    || 0
    })
    result.topAgents = Object.values(agentMap)
      .sort((a, b) => b.fyp - a.fyp).slice(0, 11)
      .map(a => ({ ...a, fyc: fmt(a.fyc), fyp: fmt(a.fyp), ape: fmt(a.ape),
                          ipNet: fmt(a.ipNet), caseNet: fmt(a.caseNet), syc: fmt(a.syc) }))

    result.levelDist = Object.entries(
      d03rows.reduce((acc, r) => {
        const lv = r[C.AGLEVEL] || 'Other'
        acc[lv] = (acc[lv] || 0) + 1
        return acc
      }, {})
    ).map(([name, value]) => ({ name, value }))

    result.officeData = [{
      vanPhong: 'GA710 - Quận 3',
      netMp: fmtInt(sum(C.NET_MP)), fyc: fmt(sum(C.FYC)),
      apeNet: fmt(sum(C.APE_NET)), caseNet: fmtInt(sum(C.CASE_NET))
    }]
  }

  // All Tháng sheets → per-agent monthly history
  const monthLabel = (ym) => {
    if (!ym) return null
    const m = parseInt(String(ym).slice(4))
    return isNaN(m) ? null : `T${m}`
  }

  thangSheets.forEach(wsName => {
    const parsed = parseMonthSheet(wsName)
    if (!parsed) return
    const { C, allRows } = parsed
    allRows.filter(r => r[11] === 'D03').forEach(r => {
      const code = String(r[C.AGCODE] || '').trim()
      if (!code) return
      const mLabel = monthLabel(r[C.MONTH])
      if (!mLabel) return
      if (!agentMonthly[code]) agentMonthly[code] = {}
      if (!agentMonthly[code][mLabel]) {
        agentMonthly[code][mLabel] = {
          month: mLabel, hd: 0, ip: 0, fyp: 0, fyc: 0, syc: 0,
          act: false, fycL12m: 0, hdYtd: 0, fycYtd: 0, fypYtd: 0, ipYtd: 0
        }
      }
      const m = agentMonthly[code][mLabel]
      m.hd   += parseFloat(r[C.IP_NET])  || 0
      m.ip   += parseFloat(r[C.APE_SUB]) || 0
      m.fyp  += parseFloat(r[C.FYP])     || 0
      m.fyc  += parseFloat(r[C.FYC])     || 0
      m.syc  += parseFloat(r[C.SYC])     || 0
      if (parseFloat(r[C.ACT_FYC]) > 0) m.act = true
      m.fycL12m = parseFloat(r[C.FYC_L12M]) || m.fycL12m
      m.hdYtd   = parseFloat(r[C.IP_YTD])   || m.hdYtd
      m.fycYtd  = parseFloat(r[C.FYC_YTD])  || m.fycYtd
      m.fypYtd  = parseFloat(r[C.FYP_YTD])  || m.fypYtd
      m.ipYtd   = parseFloat(r[C.APE_YTD])  || m.ipYtd
    })
  })

  // ===== GA data → GA tab =====
  if (wb.SheetNames.includes('GA data')) {
    const ws = wb.Sheets['GA data']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    result.gaData = {
      fyp2026: months.map((m, i) => ({ month: m, achieved: fmt((raw[4]||[])[4+i]), plan: fmt((raw[3]||[])[4+i]) })),
      act2026: months.map((m, i) => ({ month: m, value: fmt((raw[6]||[])[4+i]) })),
      mp2026: months.map((m, i) => ({ month: m, value: fmt((raw[13]||[])[4+i]) })),
      tldtptt: months.map((m, i) => ({ month: m, value: fmt((raw[14]||[])[4+i]) })),
      totalFypYtd: fmt((raw[4]||[])[16]),
      totalFypPlan: fmt((raw[3]||[])[16]),
      totalAct: fmt((raw[6]||[])[16]),
    }
  }

  // ===== UM-OFF sheet =====
  if (wb.SheetNames.includes('UM-OFF')) {
    const ws = wb.Sheets['UM-OFF']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const rows = raw.slice(3).filter(r => r[0] !== null && r[0] !== undefined && r[0] !== '' && !isNaN(parseFloat(r[0])))
    result.umList = rows.map(r => ({
      stt: fmtInt(r[0]), off: r[1], bm: r[2], unit: r[3],
      leaderCode: String(r[4] || '').trim(),
      leaderName: r[5], agType: r[6], appDate: fmtDate(r[7]),
      phone: String(r[8] || ''),
      pcHienTai: r[9], fycPhongTT: fmt(r[10]),
      tvvmcl: fmt(r[11]), tvvmclGen1_50pct: fmt(r[12]),
      tongTvvmclGen1: fmt(r[13]), tldtptt: fmt(r[14]),
      pcTamDat: r[15], pcDuKien: r[16],
      fycCanThem: fmt(r[18]), tvvMoiCl: fmt(r[19]),
      tongFyc: fmt(r[21]), tongTvvAct: fmt(r[22]),
      mucHoTro: r[24], mucChiTra: r[25],
      tienThuong: fmt(r[26]), fycTangMucThuong: fmt(r[27]),
      luotActCanThem: fmt(r[28]), thuongTangThem: fmt(r[30]),
      // UM MOC columns
      moc_fyc6thang: fmt(r[32]), moc_luotTvvAct: fmt(r[33]),
      moc_tvvMoiCl: fmt(r[34]), moc_tongLuot: fmt(r[35]),
      moc_tldtptt: fmt(r[36]), moc_tamDat: r[37],
      moc_fycCanThem: fmt(r[38]), moc_luotCanThem: fmt(r[39]),
      moc_tldtCanThem: r[40],
      // Star Club nhóm
      luotTvvHdTb: fmt(r[42]), tongIp: r[43],
      tamThoaDK: r[44], veThamDu: r[45],
    }))
  }

  // ===== AG-PE sheet → TVV list =====
  // Column mapping (row 4 = header, data starts row 5)
  const COL = {
    NO: 0, OFFICE: 1, BAN: 2, UNIT: 3, MSDL: 4, AGNAME: 5,
    APPDATE: 7, PHONE: 8, MDRT2026: 9,
    // A. PRU ELITE
    PE_HIENTAI: 10,       // PE HIỆN TẠI
    FYC_12M: 11,          // FYC trong 12 tháng vừa qua
    ACT1: 12,             // Hoạt động tháng thứ 1
    ACT2: 13,             // Hoạt động tháng thứ 2
    ACT3: 14,             // Hoạt động tháng thứ 3
    TONGHD3M: 15,         // Tổng số HĐ 3 tháng vừa qua
    TLDTPTT: 16,          // TLDTPTT
    KQ_TAMTINH: 17,       // Kết quả tạm tính
    PE_DUKIEN: 18,        // PE dự kiến
    NANG_TLDTPTT: 19,     // Nâng TLDTPTT (cần khôi phục)
    PE_FYC_CANTHEM: 20,   // FYC cần thêm (PE)
    PE_THANG_CANTHEM: 21, // Số tháng Act/Quý cần thêm
    // B. THƯỞNG QUÝ CÁ NHÂN
    FYC_QUY: 23,          // FYC trong quý
    SYC_QUY: 24,          // SYC trong quý
    TLDTPTT_QUY: 25,      // TLDTPTT (thưởng quý)
    MUC_HO_TRO: 26,       // Mức hỗ trợ
    MUC_CHI_TRA: 27,      // Mức chi trả
    THUONG_TAMTINH: 28,   // Thưởng tạm tính
    FYC_TANG_MUC: 29,     // FYC cần để tăng mức thưởng
    THUONG_TANGTHER: 30,  // Thưởng dự kiến tăng thêm
    // C. MDRT 2027
    FYP_2026: 32,         // FYP 2026 (lũy kế)
    FYP_CAN_MDRT: 33,     // FYP cần MDRT
    FYP_CAN_COT: 34,      // FYP cần COT
    FYP_CAN_TOT: 35,      // FYP cần TOT
    MDRT_OT_Q3: 36,       // MDRT OT Quý 3
    MDRT_OT_Q2: 37,       // MDRT OT Quý 2
    MDRT_OT_Q1: 38,       // MDRT OT Quý 1
    MDRT_DA_DAT: 39,      // Đã đạt
    // UM Promotion (skip 41-44)
    // D. STAR CLUB
    SC_SLHD: 45,          // SLHĐ còn hiệu lực
    SC_TLDTPTT: 46,       // TLDTPTT (Star Club promotion)
    SC_TAMDAT: 47,        // Tạm Đạt (promotion)
    SC_HS: 49,            // HS nộp và phát hành
    SC_TLDTPTT2: 50,      // TLDTPTT (Star Club chính)
    SC_TLDTHD: 51,        // TLDTHD
    SC_TONG_IP: 52,       // Tổng IP
    SC_TAM_THOA: 53,      // Tạm thỏa điều kiện đạt vé
    SC_SO_VE: 54,         // Số Vé Tạm Đạt
    SC_VE: 55,            // Vé Tham Dự Tạm Đạt
    // MDRT 2027 summary
    MDRT2027_LEVEL: 59,   // MDRT 2027 level (MDRT/COT/TOT)
    MDRT2027_FYP_CHI_TIEU: 61,  // CHỈ TIÊU FYP
    MDRT2027_FYC_CHI_TIEU: 62,  // CHỈ TIÊU FYC
    MDRT2027_INCOME_CHI_TIEU: 63, // CHỈ TIÊU INCOME
  }

  if (wb.SheetNames.includes('AG-PE')) {
    const ws = wb.Sheets['AG-PE']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    // data rows start at row index 5 (0-based)
    const rows = raw.slice(5).filter(r => r[COL.NO] !== null && r[COL.NO] !== undefined && !isNaN(parseFloat(r[COL.NO])))

    result.agList = rows.map(r => {
      const code = String(r[COL.MSDL] || '').trim()
      // Get monthly data from Tháng 5
      const monthly = agentMonthly[code]
        ? Object.values(agentMonthly[code]).sort((a, b) => {
            const mA = parseInt(a.month.replace('T',''))
            const mB = parseInt(b.month.replace('T',''))
            return mA - mB
          }).map(m => ({
            ...m,
            hd: fmt(m.hd), ip: fmt(m.ip), fyp: fmt(m.fyp), fyc: fmt(m.fyc), syc: fmt(m.syc),
            fycL12m: fmt(m.fycL12m), hdYtd: fmt(m.hdYtd), fycYtd: fmt(m.fycYtd),
            fypYtd: fmt(m.fypYtd), ipYtd: fmt(m.ipYtd)
          }))
        : []

      return {
        no: fmtInt(r[COL.NO]),
        office: r[COL.OFFICE], ban: r[COL.BAN], unit: r[COL.UNIT],
        msddl: code,
        agentName: r[COL.AGNAME],
        appDate: fmtDate(r[COL.APPDATE]),
        phone: String(r[COL.PHONE] || '—'),
        mdrt: r[COL.MDRT2026],

        // A. PRU ELITE
        peHienTai: r[COL.PE_HIENTAI],
        fyc12m: fmt(r[COL.FYC_12M]),
        act1: r[COL.ACT1], act2: r[COL.ACT2], act3: r[COL.ACT3],
        tongHd3m: fmt(r[COL.TONGHD3M]),
        tldtptt: fmt(r[COL.TLDTPTT]),
        ketQuaTamTinh: r[COL.KQ_TAMTINH],
        peDuKien: r[COL.PE_DUKIEN],
        pe_nangTldtptt: r[COL.NANG_TLDTPTT],
        pe_fycCanThem: fmt(r[COL.PE_FYC_CANTHEM]),
        pe_thangCanThem: fmt(r[COL.PE_THANG_CANTHEM]),

        // B. THƯỞNG QUÝ
        fyc: fmt(r[COL.FYC_QUY]),
        syc: fmt(r[COL.SYC_QUY]),
        quy_tldtptt: fmt(r[COL.TLDTPTT_QUY]),
        mucHoTro: r[COL.MUC_HO_TRO],
        mucChiTra: r[COL.MUC_CHI_TRA],
        thuongTamTinh: fmt(r[COL.THUONG_TAMTINH]),
        fycCanThem: fmt(r[COL.FYC_TANG_MUC]),
        quy_thuongTangThem: fmt(r[COL.THUONG_TANGTHER]),

        // C. MDRT 2027
        fypYtd: fmt(r[COL.FYP_2026]),
        mdrt_fypCanMdrt: fmt(r[COL.FYP_CAN_MDRT]),
        mdrt_fypCanCot: fmt(r[COL.FYP_CAN_COT]),
        mdrt_fypCanTot: fmt(r[COL.FYP_CAN_TOT]),
        mdrt_otQ3: r[COL.MDRT_OT_Q3],
        mdrt_otQ2: r[COL.MDRT_OT_Q2],
        mdrt_otQ1: r[COL.MDRT_OT_Q1],
        mdrt_daDat: r[COL.MDRT_DA_DAT],
        mdrt2027_level: r[COL.MDRT2027_LEVEL],
        mdrt2027_fypChiTieu: r[COL.MDRT2027_FYP_CHI_TIEU],
        mdrt2027_fycChiTieu: r[COL.MDRT2027_FYC_CHI_TIEU],
        mdrt2027_incomeChiTieu: r[COL.MDRT2027_INCOME_CHI_TIEU],

        // D. STAR CLUB
        sc_slhd: fmt(r[COL.SC_SLHD]),
        sc_tldtpttPromo: fmt(r[COL.SC_TLDTPTT]),
        sc_tamDatPromo: r[COL.SC_TAMDAT],
        sc_hs: fmt(r[COL.SC_HS]),
        sc_tldtptt: fmt(r[COL.SC_TLDTPTT2]),
        sc_tldthd: fmt(r[COL.SC_TLDTHD]),
        sc_tongIp: r[COL.SC_TONG_IP],
        sc_tamThoa: r[COL.SC_TAM_THOA],
        sc_soVe: fmt(r[COL.SC_SO_VE]),
        sc_ve: r[COL.SC_VE],

        // Monthly KQ from Tháng 5
        monthly,
      }
    })
  }

  return result
}

export function formatNum(val) {
  if (val === null || val === undefined) return '-'
  const n = parseFloat(val)
  if (isNaN(n)) return '-'
  const rounded = Math.round(n * 10) / 10
  return rounded === Math.round(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
}

export function formatBig(val) {
  if (val === null || val === undefined) return '-'
  const n = parseFloat(val)
  if (isNaN(n)) return '-'
  if (Math.abs(n) >= 1000) return (Math.round(n / 10) / 100).toFixed(1) + 'T'
  return formatNum(n)
}
