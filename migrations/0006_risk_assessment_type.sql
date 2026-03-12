-- risk_assessments 테이블에 평가 유형 및 정기 주기 컬럼 추가
-- assessment_type: 'initial'(최초) / 'periodic'(정기), 기본값 'initial'
-- period_year: 정기평가 연도 (예: 2026)
-- period_month: 정기평가 월 (예: 3)
-- period_seq: 동일 연월 내 순번 (1, 2, 3...)
-- periodic_cycle: 평가 주기 (월 단위, 예: 3 = 분기, 6 = 반기, 12 = 연간)

ALTER TABLE risk_assessments ADD COLUMN assessment_type TEXT NOT NULL DEFAULT 'initial';
ALTER TABLE risk_assessments ADD COLUMN period_year INTEGER;
ALTER TABLE risk_assessments ADD COLUMN period_month INTEGER;
ALTER TABLE risk_assessments ADD COLUMN period_seq INTEGER DEFAULT 1;
ALTER TABLE risk_assessments ADD COLUMN periodic_cycle INTEGER DEFAULT 3;
