-- 위험성평가(최초) 테이블
CREATE TABLE IF NOT EXISTS risk_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id),
  title TEXT NOT NULL,
  assessment_date TEXT NOT NULL,
  assessor TEXT NOT NULL,
  department TEXT,
  work_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft / in_progress / completed / approved
  approval_date TEXT,
  approver TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 위험성평가 항목 테이블 (KRAS 방식)
CREATE TABLE IF NOT EXISTS risk_assessment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  no INTEGER NOT NULL,
  work_step TEXT NOT NULL,        -- 작업 단계(공정)
  hazard_type TEXT NOT NULL,      -- 유해·위험요인 분류
  hazard_description TEXT NOT NULL, -- 유해·위험요인
  possible_accident TEXT NOT NULL,  -- 사고 유형
  -- 현재 위험성(개선 전)
  before_frequency INTEGER DEFAULT 1,    -- 빈도(가능성): 1~5
  before_intensity INTEGER DEFAULT 1,    -- 강도(중대성): 1~5
  before_risk_level TEXT DEFAULT 'low',  -- 위험성 수준: very_high/high/medium/low
  -- 개선 대책
  countermeasure TEXT,            -- 감소대책
  countermeasure_type TEXT,       -- 대책 유형: 제거/대체/공학적/관리적/보호구
  responsible TEXT,               -- 담당자
  due_date TEXT,                  -- 이행 기한
  -- 잔여 위험성(개선 후)
  after_frequency INTEGER DEFAULT 1,
  after_intensity INTEGER DEFAULT 1,
  after_risk_level TEXT DEFAULT 'low',
  -- 완료 여부
  status TEXT DEFAULT 'pending',  -- pending / completed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
