-- ===========================
-- 건설현장 안전관리시스템 DB
-- ===========================

-- 현장(프로젝트) 테이블
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  manager TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT DEFAULT 'active', -- active, completed, paused
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 작업자 테이블
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  position TEXT NOT NULL,       -- 직책
  department TEXT,              -- 소속
  phone TEXT,
  emergency_contact TEXT,
  safety_training_date TEXT,    -- 안전교육 이수일
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 위험요소 테이블
CREATE TABLE IF NOT EXISTS hazards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,        -- 위험 위치
  category TEXT NOT NULL,        -- 추락, 낙하, 감전, 화재, 기계, 화학물질, 기타
  severity TEXT NOT NULL,        -- critical, high, medium, low
  status TEXT DEFAULT 'open',    -- open, in_progress, resolved, closed
  reported_by TEXT NOT NULL,
  assigned_to TEXT,
  due_date TEXT,
  resolved_date TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 사고 보고 테이블
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  incident_time TEXT,
  location TEXT NOT NULL,
  category TEXT NOT NULL,        -- 부상, 아차사고, 재산피해, 환경오염, 기타
  severity TEXT NOT NULL,        -- fatal, serious, minor, near_miss
  injured_person TEXT,           -- 부상자 이름
  injury_type TEXT,              -- 부상 유형
  witness TEXT,                  -- 목격자
  reported_by TEXT NOT NULL,
  status TEXT DEFAULT 'open',    -- open, investigating, resolved, closed
  root_cause TEXT,               -- 근본원인
  corrective_action TEXT,        -- 시정조치
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 안전점검 체크리스트 테이블
CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  inspector TEXT NOT NULL,
  category TEXT NOT NULL,        -- 일일, 주간, 월간, 특별
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  total_items INTEGER DEFAULT 0,
  passed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 점검 항목 테이블
CREATE TABLE IF NOT EXISTS inspection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_id INTEGER NOT NULL,
  category TEXT NOT NULL,        -- 항목 카테고리
  item TEXT NOT NULL,            -- 점검 항목
  result TEXT,                   -- pass, fail, na
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id)
);

-- 안전교육 테이블
CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  training_date TEXT NOT NULL,
  trainer TEXT NOT NULL,
  duration INTEGER,              -- 교육 시간 (분)
  category TEXT NOT NULL,        -- 신규채용, 정기, 특별, 관리감독자
  content TEXT,
  participant_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- 교육 참가자 테이블
CREATE TABLE IF NOT EXISTS training_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  attended INTEGER DEFAULT 1,   -- 1: 참석, 0: 결석
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (training_id) REFERENCES trainings(id),
  FOREIGN KEY (worker_id) REFERENCES workers(id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_workers_site ON workers(site_id);
CREATE INDEX IF NOT EXISTS idx_hazards_site ON hazards(site_id);
CREATE INDEX IF NOT EXISTS idx_hazards_severity ON hazards(severity);
CREATE INDEX IF NOT EXISTS idx_hazards_status ON hazards(status);
CREATE INDEX IF NOT EXISTS idx_incidents_site ON incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_inspections_site ON inspections(site_id);
CREATE INDEX IF NOT EXISTS idx_trainings_site ON trainings(site_id);
