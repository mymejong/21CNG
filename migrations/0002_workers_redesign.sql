-- workers 테이블 재설계
DROP TABLE IF EXISTS workers;

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,           -- 사번
  name TEXT NOT NULL,                          -- 이름
  hire_date TEXT,                              -- 입사일자
  age INTEGER,                                 -- 나이
  career_years REAL,                           -- 경력 (년)
  job_type TEXT,                               -- 직종
  company TEXT,                                -- 소속사
  phone TEXT,                                  -- 연락처
  training_expire_date TEXT,                   -- 교육만료일
  pre_placement_health_check_date TEXT,        -- 배치전건강검진일
  special_health_check_date TEXT,              -- 특수건강검진일
  special_health_check_expire_date TEXT,       -- 특수건강검진 만기일
  general_health_check_date TEXT,              -- 일반건강검진일
  general_health_check_expire_date TEXT,       -- 일반건강검진 만기일
  safety_edu_reg_no TEXT,                      -- 건설업기초안전보건교육등록번호
  status TEXT DEFAULT 'active',                -- 상태 (active / inactive)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE INDEX IF NOT EXISTS idx_workers_site ON workers(site_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
