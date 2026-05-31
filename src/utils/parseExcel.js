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

  // ===== THÁNG 5 → Dashboard KPIs =====
  if (wb.SheetNames.includes('Tháng 5')) {
    const ws = wb.Sheets['Tháng 5']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const headers = raw[1] || []
    const rows = raw.slice(2).filter(r => r[11] === 'D03')
    const col = (name) => headers.indexOf(name)
    const sum = (c) => rows.reduce((acc, r) => acc + (parseFloat(r[c]) || 0), 0)

    const C = {
      NET_MP: col('Net Manpower'), FYC: col('FYC'), FYP: col('FYP'),
      APE_NET: col('APE Net'), IP_NET: col('IP Net'), CASE_NET: col('Case Net'),
      FYC_YTD: col('FYC YTD'), IP_YTD: col('IP Net YTD'), APE_YTD: col('APE Net YTD'),
      FYP_YTD: col('FYP YTD'), SYC: col('SYC'), RYC: col('RYC'),
      ACT_FYC: col('Active Net (FYC)'), ACT_CASE: col('Active Net (Case)'),
      AG_LEVEL: col('AGLevel'), AG_CODE: col('AGCode'), AG_NAME: col('AGName'),
      BRANCH: col('BranchCode'), MDRT: col('MDRT Title'),
    }

    result.kpis = {
      netManpower: fmtInt(sum(C.NET_MP)),
      fycThang: fmt(sum(C.FYC)),
      fypThang: fmt(sum(C.FYP)),
      apeNet: fmt(sum(C.APE_NET)),
      ipNet: fmtInt(sum(C.IP_NET)),
      caseNet: fmtInt(sum(C.CASE_NET)),
      fycYtd: fmt(sum(C.FYC_YTD)),
      ipNetYtd: fmt(sum(C.IP_YTD)),
      apeNetYtd: fmt(sum(C.APE_YTD)),
      fypYtd: fmt(sum(C.FYP_YTD)),
      syc: fmt(sum(C.SYC)),
      ryc: fmt(sum(C.RYC)),
      tongDaiLy: rows.length,
      activeFyc: fmtInt(sum(C.ACT_FYC)),
      activeCase: fmtInt(sum(C.ACT_CASE)),
      mdrt: rows.filter(r => r[C.MDRT] && r[C.MDRT] !== '').length,
    }

    const agentMap = {}
    rows.forEach(r => {
      const code = r[C.AG_CODE]
      if (!code) return
      if (!agentMap[code]) {
        agentMap[code] = { code, name: r[C.AG_NAME], level: r[C.AG_LEVEL], branch: r[C.BRANCH], fyc: 0, ape: 0, caseNet: 0, syc: 0 }
      }
      agentMap[code].fyc += parseFloat(r[C.FYC]) || 0
      agentMap[code].ape += parseFloat(r[C.APE_NET]) || 0
      agentMap[code].caseNet += parseFloat(r[C.CASE_NET]) || 0
      agentMap[code].syc += parseFloat(r[C.SYC]) || 0
    })
    result.topAgents = Object.values(agentMap)
      .sort((a, b) => b.fyc - a.fyc).slice(0, 11)
      .map(a => ({ ...a, fyc: fmt(a.fyc), ape: fmt(a.ape), caseNet: fmt(a.caseNet), syc: fmt(a.syc) }))

    result.levelDist = Object.entries(
      rows.reduce((acc, r) => { const lv = r[C.AG_LEVEL] || 'Other'; acc[lv] = (acc[lv] || 0) + 1; return acc }, {})
    ).map(([name, value]) => ({ name, value }))

    result.officeData = [{
      vanPhong: 'GA710 - Quận 3',
      netMp: fmtInt(sum(C.NET_MP)), fyc: fmt(sum(C.FYC)),
      apeNet: fmt(sum(C.APE_NET)), caseNet: fmtInt(sum(C.CASE_NET))
    }]
  }

  // ===== GA data → GA tab =====
  if (wb.SheetNames.includes('GA data')) {
    const ws = wb.Sheets['GA data']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const fypAchRow = raw[4] || []
    const fypPlanRow = raw[3] || []
    const actRow = raw[6] || []
    const mpRow = raw[13] || []
    const tldtRow = raw[14] || []

    result.gaData = {
      fyp2026: months.map((m, i) => ({ month: m, achieved: fmt(fypAchRow[4+i]), plan: fmt(fypPlanRow[4+i]) })),
      act2026: months.map((m, i) => ({ month: m, value: fmt(actRow[4+i]) })),
      mp2026: months.map((m, i) => ({ month: m, value: fmt(mpRow[4+i]) })),
      // TLDTPTT values are already decimal ratios (0-1)
      tldtptt: months.map((m, i) => ({ month: m, value: fmt(tldtRow[4+i]) })),
      totalFypYtd: fmt(fypAchRow[16]),
      totalFypPlan: fmt(fypPlanRow[16]),
      totalAct: fmt(actRow[16]),
    }
  }

  // ===== UM-OFF sheet =====
  if (wb.SheetNames.includes('UM-OFF')) {
    const ws = wb.Sheets['UM-OFF']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const rows = raw.slice(3).filter(r => {
      const stt = r[0]
      return stt !== null && stt !== undefined && stt !== '' && !isNaN(parseFloat(stt))
    })

    result.umList = rows.map(r => ({
      stt: fmtInt(r[0]),
      off: r[1], bm: r[2], unit: r[3],
      leaderCode: String(r[4] || '').trim(),
      leaderName: r[5], agType: r[6], appDate: r[7],
      phone: String(r[8] || ''),
      pcHienTai: r[9],
      fycPhongTT: fmt(r[10]),
      tvvmcl: fmt(r[11]),
      tvvmclGen1_50pct: fmt(r[12]),
      tongTvvmclGen1: fmt(r[13]),
      tldtptt: fmt(r[14]),
      pcTamDat: r[15],
      pcDuKien: r[16],
      fycCanThem: fmt(r[18]),
      tvvMoiCl: fmt(r[19]),
      tongFyc: fmt(r[21]),
      tongTvvAct: fmt(r[22]),
      mucHoTro: r[24],
      mucChiTra: r[25],
      tienThuong: fmt(r[26]),
      fycTangMucThuong: fmt(r[27]),
      luotActCanThem: fmt(r[28]),
      thuongTangThem: fmt(r[30]),
      // UM MOC columns (32-40)
      moc_fyc6thang: fmt(r[32]),
      moc_luotTvvAct: fmt(r[33]),
      moc_tvvMoiCl: fmt(r[34]),
      moc_tongLuot: fmt(r[35]),
      moc_tldtptt: fmt(r[36]),
      moc_tamDat: r[37],
      moc_fycCanThem: fmt(r[38]),
      moc_luotCanThem: fmt(r[39]),
      moc_tldtCanThem: r[40],
      // Star Club
      luotTvvHdTb: fmt(r[42]),
      tongIp: r[43],
      tamThoaDK: r[44],
      veThamDu: r[45],
    }))
  }

  // ===== AG-PE sheet =====
  if (wb.SheetNames.includes('AG-PE')) {
    const ws = wb.Sheets['AG-PE']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    const rows = raw.slice(5).filter(r => r[0] !== null && r[0] !== undefined && !isNaN(parseFloat(r[0])))

    result.agList = rows.map(r => ({
      no: fmtInt(r[0]),
      office: r[1], ban: r[2], unit: r[3],
      msddl: String(r[4] || '').trim(),
      agentName: r[5],
      appDate: r[7],
      phone: String(r[8] || ''),
      mdrt: r[9],
      peHienTai: r[10],
      fyc12m: fmt(r[11]),
      act1: r[12], act2: r[13], act3: r[14],
      tongHd3m: fmt(r[15]),
      tldtptt: fmt(r[16]),
      ketQuaTamTinh: r[17],
      peDuKien: r[18],
      fyc: fmt(r[23]),
      syc: fmt(r[24]),
      tldtptt2: fmt(r[25]),
      mucHoTro: r[26],
      mucChiTra: r[27],
      thuongTamTinh: fmt(r[28]),
      fycCanThem: fmt(r[29]),
      // MDRT 2027 fields
      fypYtd: fmt(r[32]),
      mdrt_fypCanMdrt: fmt(r[33]),
      mdrt_fypCanCot: fmt(r[34]),
      mdrt_fypCanTot: fmt(r[35]),
      mdrt_otQ3: r[36], mdrt_otQ2: r[37], mdrt_otQ1: r[38],
      mdrt_daDat: r[39],
      // Star Club
      sc_soHd: fmt(r[45]),        // SLHĐ còn hiệu lực
      sc_tldtptt: fmt(r[46]),     // TLDTPTT.2
      sc_tamDat: r[47],           // Tạm Đạt
      sc_hsNopPhatHanh: fmt(r[49]), // HS nộp và phát hành
      sc_tldtptt3: fmt(r[50]),    // TLDTPTT.3
      sc_tldthd: fmt(r[51]),      // TLDTHD
      sc_tongIp: r[52],           // Tổng IP
      sc_tamThoa: r[53],          // Tạm thỏa điều kiện đạt vé
      sc_soVe: fmt(r[54]),        // Số Vé Tạm Đạt
      sc_ve: r[55],               // Vé Tham Dự Tạm Đạt
    }))
  }

  // ===== 121 AG sheet → TVV detail per agent =====
  // This sheet is a template for 1 agent; we parse its layout to enrich agList
  if (wb.SheetNames.includes('121 AG') && result.agList) {
    const ws = wb.Sheets['121 AG']
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
    // Parse the template agent code from row 4, col 2
    const templateCode = String(raw[4]?.[2] || '').trim()

    // Parse monthly business data: rows 8-19, cols 1-11
    // Row structure: [null, month, hd_month, ip_month, fyp_month, fyc_month, act, fycL12m, hd_ytd, fyc_ytd, fyp_ytd, ip_ytd]
    const parseMonthly = (raw) => {
      const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
      return months.map((m, idx) => {
        const row = raw[8 + idx] || []
        return {
          month: m,
          hd: fmt(row[2]),
          ip: fmt(row[3]),
          fyp: fmt(row[4]),
          fyc: fmt(row[5]),
          act: row[6] && String(row[6]).includes('ü'),
          fycL12m: fmt(row[7]),
          hdYtd: fmt(row[8]),
          fycYtd: fmt(row[9]),
          fypYtd: fmt(row[10]),
          ipYtd: fmt(row[11]),
        }
      }).filter(m => m.hd !== null || m.fyc !== null || m.fyp !== null)
    }

    // MDRT 2027: row 23
    // [null, fyp12m, null, fyc12m, income12m, tamDat, tldtptt, tldtCanKP, q1, q2, q3, total2027]
    const mdrtRow = raw[23] || []

    // PRU ELITE: row 27
    // [null, fyc12m, null, act1, act2, act3, soThangHd, tldtptt, peKimCuong(tamDat), fycCanThem, thangCanThem, tldtCanKP, bachKim]
    const peRow = raw[27] || []

    // THƯỞNG QUÝ: row 31
    // [null, fycQuy, null, sycQuy, tldtptt, mucHoTro, mucChiTra, tienThuong, fycCanThem, tldtNangCao, chiTraCaoHon, thuongCaoHon]
    const quyRow = raw[31] || []

    // STAR CLUB: row 39
    // [null, soHd, tongIp, tldtptt, tldthd, tamThoa, tamDatVe, hdCanThem, ipCanThem, tldtCanThem, tldtHdCanThem, ve]
    const scRow = raw[39] || []

    // Enrich the agent matching templateCode in agList
    const agSeg = raw[4]?.[7] // AG SEG col
    const phone = raw[4]?.[10]

    const monthly = parseMonthly(raw)

    // Attach to matching agent
    if (result.agList) {
      result.agList = result.agList.map(ag => {
        if (ag.msddl === templateCode) {
          return {
            ...ag,
            agSeg: agSeg || ag.agSeg,
            phone: phone || ag.phone,
            monthly,
            mdrt2027_fyp12m: fmt(mdrtRow[1]),
            mdrt2027_fyc12m: fmt(mdrtRow[3]),
            mdrt2027_tldtptt: fmt(mdrtRow[5]),
            mdrt2027_tamDat: mdrtRow[6],
            mdrt2027_q1: fmt(mdrtRow[7]),
            mdrt2027_q2: fmt(mdrtRow[8]),
            mdrt2027_q3: fmt(mdrtRow[9]),
            mdrt2027_total: fmt(mdrtRow[10]),
            pe_fyc12m: fmt(peRow[1]),
            pe_tldtptt: fmt(peRow[7]),
            pe_tamDatKimCuong: peRow[8],
            pe_fycCanThem: fmt(peRow[9]),
            pe_thangCanThem: fmt(peRow[10]),
            pe_tldtCanKhoiPhuc: peRow[11],
            quy_fyc: fmt(quyRow[1]),
            quy_syc: fmt(quyRow[3]),
            quy_tldtptt: fmt(quyRow[4]),
            quy_mucHoTro: quyRow[5],
            quy_mucChiTra: quyRow[6],
            quy_tienThuong: fmt(quyRow[7]),
            quy_fycCanThem: fmt(quyRow[8]),
            quy_tldtNangCao: fmt(quyRow[9]),
            quy_chiTraCaoHon: quyRow[10],
            quy_thuongCaoHon: fmt(quyRow[11]),
            sc_soHd: fmt(scRow[1]),
            sc_tongIp: scRow[2],
            sc_tldtptt: fmt(scRow[3]),
            sc_tldthd: fmt(scRow[4]),
            sc_tamThoa: scRow[5],
            sc_tamDatVe: scRow[6],
            sc_hdCanThem: fmt(scRow[7]),
            sc_ipCanThem: scRow[8],
            sc_tldtCanThem: scRow[9],
            sc_ve: scRow[11],
          }
        }
        return ag
      })
    }
  }

  return result
}

export function formatNum(val) {
  if (val === null || val === undefined) return '-'
  const n = parseFloat(val)
  if (isNaN(n)) return '-'
  const rounded = Math.round(n * 10) / 10
  if (rounded === Math.round(rounded)) return rounded.toFixed(0)
  return rounded.toFixed(1)
}

export function formatBig(val) {
  if (val === null || val === undefined) return '-'
  const n = parseFloat(val)
  if (isNaN(n)) return '-'
  if (n >= 1000) return (Math.round(n / 10) / 100).toFixed(1) + 'T'
  return formatNum(n)
}
