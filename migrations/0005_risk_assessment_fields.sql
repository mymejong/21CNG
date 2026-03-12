-- risk_assessments 테이블에 신규 필드 추가
-- title → work_content (작업내용) 으로 용도 변경 (기존 title 컬럼 재사용)
-- 공종(work_category) 추가
-- 중점위험요인(key_hazard) 추가 (기존 site_id 외 별도 텍스트 필드)
-- 빈도(frequency), 강도(intensity), 등급(risk_grade), 구체적개선대책(specific_countermeasure) 추가

ALTER TABLE risk_assessments ADD COLUMN work_category TEXT;
ALTER TABLE risk_assessments ADD COLUMN key_hazard TEXT;
ALTER TABLE risk_assessments ADD COLUMN frequency INTEGER DEFAULT 1;
ALTER TABLE risk_assessments ADD COLUMN intensity INTEGER DEFAULT 1;
ALTER TABLE risk_assessments ADD COLUMN risk_grade TEXT DEFAULT 'low';
ALTER TABLE risk_assessments ADD COLUMN specific_countermeasure TEXT;
