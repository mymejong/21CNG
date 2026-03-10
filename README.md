# 🏗️ 건설현장 안전관리시스템

## 프로젝트 개요
- **이름**: 건설현장 안전관리시스템 (Construction Site Safety Management System)
- **목표**: 건설현장의 위험요소, 사고, 안전점검, 안전교육을 통합 관리하여 재해 예방
- **기술스택**: Hono (TypeScript) + Cloudflare D1 + TailwindCSS + Chart.js

## 주요 기능

### ✅ 완성된 기능
1. **대시보드** - 전체 현황 통계, 위험도 분포 차트, 최근 위험요소/사고 목록
2. **작업자 관리** - 현장별 작업자 등록/수정/삭제, 안전교육 이수 관리
3. **위험요소 관리** - 위험요소 발굴/등록/상태 추적 (매우위험/위험/주의/낮음)
4. **사고 보고** - 사고/아차사고 보고, 근본원인 분석, 시정조치 기록
5. **안전점검** - 체크리스트 기반 현장 안전점검, 항목별 결과 기록
6. **안전교육** - 교육 실시 기록 관리 (신규채용/정기/특별/관리감독자)

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/dashboard` | 대시보드 통계 및 현황 |
| GET/POST | `/api/sites` | 현장 목록 조회/등록 |
| GET/POST | `/api/workers` | 작업자 목록 조회/등록 |
| PUT/DELETE | `/api/workers/:id` | 작업자 수정/삭제 |
| GET/POST | `/api/hazards` | 위험요소 목록 조회/등록 |
| GET/PUT/DELETE | `/api/hazards/:id` | 위험요소 상세/수정/삭제 |
| GET/POST | `/api/incidents` | 사고 보고 목록 조회/등록 |
| GET/PUT/DELETE | `/api/incidents/:id` | 사고 상세/수정/삭제 |
| GET/POST | `/api/inspections` | 점검 목록 조회/등록 |
| GET/PUT/DELETE | `/api/inspections/:id` | 점검 상세/수정/삭제 |
| GET/POST | `/api/trainings` | 교육 목록 조회/등록 |
| DELETE | `/api/trainings/:id` | 교육 삭제 |

## 데이터 모델

### 현장 (sites)
- 현장명, 위치, 담당자, 공사기간, 상태

### 작업자 (workers)
- 이름, 사번, 직책, 소속, 연락처, 안전교육 이수일

### 위험요소 (hazards)
- 제목, 위치, 분류, 위험도(critical/high/medium/low), 상태, 보고자, 담당자, 조치기한

### 사고 (incidents)
- 제목, 발생일시, 위치, 분류, 심각도, 부상자, 근본원인, 시정조치

### 안전점검 (inspections + inspection_items)
- 점검명, 점검일, 점검자, 유형, 항목별 결과(적합/부적합/해당없음)

### 안전교육 (trainings)
- 교육명, 교육일, 강사, 교육시간, 유형, 참여인원, 교육내용

## 스토리지 서비스
- **Cloudflare D1** (SQLite): 모든 데이터 저장

## 로컬 개발

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 로컬 DB 마이그레이션
npm run db:migrate:local

# 샘플 데이터 삽입
npm run db:seed

# 서버 실행 (PM2)
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox
```

## 배포 상태
- **플랫폼**: Cloudflare Pages
- **상태**: 로컬 개발 중
- **마지막 업데이트**: 2026-03-10
