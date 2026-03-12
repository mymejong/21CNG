import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './' }))

// ==================== 대시보드 ====================
app.get('/api/dashboard', async (c) => {
  const { DB } = c.env
  try {
    const [sitesRes, hazardsRes, incidentsRes, inspectionsRes] = await Promise.all([
      DB.prepare('SELECT COUNT(*) as count FROM sites WHERE status="active"').first<{count:number}>(),
      DB.prepare('SELECT COUNT(*) as count FROM hazards WHERE status NOT IN ("resolved","closed")').first<{count:number}>(),
      DB.prepare('SELECT COUNT(*) as count FROM incidents WHERE status NOT IN ("resolved","closed")').first<{count:number}>(),
      DB.prepare('SELECT COUNT(*) as count FROM inspections WHERE status="pending"').first<{count:number}>(),
    ])

    const criticalHazards = await DB.prepare(
      'SELECT COUNT(*) as count FROM hazards WHERE severity="critical" AND status NOT IN ("resolved","closed")'
    ).first<{count:number}>()

    const recentHazards = await DB.prepare(
      `SELECT h.*, s.name as site_name FROM hazards h 
       JOIN sites s ON h.site_id=s.id 
       ORDER BY h.created_at DESC LIMIT 5`
    ).all()

    const recentIncidents = await DB.prepare(
      `SELECT i.*, s.name as site_name FROM incidents i 
       JOIN sites s ON i.site_id=s.id 
       ORDER BY i.created_at DESC LIMIT 5`
    ).all()

    const hazardsBySeverity = await DB.prepare(
      `SELECT severity, COUNT(*) as count FROM hazards 
       WHERE status NOT IN ("resolved","closed") GROUP BY severity`
    ).all()

    const incidentsByMonth = await DB.prepare(
      `SELECT strftime('%Y-%m', incident_date) as month, COUNT(*) as count 
       FROM incidents GROUP BY month ORDER BY month DESC LIMIT 6`
    ).all()

    return c.json({
      stats: {
        activeSites: sitesRes?.count || 0,
        openHazards: hazardsRes?.count || 0,
        openIncidents: incidentsRes?.count || 0,
        pendingInspections: inspectionsRes?.count || 0,
        criticalHazards: criticalHazards?.count || 0,
      },
      recentHazards: recentHazards.results,
      recentIncidents: recentIncidents.results,
      hazardsBySeverity: hazardsBySeverity.results,
      incidentsByMonth: incidentsByMonth.results,
    })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 현장 API ====================
app.get('/api/sites', async (c) => {
  const { DB } = c.env
  try {
    const result = await DB.prepare('SELECT * FROM sites ORDER BY created_at DESC').all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/sites', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    const result = await DB.prepare(
      `INSERT INTO sites (name, location, manager, start_date, end_date, status, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(body.name, body.location, body.manager, body.start_date, body.end_date || null, body.status || 'active', body.description || null).run()
    return c.json({ id: result.meta.last_row_id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 작업자 API ====================
app.get('/api/workers', async (c) => {
  const { DB } = c.env
  const siteId = c.req.query('site_id')
  const status  = c.req.query('status')
  try {
    let query = `SELECT w.*, s.name as site_name FROM workers w JOIN sites s ON w.site_id=s.id WHERE 1=1`
    const params: any[] = []
    if (siteId) { query += ' AND w.site_id=?'; params.push(siteId) }
    if (status)  { query += ' AND w.status=?';  params.push(status) }
    query += ' ORDER BY w.created_at DESC'
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/workers/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    const result = await DB.prepare(
      'SELECT w.*, s.name as site_name FROM workers w JOIN sites s ON w.site_id=s.id WHERE w.id=?'
    ).bind(id).first()
    if (!result) return c.json({ error: 'Not found' }, 404)
    return c.json(result)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/workers', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    const result = await DB.prepare(
      `INSERT INTO workers (
        site_id, employee_id, name, resident_number, hire_date, age, career_years,
        job_type, company, phone,
        training_expire_date,
        pre_placement_health_check_date,
        special_health_check_date, special_health_check_expire_date,
        general_health_check_date, general_health_check_expire_date,
        safety_edu_reg_no, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      body.site_id,
      body.employee_id,
      body.name,
      body.resident_number || null,
      body.hire_date || null,
      body.age ? Number(body.age) : null,
      body.career_years ? Number(body.career_years) : null,
      body.job_type || null,
      body.company || null,
      body.phone || null,
      body.training_expire_date || null,
      body.pre_placement_health_check_date || null,
      body.special_health_check_date || null,
      body.special_health_check_expire_date || null,
      body.general_health_check_date || null,
      body.general_health_check_expire_date || null,
      body.safety_edu_reg_no || null,
      body.status || 'active'
    ).run()
    return c.json({ id: result.meta.last_row_id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.put('/api/workers/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    await DB.prepare(
      `UPDATE workers SET
        site_id=?, employee_id=?, name=?, resident_number=?, hire_date=?, age=?, career_years=?,
        job_type=?, company=?, phone=?,
        training_expire_date=?,
        pre_placement_health_check_date=?,
        special_health_check_date=?, special_health_check_expire_date=?,
        general_health_check_date=?, general_health_check_expire_date=?,
        safety_edu_reg_no=?, status=?,
        updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).bind(
      body.site_id,
      body.employee_id,
      body.name,
      body.resident_number || null,
      body.hire_date || null,
      body.age ? Number(body.age) : null,
      body.career_years ? Number(body.career_years) : null,
      body.job_type || null,
      body.company || null,
      body.phone || null,
      body.training_expire_date || null,
      body.pre_placement_health_check_date || null,
      body.special_health_check_date || null,
      body.special_health_check_expire_date || null,
      body.general_health_check_date || null,
      body.general_health_check_expire_date || null,
      body.safety_edu_reg_no || null,
      body.status || 'active',
      id
    ).run()
    return c.json({ id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/workers/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    await DB.prepare('DELETE FROM workers WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 위험요소 API ====================
app.get('/api/hazards', async (c) => {
  const { DB } = c.env
  const siteId = c.req.query('site_id')
  const severity = c.req.query('severity')
  const status = c.req.query('status')
  try {
    let query = `SELECT h.*, s.name as site_name FROM hazards h JOIN sites s ON h.site_id=s.id WHERE 1=1`
    const params: any[] = []
    if (siteId) { query += ' AND h.site_id=?'; params.push(siteId) }
    if (severity) { query += ' AND h.severity=?'; params.push(severity) }
    if (status) { query += ' AND h.status=?'; params.push(status) }
    query += ' ORDER BY CASE h.severity WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, h.created_at DESC'
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/hazards/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    const result = await DB.prepare('SELECT h.*, s.name as site_name FROM hazards h JOIN sites s ON h.site_id=s.id WHERE h.id=?').bind(id).first()
    if (!result) return c.json({ error: 'Not found' }, 404)
    return c.json(result)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/hazards', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    const result = await DB.prepare(
      `INSERT INTO hazards (site_id, title, description, location, category, severity, status, reported_by, assigned_to, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(body.site_id, body.title, body.description, body.location, body.category, body.severity, body.status||'open', body.reported_by, body.assigned_to||null, body.due_date||null).run()
    return c.json({ id: result.meta.last_row_id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.put('/api/hazards/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    const resolvedDate = body.status === 'resolved' ? new Date().toISOString().split('T')[0] : body.resolved_date || null
    await DB.prepare(
      `UPDATE hazards SET site_id=?, title=?, description=?, location=?, category=?, severity=?, status=?, reported_by=?, assigned_to=?, due_date=?, resolved_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(body.site_id, body.title, body.description, body.location, body.category, body.severity, body.status, body.reported_by, body.assigned_to||null, body.due_date||null, resolvedDate, id).run()
    return c.json({ id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/hazards/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    await DB.prepare('DELETE FROM hazards WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 사고 보고 API ====================
app.get('/api/incidents', async (c) => {
  const { DB } = c.env
  const siteId = c.req.query('site_id')
  const severity = c.req.query('severity')
  try {
    let query = `SELECT i.*, s.name as site_name FROM incidents i JOIN sites s ON i.site_id=s.id WHERE 1=1`
    const params: any[] = []
    if (siteId) { query += ' AND i.site_id=?'; params.push(siteId) }
    if (severity) { query += ' AND i.severity=?'; params.push(severity) }
    query += ' ORDER BY i.incident_date DESC, i.created_at DESC'
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/incidents/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    const result = await DB.prepare('SELECT i.*, s.name as site_name FROM incidents i JOIN sites s ON i.site_id=s.id WHERE i.id=?').bind(id).first()
    if (!result) return c.json({ error: 'Not found' }, 404)
    return c.json(result)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/incidents', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    const result = await DB.prepare(
      `INSERT INTO incidents (site_id, title, description, incident_date, incident_time, location, category, severity, injured_person, injury_type, witness, reported_by, status, root_cause, corrective_action)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(body.site_id, body.title, body.description, body.incident_date, body.incident_time||null, body.location, body.category, body.severity, body.injured_person||null, body.injury_type||null, body.witness||null, body.reported_by, body.status||'open', body.root_cause||null, body.corrective_action||null).run()
    return c.json({ id: result.meta.last_row_id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.put('/api/incidents/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    await DB.prepare(
      `UPDATE incidents SET site_id=?, title=?, description=?, incident_date=?, incident_time=?, location=?, category=?, severity=?, injured_person=?, injury_type=?, witness=?, reported_by=?, status=?, root_cause=?, corrective_action=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(body.site_id, body.title, body.description, body.incident_date, body.incident_time||null, body.location, body.category, body.severity, body.injured_person||null, body.injury_type||null, body.witness||null, body.reported_by, body.status, body.root_cause||null, body.corrective_action||null, id).run()
    return c.json({ id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/incidents/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    await DB.prepare('DELETE FROM incidents WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 점검 체크리스트 API ====================
app.get('/api/inspections', async (c) => {
  const { DB } = c.env
  const siteId = c.req.query('site_id')
  try {
    let query = `SELECT i.*, s.name as site_name FROM inspections i JOIN sites s ON i.site_id=s.id WHERE 1=1`
    const params: any[] = []
    if (siteId) { query += ' AND i.site_id=?'; params.push(siteId) }
    query += ' ORDER BY i.inspection_date DESC'
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/inspections/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    const inspection = await DB.prepare('SELECT i.*, s.name as site_name FROM inspections i JOIN sites s ON i.site_id=s.id WHERE i.id=?').bind(id).first()
    if (!inspection) return c.json({ error: 'Not found' }, 404)
    const items = await DB.prepare('SELECT * FROM inspection_items WHERE inspection_id=? ORDER BY id').bind(id).all()
    return c.json({ ...inspection, items: items.results })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/inspections', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    // 기본 점검 항목 정의
    const defaultItems = [
      { category: '추락방호', item: '안전난간 설치 및 상태' },
      { category: '추락방호', item: '개구부 덮개 설치' },
      { category: '추락방호', item: '안전대 착용 및 상태' },
      { category: '추락방호', item: '사다리 고정 상태' },
      { category: '낙하물방호', item: '낙하물 방지망 설치' },
      { category: '낙하물방호', item: '출입금지 구역 설정' },
      { category: '낙하물방호', item: '자재 적재 상태' },
      { category: '전기설비', item: '임시 분전반 상태' },
      { category: '전기설비', item: '전선 피복 및 절연 상태' },
      { category: '전기설비', item: '접지 설치 상태' },
      { category: '화재예방', item: '소화기 배치 및 상태' },
      { category: '화재예방', item: '가연성 자재 관리' },
      { category: '화재예방', item: '용접 작업 화기 관리' },
      { category: '개인보호구', item: '안전모 착용' },
      { category: '개인보호구', item: '안전화 착용' },
      { category: '개인보호구', item: '안전조끼 착용' },
      { category: '정리정돈', item: '통로 확보 상태' },
      { category: '정리정돈', item: '자재 정리 상태' },
      { category: '장비', item: '중장비 점검 상태' },
      { category: '장비', item: '안전장치 작동 여부' },
    ]

    const result = await DB.prepare(
      `INSERT INTO inspections (site_id, title, inspection_date, inspector, category, status, total_items, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(body.site_id, body.title, body.inspection_date, body.inspector, body.category, 'pending', defaultItems.length, body.notes||null).run()

    const inspectionId = result.meta.last_row_id

    // 기본 점검 항목 삽입
    for (const item of defaultItems) {
      await DB.prepare(
        'INSERT INTO inspection_items (inspection_id, category, item) VALUES (?, ?, ?)'
      ).bind(inspectionId, item.category, item.item).run()
    }

    return c.json({ id: inspectionId, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.put('/api/inspections/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    if (body.items) {
      let passed = 0, failed = 0
      for (const item of body.items) {
        await DB.prepare(
          'UPDATE inspection_items SET result=?, notes=? WHERE id=?'
        ).bind(item.result || null, item.notes || null, item.id).run()
        if (item.result === 'pass') passed++
        if (item.result === 'fail') failed++
      }
      await DB.prepare(
        `UPDATE inspections SET status=?, passed_items=?, failed_items=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(body.status || 'in_progress', passed, failed, body.notes||null, id).run()
    } else {
      await DB.prepare(
        `UPDATE inspections SET status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(body.status, body.notes||null, id).run()
    }
    return c.json({ id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/inspections/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    await DB.prepare('DELETE FROM inspection_items WHERE inspection_id=?').bind(id).run()
    await DB.prepare('DELETE FROM inspections WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 안전교육 API ====================
app.get('/api/trainings', async (c) => {
  const { DB } = c.env
  const siteId = c.req.query('site_id')
  try {
    let query = `SELECT t.*, s.name as site_name FROM trainings t JOIN sites s ON t.site_id=s.id WHERE 1=1`
    const params: any[] = []
    if (siteId) { query += ' AND t.site_id=?'; params.push(siteId) }
    query += ' ORDER BY t.training_date DESC'
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/trainings', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    const result = await DB.prepare(
      `INSERT INTO trainings (site_id, title, training_date, trainer, duration, category, content, participant_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(body.site_id, body.title, body.training_date, body.trainer, body.duration||null, body.category, body.content||null, body.participant_count||0).run()
    return c.json({ id: result.meta.last_row_id, ...body })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/trainings/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    await DB.prepare('DELETE FROM trainings WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 위험성평가 API ====================
// 공통 위험성 등급 계산 함수
function calcRiskGrade(freq: number, intensity: number): string {
  const score = freq * intensity
  if (score >= 15) return 'very_high'
  if (score >= 9)  return 'high'
  if (score >= 4)  return 'medium'
  return 'low'
}

app.get('/api/risk-assessments', async (c) => {
  const { DB } = c.env
  const siteId         = c.req.query('site_id')
  const assessmentType = c.req.query('assessment_type')   // 'initial' | 'periodic'
  const periodYear     = c.req.query('period_year')
  const periodMonth    = c.req.query('period_month')
  try {
    let query = `SELECT r.*, s.name as site_name FROM risk_assessments r JOIN sites s ON r.site_id=s.id WHERE 1=1`
    const params: any[] = []
    if (siteId)         { query += ' AND r.site_id=?';          params.push(siteId) }
    if (assessmentType) { query += ' AND r.assessment_type=?';  params.push(assessmentType) }
    if (periodYear)     { query += ' AND r.period_year=?';      params.push(Number(periodYear)) }
    if (periodMonth)    { query += ' AND r.period_month=?';     params.push(Number(periodMonth)) }
    query += ' ORDER BY r.period_year DESC, r.period_month DESC, r.assessment_date DESC, r.created_at DESC'
    const result = await DB.prepare(query).bind(...params).all()
    return c.json(result.results)
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/risk-assessments/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    const assessment = await DB.prepare(
      'SELECT r.*, s.name as site_name FROM risk_assessments r JOIN sites s ON r.site_id=s.id WHERE r.id=?'
    ).bind(id).first()
    if (!assessment) return c.json({ error: 'Not found' }, 404)
    const items = await DB.prepare(
      'SELECT * FROM risk_assessment_items WHERE assessment_id=? ORDER BY no'
    ).bind(id).all()
    return c.json({ ...assessment, items: items.results })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/risk-assessments', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  try {
    const riskGrade = calcRiskGrade(Number(body.frequency)||1, Number(body.intensity)||1)
    const assessmentType = body.assessment_type || 'initial'
    const result = await DB.prepare(
      `INSERT INTO risk_assessments
        (site_id, title, assessment_date, assessor, department, work_type, status, notes,
         work_category, key_hazard, frequency, intensity, risk_grade, specific_countermeasure,
         assessment_type, period_year, period_month, period_seq, periodic_cycle)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.site_id, body.title, body.assessment_date, body.assessor,
      body.department || null, body.work_type, body.status || 'draft', body.notes || null,
      body.work_category || null, body.key_hazard || null,
      Number(body.frequency)||1, Number(body.intensity)||1, riskGrade,
      body.specific_countermeasure || null,
      assessmentType,
      body.period_year  ? Number(body.period_year)  : null,
      body.period_month ? Number(body.period_month) : null,
      body.period_seq   ? Number(body.period_seq)   : 1,
      body.periodic_cycle ? Number(body.periodic_cycle) : 3
    ).run()
    return c.json({ id: result.meta.last_row_id, ...body, risk_grade: riskGrade })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.put('/api/risk-assessments/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  try {
    const riskGrade = calcRiskGrade(Number(body.frequency)||1, Number(body.intensity)||1)
    await DB.prepare(
      `UPDATE risk_assessments SET site_id=?, title=?, assessment_date=?, assessor=?, department=?,
       work_type=?, status=?, approval_date=?, approver=?, notes=?,
       work_category=?, key_hazard=?, frequency=?, intensity=?, risk_grade=?, specific_countermeasure=?,
       assessment_type=?, period_year=?, period_month=?, period_seq=?, periodic_cycle=?,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(
      body.site_id, body.title, body.assessment_date, body.assessor,
      body.department || null, body.work_type, body.status,
      body.approval_date || null, body.approver || null, body.notes || null,
      body.work_category || null, body.key_hazard || null,
      Number(body.frequency)||1, Number(body.intensity)||1, riskGrade,
      body.specific_countermeasure || null,
      body.assessment_type || 'initial',
      body.period_year  ? Number(body.period_year)  : null,
      body.period_month ? Number(body.period_month) : null,
      body.period_seq   ? Number(body.period_seq)   : 1,
      body.periodic_cycle ? Number(body.periodic_cycle) : 3,
      id
    ).run()
    return c.json({ id, ...body, risk_grade: riskGrade })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/risk-assessments/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  try {
    await DB.prepare('DELETE FROM risk_assessment_items WHERE assessment_id=?').bind(id).run()
    await DB.prepare('DELETE FROM risk_assessments WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// 위험성평가 항목 CRUD
app.post('/api/risk-assessments/:id/items', async (c) => {
  const { DB } = c.env
  const assessmentId = c.req.param('id')
  const body = await c.req.json()
  try {
    // 빈도 × 강도 로 위험성 수준 자동 계산
    const calcRiskLevel = (freq: number, intensity: number) => {
      const score = freq * intensity
      if (score >= 15) return 'very_high'
      if (score >= 9)  return 'high'
      if (score >= 4)  return 'medium'
      return 'low'
    }
    const beforeLevel = calcRiskLevel(Number(body.before_frequency)||1, Number(body.before_intensity)||1)
    const afterLevel  = calcRiskLevel(Number(body.after_frequency)||1,  Number(body.after_intensity)||1)

    const result = await DB.prepare(
      `INSERT INTO risk_assessment_items
        (assessment_id, no, work_step, hazard_type, hazard_description, possible_accident,
         before_frequency, before_intensity, before_risk_level,
         countermeasure, countermeasure_type, responsible, due_date,
         after_frequency, after_intensity, after_risk_level, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      assessmentId,
      body.no || 1,
      body.work_step, body.hazard_type, body.hazard_description, body.possible_accident,
      Number(body.before_frequency)||1, Number(body.before_intensity)||1, beforeLevel,
      body.countermeasure || null, body.countermeasure_type || null,
      body.responsible || null, body.due_date || null,
      Number(body.after_frequency)||1, Number(body.after_intensity)||1, afterLevel,
      body.status || 'pending'
    ).run()
    return c.json({ id: result.meta.last_row_id, ...body, before_risk_level: beforeLevel, after_risk_level: afterLevel })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.put('/api/risk-assessments/:id/items/:itemId', async (c) => {
  const { DB } = c.env
  const itemId = c.req.param('itemId')
  const body = await c.req.json()
  try {
    const calcRiskLevel = (freq: number, intensity: number) => {
      const score = freq * intensity
      if (score >= 15) return 'very_high'
      if (score >= 9)  return 'high'
      if (score >= 4)  return 'medium'
      return 'low'
    }
    const beforeLevel = calcRiskLevel(Number(body.before_frequency)||1, Number(body.before_intensity)||1)
    const afterLevel  = calcRiskLevel(Number(body.after_frequency)||1,  Number(body.after_intensity)||1)

    await DB.prepare(
      `UPDATE risk_assessment_items SET
        no=?, work_step=?, hazard_type=?, hazard_description=?, possible_accident=?,
        before_frequency=?, before_intensity=?, before_risk_level=?,
        countermeasure=?, countermeasure_type=?, responsible=?, due_date=?,
        after_frequency=?, after_intensity=?, after_risk_level=?, status=?
       WHERE id=?`
    ).bind(
      body.no, body.work_step, body.hazard_type, body.hazard_description, body.possible_accident,
      Number(body.before_frequency)||1, Number(body.before_intensity)||1, beforeLevel,
      body.countermeasure || null, body.countermeasure_type || null,
      body.responsible || null, body.due_date || null,
      Number(body.after_frequency)||1, Number(body.after_intensity)||1, afterLevel,
      body.status || 'pending',
      itemId
    ).run()
    return c.json({ id: itemId, ...body, before_risk_level: beforeLevel, after_risk_level: afterLevel })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.delete('/api/risk-assessments/:id/items/:itemId', async (c) => {
  const { DB } = c.env
  const itemId = c.req.param('itemId')
  try {
    await DB.prepare('DELETE FROM risk_assessment_items WHERE id=?').bind(itemId).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ==================== 메인 HTML ====================
app.get('/', (c) => {
  return c.html(getMainHTML())
})

app.get('*', (c) => {
  return c.html(getMainHTML())
})

function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>건설현장 안전관리시스템</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#1a365d',
            secondary: '#2d6a4f',
            danger: '#c0392b',
            warning: '#d68910',
            safe: '#1e8449',
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; background: #f0f2f5; }
    .sidebar { width: 260px; min-height: 100vh; background: linear-gradient(180deg, #1a365d 0%, #2c5282 100%); }
    .sidebar-link { transition: all 0.2s; }
    .sidebar-link:hover, .sidebar-link.active { background: rgba(255,255,255,0.15); border-left: 3px solid #f6c90e; }
    .card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .badge-critical { background: #fde8e8; color: #c0392b; border: 1px solid #f5c6c6; }
    .badge-high { background: #fef3e2; color: #d68910; border: 1px solid #fde8b8; }
    .badge-medium { background: #fef9e7; color: #b7950b; border: 1px solid #fdeaa8; }
    .badge-low { background: #eafaf1; color: #1e8449; border: 1px solid #a9dfbf; }
    .badge-open { background: #fde8e8; color: #c0392b; }
    .badge-in_progress { background: #e8f4fd; color: #1a5276; }
    .badge-resolved { background: #eafaf1; color: #1e8449; }
    .badge-closed { background: #f2f3f4; color: #566573; }
    .stat-card { border-radius: 12px; padding: 20px; color: white; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-box { background: white; border-radius: 12px; padding: 28px; max-width: 600px; width: 95%; max-height: 90vh; overflow-y: auto; }
    .form-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    .btn-primary { background: #1a365d; color: white; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover { background: #2c5282; }
    .btn-danger { background: #c0392b; color: white; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-success { background: #1e8449; color: white; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .table-row:hover { background: #f8fafc; }
    .severity-bar { height: 8px; border-radius: 4px; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 40px; color: #9ca3af; }
    .tab-btn { padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; color: #6b7280; transition: all 0.2s; }
    .tab-btn.active { background: #1a365d; color: white; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .page-content { animation: fadeIn 0.3s ease; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
  </style>
</head>
<body>
<div class="flex min-h-screen">
  <!-- 사이드바 -->
  <div class="sidebar flex-shrink-0 flex flex-col">
    <div class="p-6 border-b border-blue-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
          <i class="fas fa-hard-hat text-blue-900 text-lg"></i>
        </div>
        <div>
          <div class="text-white font-bold text-sm leading-tight">건설현장</div>
          <div class="text-yellow-300 font-bold text-sm leading-tight">안전관리시스템</div>
        </div>
      </div>
    </div>
    <nav class="flex-1 p-4 space-y-1">
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100 active" onclick="navigate('dashboard')">
        <i class="fas fa-chart-line w-5"></i><span>대시보드</span>
      </a>
      <div class="pt-2 pb-1 px-4 text-blue-300 text-xs font-semibold uppercase tracking-wider">현장관리</div>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('workers')">
        <i class="fas fa-users w-5"></i><span>작업자 관리</span>
      </a>
      <div class="pt-2 pb-1 px-4 text-blue-300 text-xs font-semibold uppercase tracking-wider">안전관리</div>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('hazards')">
        <i class="fas fa-exclamation-triangle w-5"></i><span>위험요소 관리</span>
        <span id="hazard-badge" class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full hidden"></span>
      </a>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('incidents')">
        <i class="fas fa-first-aid w-5"></i><span>사고 보고</span>
      </a>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('inspections')">
        <i class="fas fa-clipboard-check w-5"></i><span>안전점검</span>
      </a>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('trainings')">
        <i class="fas fa-graduation-cap w-5"></i><span>안전교육</span>
      </a>
      <div class="pt-2 pb-1 px-4 text-blue-300 text-xs font-semibold uppercase tracking-wider">위험성평가</div>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('riskAssessments')">
        <i class="fas fa-search w-5"></i><span>위험성평가(최초)</span>
      </a>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('periodicAssessments')">
        <i class="fas fa-sync-alt w-5"></i><span>위험성평가(정기)</span>
      </a>
      <a href="#" class="sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg text-blue-100" onclick="navigate('adhocAssessments')">
        <i class="fas fa-bolt w-5"></i><span>위험성평가(수시)</span>
      </a>
    </nav>
    <div class="p-4 border-t border-blue-800">
      <div class="flex items-center gap-3 px-4 py-2 text-blue-200 text-sm">
        <i class="fas fa-circle text-green-400 text-xs"></i>
        <span>시스템 정상 운영 중</span>
      </div>
    </div>
  </div>

  <!-- 메인 콘텐츠 -->
  <div class="flex-1 flex flex-col min-w-0">
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
      <div>
        <h1 id="page-title" class="text-xl font-bold text-gray-800">대시보드</h1>
        <p id="page-subtitle" class="text-sm text-gray-500">전체 현장 안전 현황</p>
      </div>
      <div class="flex items-center gap-4">
        <span id="current-date" class="text-sm text-gray-500"></span>
        <div class="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-white text-sm"></i>
        </div>
      </div>
    </header>
    <main class="flex-1 p-6 overflow-auto">
      <div id="main-content" class="page-content"></div>
    </main>
  </div>
</div>

<!-- 모달들 -->
<div id="modal" class="modal">
  <div class="modal-box">
    <div id="modal-content"></div>
  </div>
</div>

<script src="/static/app.js"></script>
</body>
</html>`
}

export default app
