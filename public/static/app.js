// ============================================================
// 건설현장 안전관리시스템 - Frontend App
// ============================================================

let currentPage = 'dashboard';
let sites = [];
let currentSiteId = null;

// 날짜 표시
document.getElementById('current-date').textContent = new Date().toLocaleDateString('ko-KR', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
});

// ==================== 유틸리티 ====================
const API = axios.create({ baseURL: '/api' });

function showLoading(el) {
  document.getElementById(el || 'main-content').innerHTML =
    '<div class="loading"><i class="fas fa-spinner fa-spin text-2xl text-blue-500 mr-3"></i> 로딩 중...</div>';
}

function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

function severityBadge(s) {
  const map = { critical: ['badge-critical','매우위험'], high: ['badge-high','위험'], medium: ['badge-medium','주의'], low: ['badge-low','낮음'] };
  const [cls, label] = map[s] || ['badge-low', s];
  return `<span class="badge ${cls} text-xs px-2 py-0.5 rounded-full font-medium">${label}</span>`;
}

function statusBadge(s) {
  const map = { open: ['badge-open','미조치'], in_progress: ['badge-in_progress','처리중'], resolved: ['badge-resolved','해결됨'], closed: ['badge-closed','종결'], pending: ['badge-high','대기'], completed: ['badge-resolved','완료'], investigating: ['badge-in_progress','조사중'], near_miss: ['badge-medium','아차사고'] };
  const [cls, label] = map[s] || ['badge-closed', s];
  return `<span class="badge ${cls} text-xs px-2 py-0.5 rounded-full font-medium">${label}</span>`;
}

function severityIcon(s) {
  const icons = { critical: 'text-red-600 fa-exclamation-circle', high: 'text-orange-500 fa-exclamation-triangle', medium: 'text-yellow-500 fa-exclamation', low: 'text-green-500 fa-check-circle' };
  return `<i class="fas ${icons[s] || icons.low}"></i>`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ko-KR');
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const links = { dashboard: 0, workers: 1, hazards: 2, incidents: 3, inspections: 4, trainings: 5, riskAssessments: 6, periodicAssessments: 7, adhocAssessments: 8 };
  const allLinks = document.querySelectorAll('.sidebar-link');
  if (links[page] !== undefined) allLinks[links[page]]?.classList.add('active');

  const titles = {
    dashboard: ['대시보드', '전체 현장 안전 현황'],
    workers: ['작업자 관리', '현장 작업자 등록 및 관리'],
    hazards: ['위험요소 관리', '현장 위험요소 발굴 및 조치'],
    incidents: ['사고 보고', '사고 및 아차사고 보고 관리'],
    inspections: ['안전점검', '현장 안전점검 체크리스트'],
    trainings: ['안전교육', '안전교육 실시 기록 관리'],
    riskAssessments: ['위험성평가(최초)', '작업별 위험성 발굴 및 감소대책 수립'],
    periodicAssessments: ['위험성평가(정기)', '주기별 정기 위험성평가 관리'],
    adhocAssessments: ['위험성평가(수시)', '변경사항 발생 시 수시 위험성평가 관리'],
  };
  const [title, subtitle] = titles[page] || ['페이지', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;

  const pageRenderers = { dashboard: renderDashboard, workers: renderWorkers, hazards: renderHazards, incidents: renderIncidents, inspections: renderInspections, trainings: renderTrainings, riskAssessments: renderRiskAssessments, periodicAssessments: renderPeriodicAssessments, adhocAssessments: renderAdhocAssessments };
  document.getElementById('main-content').className = 'page-content';
  if (pageRenderers[page]) pageRenderers[page]();
  return false;
}

// ==================== 대시보드 ====================
async function renderDashboard() {
  showLoading();
  try {
    const { data } = await API.get('/dashboard');
    const { stats, recentHazards, recentIncidents, hazardsBySeverity } = data;

    const html = `
    <!-- 통계 카드 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="stat-card bg-gradient-to-br from-blue-600 to-blue-800">
        <div class="text-blue-200 text-sm mb-1"><i class="fas fa-building mr-1"></i> 진행중 현장</div>
        <div class="text-3xl font-bold">${stats.activeSites}</div>
        <div class="text-blue-200 text-xs mt-1">개 현장</div>
      </div>
      <div class="stat-card bg-gradient-to-br from-red-500 to-red-700">
        <div class="text-red-200 text-sm mb-1"><i class="fas fa-exclamation-circle mr-1"></i> 미조치 위험요소</div>
        <div class="text-3xl font-bold">${stats.openHazards}</div>
        <div class="text-red-200 text-xs mt-1">건 중 <span class="font-bold text-white">${stats.criticalHazards}</span>건 매우위험</div>
      </div>
      <div class="stat-card bg-gradient-to-br from-orange-500 to-orange-700">
        <div class="text-orange-200 text-sm mb-1"><i class="fas fa-first-aid mr-1"></i> 처리중 사고</div>
        <div class="text-3xl font-bold">${stats.openIncidents}</div>
        <div class="text-orange-200 text-xs mt-1">건 처리 중</div>
      </div>
      <div class="stat-card bg-gradient-to-br from-green-600 to-green-800">
        <div class="text-green-200 text-sm mb-1"><i class="fas fa-clipboard-check mr-1"></i> 예정 점검</div>
        <div class="text-3xl font-bold">${stats.pendingInspections}</div>
        <div class="text-green-200 text-xs mt-1">건 점검 예정</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- 위험요소 현황 -->
      <div class="card p-5 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-800"><i class="fas fa-exclamation-triangle text-orange-500 mr-2"></i>최근 위험요소</h3>
          <button class="text-sm text-blue-600 hover:underline" onclick="navigate('hazards')">전체보기</button>
        </div>
        <div class="space-y-3">
          ${recentHazards.map(h => `
          <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer" onclick="navigate('hazards')">
            <div class="mt-0.5">${severityIcon(h.severity)}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-gray-800 text-sm">${h.title}</span>
                ${severityBadge(h.severity)}
                ${statusBadge(h.status)}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                <i class="fas fa-map-marker-alt mr-1"></i>${h.site_name} · ${h.location}
                <span class="ml-2"><i class="fas fa-calendar mr-1"></i>${formatDate(h.created_at)}</span>
              </div>
            </div>
          </div>`).join('') || '<div class="text-gray-400 text-center py-6">위험요소가 없습니다</div>'}
        </div>
      </div>

      <!-- 위험도 분포 -->
      <div class="card p-5">
        <h3 class="font-bold text-gray-800 mb-4"><i class="fas fa-chart-pie text-blue-500 mr-2"></i>위험도 분포</h3>
        <canvas id="severityChart" height="180"></canvas>
        <div class="mt-4 space-y-2">
          ${[{k:'critical',l:'매우위험',c:'bg-red-500'},{k:'high',l:'위험',c:'bg-orange-400'},{k:'medium',l:'주의',c:'bg-yellow-400'},{k:'low',l:'낮음',c:'bg-green-400'}].map(s => {
            const found = hazardsBySeverity.find(h => h.severity === s.k);
            const cnt = found ? found.count : 0;
            return `<div class="flex items-center gap-2 text-sm">
              <div class="w-3 h-3 rounded-full ${s.c}"></div>
              <span class="text-gray-600 flex-1">${s.l}</span>
              <span class="font-bold text-gray-800">${cnt}건</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- 최근 사고 -->
    <div class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-gray-800"><i class="fas fa-first-aid text-red-500 mr-2"></i>최근 사고 보고</h3>
        <button class="text-sm text-blue-600 hover:underline" onclick="navigate('incidents')">전체보기</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left px-3 py-2 text-gray-600 font-semibold">사고명</th>
              <th class="text-left px-3 py-2 text-gray-600 font-semibold">현장</th>
              <th class="text-left px-3 py-2 text-gray-600 font-semibold">심각도</th>
              <th class="text-left px-3 py-2 text-gray-600 font-semibold">상태</th>
              <th class="text-left px-3 py-2 text-gray-600 font-semibold">발생일</th>
            </tr>
          </thead>
          <tbody>
            ${recentIncidents.map(i => `
            <tr class="table-row border-b border-gray-100">
              <td class="px-3 py-2 font-medium text-gray-800">${i.title}</td>
              <td class="px-3 py-2 text-gray-600">${i.site_name}</td>
              <td class="px-3 py-2">${severityBadge(i.severity)}</td>
              <td class="px-3 py-2">${statusBadge(i.status)}</td>
              <td class="px-3 py-2 text-gray-500">${formatDate(i.incident_date)}</td>
            </tr>`).join('') || '<tr><td colspan="5" class="text-center py-6 text-gray-400">사고 보고가 없습니다</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;

    document.getElementById('main-content').innerHTML = html;

    // 차트
    const sevData = [
      hazardsBySeverity.find(h=>h.severity==='critical')?.count||0,
      hazardsBySeverity.find(h=>h.severity==='high')?.count||0,
      hazardsBySeverity.find(h=>h.severity==='medium')?.count||0,
      hazardsBySeverity.find(h=>h.severity==='low')?.count||0,
    ];
    const ctx = document.getElementById('severityChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['매우위험', '위험', '주의', '낮음'],
          datasets: [{ data: sevData, backgroundColor: ['#ef4444','#f97316','#eab308','#22c55e'], borderWidth: 0 }]
        },
        options: { plugins: { legend: { display: false } }, cutout: '65%' }
      });
    }

    // 위험요소 배지
    if (stats.criticalHazards > 0) {
      const badge = document.getElementById('hazard-badge');
      badge.textContent = stats.criticalHazards;
      badge.classList.remove('hidden');
    }
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

// ==================== 작업자 관리 ====================

// 만료 D-day 계산 → 색상 클래스 반환
function expireClass(dateStr) {
  if (!dateStr) return '';
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (diff < 0)  return 'text-red-600 font-bold';      // 만료
  if (diff <= 30) return 'text-orange-500 font-semibold'; // 30일 이내
  return 'text-gray-700';
}

// 만료 D-day 라벨
function expireLabel(dateStr) {
  if (!dateStr) return '-';
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  const base = formatDate(dateStr);
  if (diff < 0)  return `${base} <span class="text-xs text-red-500">(만료)</span>`;
  if (diff <= 30) return `${base} <span class="text-xs text-orange-500">(D-${diff})</span>`;
  return base;
}

async function renderWorkers() {
  showLoading();
  try {
    const [workersRes, sitesRes] = await Promise.all([API.get('/workers'), API.get('/sites')]);
    sites = sitesRes.data;
    window._workersData = workersRes.data;
    renderWorkersContent(workersRes.data);
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderWorkersContent(workers) {
  const total   = workers.length;
  const active  = workers.filter(w => w.status === 'active').length;
  const inactive= workers.filter(w => w.status !== 'active').length;

  // 만료 임박(30일 이내) 또는 만료된 항목 수
  const today = new Date();
  const expireSoon = workers.filter(w => {
    const dates = [w.training_expire_date, w.special_health_check_expire_date, w.general_health_check_expire_date];
    return dates.some(d => {
      if (!d) return false;
      const diff = Math.ceil((new Date(d) - today) / 86400000);
      return diff <= 30;
    });
  }).length;

  const html = `
  <!-- 상단 요약 카드 -->
  <div class="grid grid-cols-3 gap-4 mb-5">
    <div class="card p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
        <i class="fas fa-users text-blue-600 text-xl"></i>
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-800">${total}</div>
        <div class="text-xs text-gray-500">전체 작업자</div>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
        <i class="fas fa-user-check text-green-600 text-xl"></i>
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-800">${active}</div>
        <div class="text-xs text-gray-500">재직중</div>
      </div>
    </div>
    <div class="card p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
        <i class="fas fa-exclamation-circle text-orange-500 text-xl"></i>
      </div>
      <div>
        <div class="text-2xl font-bold text-gray-800">${expireSoon}</div>
        <div class="text-xs text-gray-500">만료 임박/만료</div>
      </div>
    </div>
  </div>

  <!-- 필터 & 버튼 -->
  <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
    <div class="flex gap-2 flex-wrap">
      <select id="worker-site-filter" class="form-input w-auto text-sm" onchange="applyWorkerFilter()">
        <option value="">전체 현장</option>
        ${sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <select id="worker-status-filter" class="form-input w-auto text-sm" onchange="applyWorkerFilter()">
        <option value="">전체 상태</option>
        <option value="active">재직중</option>
        <option value="inactive">퇴직</option>
      </select>
      <input id="worker-search" type="text" class="form-input w-44 text-sm" placeholder="이름/사번 검색" oninput="applyWorkerFilter()">
    </div>
    <button class="btn-primary text-sm" onclick="showWorkerForm()">
      <i class="fas fa-plus mr-1"></i>작업자 등록
    </button>
  </div>

  <!-- 테이블 -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">사번</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">이름</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">주민등록번호</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">입사일자</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">나이</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">경력(년)</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">직종</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">소속사</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">연락처</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">교육만료일</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">배치전<br>건강검진일</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">특수<br>건강검진일</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">특수검진<br>만기일</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">일반<br>건강검진일</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">일반검진<br>만기일</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">기초안전교육<br>등록번호</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">상태</th>
            <th class="text-center px-3 py-3 text-gray-600 font-semibold whitespace-nowrap">관리</th>
          </tr>
        </thead>
        <tbody id="workers-tbody">
          ${renderWorkersRows(workers)}
        </tbody>
      </table>
    </div>
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}

function renderWorkersRows(workers) {
  if (!workers.length) return `
    <tr>
      <td colspan="18" class="text-center py-12 text-gray-400">
        <i class="fas fa-users text-4xl mb-3 block"></i>
        등록된 작업자가 없습니다
      </td>
    </tr>`;

  return workers.map(w => {
    const statusBadgeW = w.status === 'active'
      ? '<span class="badge badge-resolved text-xs px-2 py-0.5 rounded-full">재직중</span>'
      : '<span class="badge badge-closed text-xs px-2 py-0.5 rounded-full">퇴직</span>';

    return `
    <tr class="table-row border-b border-gray-100 hover:bg-blue-50/30">
      <td class="px-3 py-2.5 text-center text-gray-600">${w.employee_id}</td>
      <td class="px-3 py-2.5 text-center font-medium text-gray-800 whitespace-nowrap">
        <div class="flex items-center justify-center gap-1.5">
          <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">${w.name[0]}</div>
          ${w.name}
        </div>
      </td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${w.resident_number ? maskResidentNumber(w.resident_number) : '-'}</td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${formatDate(w.hire_date)}</td>
      <td class="px-3 py-2.5 text-center text-gray-700">${w.age != null ? w.age + '세' : '-'}</td>
      <td class="px-3 py-2.5 text-center text-gray-700">${w.career_years != null ? w.career_years + '년' : '-'}</td>
      <td class="px-3 py-2.5 text-center text-gray-700 whitespace-nowrap">${w.job_type || '-'}</td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${w.company || '-'}</td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${w.phone || '-'}</td>
      <td class="px-3 py-2.5 text-center whitespace-nowrap ${expireClass(w.training_expire_date)}">${expireLabel(w.training_expire_date)}</td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${formatDate(w.pre_placement_health_check_date)}</td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${formatDate(w.special_health_check_date)}</td>
      <td class="px-3 py-2.5 text-center whitespace-nowrap ${expireClass(w.special_health_check_expire_date)}">${expireLabel(w.special_health_check_expire_date)}</td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${formatDate(w.general_health_check_date)}</td>
      <td class="px-3 py-2.5 text-center whitespace-nowrap ${expireClass(w.general_health_check_expire_date)}">${expireLabel(w.general_health_check_expire_date)}</td>
      <td class="px-3 py-2.5 text-center text-gray-600">${w.safety_edu_reg_no || '-'}</td>
      <td class="px-3 py-2.5 text-center">${statusBadgeW}</td>
      <td class="px-3 py-2.5 text-center">
        <div class="flex items-center justify-center gap-1">
          <button class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            onclick='showWorkerForm(${JSON.stringify(w).replace(/'/g, "&#39;")})'>
            <i class="fas fa-edit"></i>
          </button>
          <button class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
            onclick="deleteWorker(${w.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function maskResidentNumber(num) {
  if (!num) return '-';
  // 000000-0000000 형식에서 뒷자리 마스킹
  const clean = num.replace(/-/g, '');
  if (clean.length >= 7) {
    return clean.slice(0,6) + '-' + clean[6] + '******';
  }
  return num;
}

function applyWorkerFilter() {
  const siteId  = document.getElementById('worker-site-filter')?.value  || '';
  const status  = document.getElementById('worker-status-filter')?.value || '';
  const keyword = (document.getElementById('worker-search')?.value || '').trim().toLowerCase();
  let filtered  = window._workersData || [];
  if (siteId)   filtered = filtered.filter(w => String(w.site_id) === siteId);
  if (status)   filtered = filtered.filter(w => w.status === status);
  if (keyword)  filtered = filtered.filter(w =>
    w.name.toLowerCase().includes(keyword) || w.employee_id.toLowerCase().includes(keyword)
  );
  document.getElementById('workers-tbody').innerHTML = renderWorkersRows(filtered);
}

function showWorkerForm(worker = null) {
  const isEdit = !!worker;
  showModal(`
  <div class="flex justify-between items-center mb-5">
    <div>
      <h3 class="text-lg font-bold text-gray-800">${isEdit ? '작업자 정보 수정' : '작업자 등록'}</h3>
      <p class="text-xs text-gray-400 mt-0.5">* 필수 입력 항목</p>
    </div>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveWorker(event, ${worker?.id || 'null'})">

    <!-- 기본 정보 -->
    <div class="mb-4">
      <div class="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
        <i class="fas fa-id-card"></i> 기본 정보
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">사번 *</label>
          <input class="form-input" name="employee_id" value="${worker?.employee_id || ''}" required placeholder="EMP001">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
          <input class="form-input" name="name" value="${worker?.name || ''}" required placeholder="홍길동">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">주민등록번호</label>
          <input class="form-input" name="resident_number" value="${worker?.resident_number || ''}" placeholder="000000-0000000" maxlength="14"
            oninput="this.value=this.value.replace(/[^0-9-]/g,'').replace(/^(\d{6})(?!-)(\d)/,'$1-$2')">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">입사일자</label>
          <input type="date" class="form-input" name="hire_date" value="${worker?.hire_date || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">나이</label>
          <input type="number" class="form-input" name="age" value="${worker?.age || ''}" min="15" max="80" placeholder="예: 35">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">경력 (년)</label>
          <input type="number" step="0.5" class="form-input" name="career_years" value="${worker?.career_years || ''}" min="0" placeholder="예: 5.5">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">직종</label>
          <input class="form-input" name="job_type" value="${worker?.job_type || ''}" placeholder="철근공, 목공, 전기공...">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">소속사</label>
          <input class="form-input" name="company" value="${worker?.company || ''}" placeholder="(주)○○건설">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">연락처</label>
          <input class="form-input" name="phone" value="${worker?.phone || ''}" placeholder="010-0000-0000">
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-medium text-gray-600 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s => `<option value="${s.id}" ${worker?.site_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- 교육 정보 -->
    <div class="mb-4">
      <div class="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
        <i class="fas fa-graduation-cap"></i> 교육 정보
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">교육만료일</label>
          <input type="date" class="form-input" name="training_expire_date" value="${worker?.training_expire_date || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">건설업기초안전보건교육 등록번호</label>
          <input class="form-input" name="safety_edu_reg_no" value="${worker?.safety_edu_reg_no || ''}" placeholder="등록번호 입력">
        </div>
      </div>
    </div>

    <!-- 건강검진 정보 -->
    <div class="mb-4">
      <div class="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
        <i class="fas fa-heartbeat"></i> 건강검진 정보
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">배치전 건강검진일</label>
          <input type="date" class="form-input" name="pre_placement_health_check_date" value="${worker?.pre_placement_health_check_date || ''}">
        </div>
        <div></div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">특수 건강검진일</label>
          <input type="date" class="form-input" name="special_health_check_date" value="${worker?.special_health_check_date || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">특수 건강검진 만기일</label>
          <input type="date" class="form-input" name="special_health_check_expire_date" value="${worker?.special_health_check_expire_date || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">일반 건강검진일</label>
          <input type="date" class="form-input" name="general_health_check_date" value="${worker?.general_health_check_date || ''}">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">일반 건강검진 만기일</label>
          <input type="date" class="form-input" name="general_health_check_expire_date" value="${worker?.general_health_check_expire_date || ''}">
        </div>
      </div>
    </div>

    <!-- 상태 -->
    <div class="mb-5">
      <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
        <i class="fas fa-toggle-on"></i> 상태
      </div>
      <select class="form-input w-full" name="status">
        <option value="active"   ${!worker || worker?.status === 'active'   ? 'selected' : ''}>재직중</option>
        <option value="inactive" ${worker?.status === 'inactive' ? 'selected' : ''}>퇴직</option>
      </select>
    </div>

    <div class="flex justify-end gap-3 border-t pt-4">
      <button type="button" onclick="closeModal()"
        class="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">취소</button>
      <button type="submit" class="btn-primary text-sm">${isEdit ? '수정 저장' : '등록'}</button>
    </div>
  </form>`);
}

async function saveWorker(e, id) {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (id) await API.put(`/workers/${id}`, body);
    else    await API.post('/workers', body);
    closeModal();
    renderWorkers();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deleteWorker(id) {
  if (!confirm('이 작업자를 삭제하시겠습니까?')) return;
  try { await API.delete(`/workers/${id}`); renderWorkers(); }
  catch(err) { alert('삭제 실패'); }
}

// ==================== 위험요소 관리 ====================
async function renderHazards() {
  showLoading();
  try {
    const [hazardsRes, sitesRes] = await Promise.all([API.get('/hazards'), API.get('/sites')]);
    sites = sitesRes.data;
    window._hazardsData = hazardsRes.data;
    renderHazardsContent(hazardsRes.data);
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderHazardsContent(hazards) {
  const counts = { all: hazards.length, critical: 0, high: 0, medium: 0, low: 0 };
  hazards.forEach(h => counts[h.severity] = (counts[h.severity]||0)+1);

  const html = `
  <div class="flex gap-2 mb-4 flex-wrap">
    <button class="tab-btn active" onclick="filterHazardsBySeverity('all', this)">전체 (${counts.all})</button>
    <button class="tab-btn" onclick="filterHazardsBySeverity('critical', this)"><i class="fas fa-circle text-red-500 mr-1 text-xs"></i>매우위험 (${counts.critical})</button>
    <button class="tab-btn" onclick="filterHazardsBySeverity('high', this)"><i class="fas fa-circle text-orange-400 mr-1 text-xs"></i>위험 (${counts.high})</button>
    <button class="tab-btn" onclick="filterHazardsBySeverity('medium', this)"><i class="fas fa-circle text-yellow-400 mr-1 text-xs"></i>주의 (${counts.medium})</button>
    <button class="tab-btn" onclick="filterHazardsBySeverity('low', this)"><i class="fas fa-circle text-green-400 mr-1 text-xs"></i>낮음 (${counts.low})</button>
    <div class="ml-auto">
      <button class="btn-primary" onclick="showHazardForm()"><i class="fas fa-plus mr-2"></i>위험요소 등록</button>
    </div>
  </div>
  <div id="hazards-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    ${renderHazardCards(hazards)}
  </div>`;
  document.getElementById('main-content').innerHTML = html;
}

function renderHazardCards(hazards) {
  if (!hazards.length) return '<div class="col-span-3 text-center py-10 text-gray-400 card p-10"><i class="fas fa-shield-alt text-4xl mb-3 block"></i>위험요소가 없습니다</div>';
  const sevColors = { critical: 'border-l-4 border-red-500', high: 'border-l-4 border-orange-400', medium: 'border-l-4 border-yellow-400', low: 'border-l-4 border-green-400' };
  return hazards.map(h => `
  <div class="card p-4 ${sevColors[h.severity]||''} hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start mb-2">
      <div class="flex gap-2 flex-wrap">${severityBadge(h.severity)} ${statusBadge(h.status)}</div>
      <div class="flex gap-1">
        <button class="text-blue-400 hover:text-blue-600 text-sm p-1" onclick='showHazardForm(${JSON.stringify(h)})'><i class="fas fa-edit"></i></button>
        <button class="text-red-400 hover:text-red-600 text-sm p-1" onclick="deleteHazard(${h.id})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <h4 class="font-bold text-gray-800 mb-1">${h.title}</h4>
    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${h.description}</p>
    <div class="space-y-1 text-xs text-gray-500">
      <div><i class="fas fa-map-marker-alt mr-1 text-gray-400"></i>${h.site_name} · ${h.location}</div>
      <div><i class="fas fa-tag mr-1 text-gray-400"></i>${h.category}</div>
      <div class="flex justify-between">
        <span><i class="fas fa-user mr-1 text-gray-400"></i>보고: ${h.reported_by}</span>
        ${h.assigned_to ? `<span><i class="fas fa-user-check mr-1 text-gray-400"></i>담당: ${h.assigned_to}</span>` : ''}
      </div>
      ${h.due_date ? `<div><i class="fas fa-calendar-alt mr-1 text-red-400"></i>조치기한: ${formatDate(h.due_date)}</div>` : ''}
    </div>
    ${h.status === 'open' || h.status === 'in_progress' ? `
    <div class="mt-3 pt-3 border-t border-gray-100 flex gap-2">
      <button class="flex-1 text-xs py-1.5 rounded bg-orange-50 text-orange-600 hover:bg-orange-100" onclick="updateHazardStatus(${h.id}, 'in_progress')">처리중</button>
      <button class="flex-1 text-xs py-1.5 rounded bg-green-50 text-green-600 hover:bg-green-100" onclick="updateHazardStatus(${h.id}, 'resolved')">해결됨</button>
    </div>` : ''}
  </div>`).join('');
}

function filterHazardsBySeverity(sev, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = sev === 'all' ? window._hazardsData : window._hazardsData.filter(h => h.severity === sev);
  document.getElementById('hazards-grid').innerHTML = renderHazardCards(filtered);
}

async function updateHazardStatus(id, status) {
  try {
    const h = window._hazardsData.find(x => x.id === id);
    if (!h) return;
    await API.put(`/hazards/${id}`, { ...h, status });
    window._hazardsData = window._hazardsData.map(x => x.id===id ? {...x, status} : x);
    renderHazardsContent(window._hazardsData);
  } catch(e) { alert('상태 변경 실패'); }
}

function showHazardForm(hazard = null) {
  const isEdit = !!hazard;
  showModal(`
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-bold text-gray-800">${isEdit ? '위험요소 수정' : '위험요소 등록'}</h3>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveHazard(event, ${hazard?.id||'null'})">
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
        <input class="form-input" name="title" value="${hazard?.title||''}" required>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s=>`<option value="${s.id}" ${hazard?.site_id==s.id?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">위치 *</label>
          <input class="form-input" name="location" value="${hazard?.location||''}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">분류 *</label>
          <select class="form-input" name="category" required>
            ${['추락','낙하','감전','화재','기계','화학물질','건강장해','기타'].map(c=>`<option value="${c}" ${hazard?.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">위험도 *</label>
          <select class="form-input" name="severity" required>
            <option value="critical" ${hazard?.severity==='critical'?'selected':''}>매우위험</option>
            <option value="high" ${hazard?.severity==='high'?'selected':''}>위험</option>
            <option value="medium" ${hazard?.severity==='medium'?'selected':''}>주의</option>
            <option value="low" ${hazard?.severity==='low'?'selected':''}>낮음</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">상세 설명 *</label>
        <textarea class="form-input" name="description" rows="3" required>${hazard?.description||''}</textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">보고자 *</label>
          <input class="form-input" name="reported_by" value="${hazard?.reported_by||''}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">담당자</label>
          <input class="form-input" name="assigned_to" value="${hazard?.assigned_to||''}">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select class="form-input" name="status">
            <option value="open" ${!hazard||hazard?.status==='open'?'selected':''}>미조치</option>
            <option value="in_progress" ${hazard?.status==='in_progress'?'selected':''}>처리중</option>
            <option value="resolved" ${hazard?.status==='resolved'?'selected':''}>해결됨</option>
            <option value="closed" ${hazard?.status==='closed'?'selected':''}>종결</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">조치기한</label>
          <input type="date" class="form-input" name="due_date" value="${hazard?.due_date||''}">
        </div>
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-6">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600">취소</button>
      <button type="submit" class="btn-primary">${isEdit ? '수정' : '등록'}</button>
    </div>
  </form>`);
}

async function saveHazard(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (id) await API.put(`/hazards/${id}`, body);
    else await API.post('/hazards', body);
    closeModal();
    renderHazards();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deleteHazard(id) {
  if (!confirm('이 위험요소를 삭제하시겠습니까?')) return;
  try { await API.delete(`/hazards/${id}`); renderHazards(); }
  catch(e) { alert('삭제 실패'); }
}

// ==================== 사고 보고 ====================
async function renderIncidents() {
  showLoading();
  try {
    const [incidentsRes, sitesRes] = await Promise.all([API.get('/incidents'), API.get('/sites')]);
    sites = sitesRes.data;
    window._incidentsData = incidentsRes.data;
    renderIncidentsContent(incidentsRes.data);
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderIncidentsContent(incidents) {
  const sevLabels = { fatal:'사망', serious:'중상', minor:'경상', near_miss:'아차사고' };
  const html = `
  <div class="flex justify-between items-center mb-4">
    <div class="flex gap-2">
      <select class="form-input w-auto text-sm" onchange="filterIncidentsBySeverity(this.value)">
        <option value="">전체 심각도</option>
        <option value="fatal">사망</option>
        <option value="serious">중상</option>
        <option value="minor">경상</option>
        <option value="near_miss">아차사고</option>
      </select>
    </div>
    <button class="btn-primary" onclick="showIncidentForm()"><i class="fas fa-plus mr-2"></i>사고 보고</button>
  </div>
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">사고명</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">현장</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">분류</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">심각도</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">부상자</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">발생일</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">상태</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">관리</th>
          </tr>
        </thead>
        <tbody id="incidents-tbody">
          ${renderIncidentRows(incidents)}
        </tbody>
      </table>
    </div>
  </div>`;
  document.getElementById('main-content').innerHTML = html;
}

function renderIncidentRows(incidents) {
  if (!incidents.length) return '<tr><td colspan="8" class="text-center py-10 text-gray-400"><i class="fas fa-first-aid text-3xl mb-2 block"></i>사고 보고가 없습니다</td></tr>';
  return incidents.map(i => `
  <tr class="table-row border-b border-gray-100">
    <td class="px-4 py-3 font-medium text-gray-800">
      <button class="text-left hover:text-blue-600" onclick="showIncidentDetail(${i.id})">${i.title}</button>
    </td>
    <td class="px-4 py-3 text-gray-600 text-xs">${i.site_name}</td>
    <td class="px-4 py-3 text-gray-600">${i.category}</td>
    <td class="px-4 py-3">${severityBadge(i.severity)}</td>
    <td class="px-4 py-3 text-gray-600">${i.injured_person || '-'}</td>
    <td class="px-4 py-3 text-gray-500 text-xs">${formatDate(i.incident_date)}</td>
    <td class="px-4 py-3">${statusBadge(i.status)}</td>
    <td class="px-4 py-3">
      <div class="flex gap-1">
        <button class="text-blue-500 hover:text-blue-700 p-1" onclick='showIncidentForm(${JSON.stringify(i)})'><i class="fas fa-edit"></i></button>
        <button class="text-red-500 hover:text-red-700 p-1" onclick="deleteIncident(${i.id})"><i class="fas fa-trash"></i></button>
      </div>
    </td>
  </tr>`).join('');
}

function filterIncidentsBySeverity(sev) {
  const filtered = sev ? window._incidentsData.filter(i => i.severity===sev) : window._incidentsData;
  document.getElementById('incidents-tbody').innerHTML = renderIncidentRows(filtered);
}

async function showIncidentDetail(id) {
  try {
    const { data } = await API.get(`/incidents/${id}`);
    showModal(`
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold text-gray-800">사고 상세 정보</h3>
      <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
    </div>
    <div class="space-y-4">
      <div class="flex gap-3 flex-wrap">${severityBadge(data.severity)} ${statusBadge(data.status)}</div>
      <h4 class="text-xl font-bold text-gray-800">${data.title}</h4>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="bg-gray-50 p-3 rounded-lg"><span class="text-gray-500">현장</span><div class="font-medium mt-1">${data.site_name}</div></div>
        <div class="bg-gray-50 p-3 rounded-lg"><span class="text-gray-500">발생일시</span><div class="font-medium mt-1">${data.incident_date} ${data.incident_time||''}</div></div>
        <div class="bg-gray-50 p-3 rounded-lg"><span class="text-gray-500">위치</span><div class="font-medium mt-1">${data.location}</div></div>
        <div class="bg-gray-50 p-3 rounded-lg"><span class="text-gray-500">분류</span><div class="font-medium mt-1">${data.category}</div></div>
        ${data.injured_person ? `<div class="bg-red-50 p-3 rounded-lg"><span class="text-gray-500">부상자</span><div class="font-medium mt-1 text-red-700">${data.injured_person}</div></div>` : ''}
        ${data.injury_type ? `<div class="bg-red-50 p-3 rounded-lg"><span class="text-gray-500">부상유형</span><div class="font-medium mt-1">${data.injury_type}</div></div>` : ''}
        <div class="bg-gray-50 p-3 rounded-lg"><span class="text-gray-500">보고자</span><div class="font-medium mt-1">${data.reported_by}</div></div>
        ${data.witness ? `<div class="bg-gray-50 p-3 rounded-lg"><span class="text-gray-500">목격자</span><div class="font-medium mt-1">${data.witness}</div></div>` : ''}
      </div>
      <div class="bg-gray-50 p-3 rounded-lg">
        <span class="text-gray-500 text-sm">사고 경위</span>
        <p class="text-gray-800 mt-1 text-sm">${data.description}</p>
      </div>
      ${data.root_cause ? `<div class="bg-orange-50 p-3 rounded-lg"><span class="text-gray-500 text-sm">근본원인</span><p class="text-gray-800 mt-1 text-sm">${data.root_cause}</p></div>` : ''}
      ${data.corrective_action ? `<div class="bg-green-50 p-3 rounded-lg"><span class="text-gray-500 text-sm">시정조치</span><p class="text-gray-800 mt-1 text-sm">${data.corrective_action}</p></div>` : ''}
    </div>
    <div class="flex justify-end mt-4">
      <button onclick="closeModal()" class="btn-primary">닫기</button>
    </div>`);
  } catch(e) { alert('상세 정보 로드 실패'); }
}

function showIncidentForm(incident = null) {
  const isEdit = !!incident;
  showModal(`
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-bold text-gray-800">${isEdit ? '사고 수정' : '사고 보고'}</h3>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveIncident(event, ${incident?.id||'null'})">
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">사고 제목 *</label>
        <input class="form-input" name="title" value="${incident?.title||''}" required>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s=>`<option value="${s.id}" ${incident?.site_id==s.id?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">발생 위치 *</label>
          <input class="form-input" name="location" value="${incident?.location||''}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">발생 날짜 *</label>
          <input type="date" class="form-input" name="incident_date" value="${incident?.incident_date||new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">발생 시간</label>
          <input type="time" class="form-input" name="incident_time" value="${incident?.incident_time||''}">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">분류 *</label>
          <select class="form-input" name="category" required>
            ${['부상','아차사고','재산피해','환경오염','기타'].map(c=>`<option value="${c}" ${incident?.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">심각도 *</label>
          <select class="form-input" name="severity" required>
            <option value="fatal" ${incident?.severity==='fatal'?'selected':''}>사망</option>
            <option value="serious" ${incident?.severity==='serious'?'selected':''}>중상</option>
            <option value="minor" ${!incident||incident?.severity==='minor'?'selected':''}>경상</option>
            <option value="near_miss" ${incident?.severity==='near_miss'?'selected':''}>아차사고</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">부상자</label>
          <input class="form-input" name="injured_person" value="${incident?.injured_person||''}">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">부상 유형</label>
          <input class="form-input" name="injury_type" value="${incident?.injury_type||''}" placeholder="골절, 타박상, 찰과상...">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">보고자 *</label>
          <input class="form-input" name="reported_by" value="${incident?.reported_by||''}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">목격자</label>
          <input class="form-input" name="witness" value="${incident?.witness||''}">
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">사고 경위 *</label>
        <textarea class="form-input" name="description" rows="3" required>${incident?.description||''}</textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">근본원인</label>
        <textarea class="form-input" name="root_cause" rows="2">${incident?.root_cause||''}</textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">시정조치</label>
        <textarea class="form-input" name="corrective_action" rows="2">${incident?.corrective_action||''}</textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
        <select class="form-input" name="status">
          <option value="open" ${!incident||incident?.status==='open'?'selected':''}>미조치</option>
          <option value="investigating" ${incident?.status==='investigating'?'selected':''}>조사중</option>
          <option value="resolved" ${incident?.status==='resolved'?'selected':''}>해결됨</option>
          <option value="closed" ${incident?.status==='closed'?'selected':''}>종결</option>
        </select>
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-6">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600">취소</button>
      <button type="submit" class="btn-primary">${isEdit ? '수정' : '보고'}</button>
    </div>
  </form>`);
}

async function saveIncident(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (id) await API.put(`/incidents/${id}`, body);
    else await API.post('/incidents', body);
    closeModal();
    renderIncidents();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deleteIncident(id) {
  if (!confirm('이 사고 보고를 삭제하시겠습니까?')) return;
  try { await API.delete(`/incidents/${id}`); renderIncidents(); }
  catch(e) { alert('삭제 실패'); }
}

// ==================== 안전점검 ====================
async function renderInspections() {
  showLoading();
  try {
    const [inspRes, sitesRes] = await Promise.all([API.get('/inspections'), API.get('/sites')]);
    sites = sitesRes.data;
    const inspections = inspRes.data;

    const html = `
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-gray-500">총 ${inspections.length}건의 점검</div>
      <button class="btn-primary" onclick="showInspectionForm()"><i class="fas fa-plus mr-2"></i>점검 등록</button>
    </div>
    <div class="space-y-3">
      ${inspections.map(i => {
        const score = i.total_items > 0 ? Math.round((i.passed_items/i.total_items)*100) : 0;
        const scoreColor = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600';
        const catColors = { 일일: 'bg-blue-100 text-blue-700', 주간: 'bg-purple-100 text-purple-700', 월간: 'bg-orange-100 text-orange-700', 특별: 'bg-red-100 text-red-700' };
        return `
        <div class="card p-4 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="text-center min-w-16">
                <div class="text-2xl font-bold ${scoreColor}">${i.status==='pending'?'-':score+'%'}</div>
                <div class="text-xs text-gray-400">점수</div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="font-bold text-gray-800">${i.title}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full ${catColors[i.category]||'bg-gray-100 text-gray-600'}">${i.category}</span>
                  ${statusBadge(i.status)}
                </div>
                <div class="text-xs text-gray-500">
                  <i class="fas fa-building mr-1"></i>${i.site_name}
                  <span class="mx-2">·</span>
                  <i class="fas fa-user mr-1"></i>${i.inspector}
                  <span class="mx-2">·</span>
                  <i class="fas fa-calendar mr-1"></i>${formatDate(i.inspection_date)}
                </div>
                ${i.status !== 'pending' ? `
                <div class="mt-2 flex items-center gap-3 text-xs">
                  <span class="text-green-600"><i class="fas fa-check mr-1"></i>적합 ${i.passed_items}/${i.total_items}</span>
                  <span class="text-red-600"><i class="fas fa-times mr-1"></i>부적합 ${i.failed_items}</span>
                  ${i.notes ? `<span class="text-gray-500 italic">"${i.notes}"</span>` : ''}
                </div>` : ''}
              </div>
            </div>
            <div class="flex gap-2 ml-4">
              ${i.status === 'pending' || i.status === 'in_progress' ? `<button class="btn-success text-xs py-1.5 px-3" onclick="startInspection(${i.id})"><i class="fas fa-play mr-1"></i>점검 시작</button>` : ''}
              <button class="text-red-400 hover:text-red-600 p-2" onclick="deleteInspection(${i.id})"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>`;
      }).join('') || '<div class="card p-10 text-center text-gray-400"><i class="fas fa-clipboard-check text-4xl mb-3 block"></i>등록된 점검이 없습니다</div>'}
    </div>`;
    document.getElementById('main-content').innerHTML = html;
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

async function startInspection(id) {
  try {
    const { data } = await API.get(`/inspections/${id}`);
    showInspectionChecklist(data);
  } catch(e) { alert('점검 로드 실패'); }
}

function showInspectionChecklist(insp) {
  const categories = [...new Set(insp.items.map(i => i.category))];
  const itemsByCategory = {};
  categories.forEach(c => { itemsByCategory[c] = insp.items.filter(i => i.category === c); });

  const html = `
  <div class="flex justify-between items-center mb-4">
    <div>
      <h3 class="text-lg font-bold text-gray-800">${insp.title}</h3>
      <p class="text-sm text-gray-500">${insp.site_name} · ${insp.inspector} · ${formatDate(insp.inspection_date)}</p>
    </div>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveInspection(event, ${insp.id})">
    <div class="space-y-4 mb-4">
      ${categories.map(cat => `
      <div>
        <h4 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <i class="fas fa-folder text-blue-400"></i>${cat}
        </h4>
        <div class="space-y-2">
          ${itemsByCategory[cat].map(item => `
          <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-700">${item.item}</div>
              <input type="hidden" name="item_id_${item.id}" value="${item.id}">
            </div>
            <div class="flex gap-2">
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="item_${item.id}" value="pass" ${item.result==='pass'?'checked':''} class="accent-green-500">
                <span class="text-xs text-green-600 font-medium">적합</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="item_${item.id}" value="fail" ${item.result==='fail'?'checked':''} class="accent-red-500">
                <span class="text-xs text-red-600 font-medium">부적합</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="item_${item.id}" value="na" ${item.result==='na'?'checked':''} class="accent-gray-400">
                <span class="text-xs text-gray-400 font-medium">해당없음</span>
              </label>
            </div>
          </div>`).join('')}
        </div>
      </div>`).join('')}
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">종합 의견</label>
      <textarea class="form-input" name="notes" rows="2" placeholder="점검 결과 종합 의견...">${insp.notes||''}</textarea>
    </div>
    <input type="hidden" name="item_ids" value="${insp.items.map(i=>i.id).join(',')}">
    <div class="flex justify-end gap-3 mt-4">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600">취소</button>
      <button type="submit" name="action" value="save" class="px-4 py-2 bg-blue-500 text-white rounded-lg">임시저장</button>
      <button type="submit" name="action" value="complete" class="btn-success">점검완료</button>
    </div>
  </form>`;
  showModal(html);
}

async function saveInspection(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const action = e.submitter?.value || 'save';
  const itemIds = (fd.get('item_ids')||'').split(',').filter(Boolean);
  const items = itemIds.map(itemId => ({
    id: parseInt(itemId),
    result: fd.get(`item_${itemId}`) || null,
    notes: fd.get(`notes_${itemId}`) || null,
  }));
  const notes = fd.get('notes');
  const status = action === 'complete' ? 'completed' : 'in_progress';
  try {
    await API.put(`/inspections/${id}`, { items, notes, status });
    closeModal();
    renderInspections();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

function showInspectionForm() {
  showModal(`
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-bold text-gray-800">안전점검 등록</h3>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="createInspection(event)">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">점검명 *</label>
        <input class="form-input" name="title" placeholder="예: 3월 주간 안전점검" required>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">점검 유형 *</label>
          <select class="form-input" name="category" required>
            <option>일일</option><option>주간</option><option>월간</option><option>특별</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">점검일 *</label>
          <input type="date" class="form-input" name="inspection_date" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">점검자 *</label>
          <input class="form-input" name="inspector" required>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <input class="form-input" name="notes" placeholder="점검 관련 특이사항">
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-6">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600">취소</button>
      <button type="submit" class="btn-primary">등록</button>
    </div>
  </form>`);
}

async function createInspection(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    await API.post('/inspections', body);
    closeModal();
    renderInspections();
  } catch(err) { alert('등록 실패: ' + err.message); }
}

async function deleteInspection(id) {
  if (!confirm('이 점검을 삭제하시겠습니까?')) return;
  try { await API.delete(`/inspections/${id}`); renderInspections(); }
  catch(e) { alert('삭제 실패'); }
}

// ==================== 안전교육 ====================
async function renderTrainings() {
  showLoading();
  try {
    const [trainRes, sitesRes] = await Promise.all([API.get('/trainings'), API.get('/sites')]);
    sites = sitesRes.data;
    const trainings = trainRes.data;

    const catColors = { 신규채용: 'bg-blue-100 text-blue-700', 정기: 'bg-green-100 text-green-700', 특별: 'bg-red-100 text-red-700', 관리감독자: 'bg-purple-100 text-purple-700' };

    const html = `
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-gray-500">총 ${trainings.length}건의 교육</div>
      <button class="btn-primary" onclick="showTrainingForm()"><i class="fas fa-plus mr-2"></i>교육 등록</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${trainings.map(t => `
      <div class="card p-4 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-3">
          <span class="text-xs px-2 py-1 rounded-full ${catColors[t.category]||'bg-gray-100 text-gray-600'}">${t.category} 교육</span>
          <button class="text-red-400 hover:text-red-600 text-sm" onclick="deleteTraining(${t.id})"><i class="fas fa-trash"></i></button>
        </div>
        <h4 class="font-bold text-gray-800 mb-2">${t.title}</h4>
        <div class="space-y-1 text-sm text-gray-600">
          <div><i class="fas fa-building mr-2 text-gray-400"></i>${t.site_name}</div>
          <div><i class="fas fa-calendar mr-2 text-gray-400"></i>${formatDate(t.training_date)}</div>
          <div><i class="fas fa-chalkboard-teacher mr-2 text-gray-400"></i>강사: ${t.trainer}</div>
          <div class="flex gap-4">
            <span><i class="fas fa-clock mr-1 text-gray-400"></i>${t.duration ? t.duration+'분' : '-'}</span>
            <span><i class="fas fa-users mr-1 text-gray-400"></i>${t.participant_count}명 참여</span>
          </div>
        </div>
        ${t.content ? `<div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 line-clamp-2">${t.content}</div>` : ''}
      </div>`).join('') || '<div class="col-span-2 card p-10 text-center text-gray-400"><i class="fas fa-graduation-cap text-4xl mb-3 block"></i>등록된 교육이 없습니다</div>'}
    </div>`;
    document.getElementById('main-content').innerHTML = html;
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function showTrainingForm() {
  showModal(`
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-bold text-gray-800">안전교육 등록</h3>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveTraining(event)">
    <div class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">교육명 *</label>
        <input class="form-input" name="title" required>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">교육 유형 *</label>
          <select class="form-input" name="category" required>
            <option>신규채용</option><option>정기</option><option>특별</option><option>관리감독자</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">교육일 *</label>
          <input type="date" class="form-input" name="training_date" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">강사 *</label>
          <input class="form-input" name="trainer" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">교육시간(분)</label>
          <input type="number" class="form-input" name="duration" placeholder="120">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">참여 인원</label>
          <input type="number" class="form-input" name="participant_count" value="0">
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">교육 내용</label>
        <textarea class="form-input" name="content" rows="3" placeholder="교육 내용을 입력하세요..."></textarea>
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-6">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600">취소</button>
      <button type="submit" class="btn-primary">등록</button>
    </div>
  </form>`);
}

async function saveTraining(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    await API.post('/trainings', body);
    closeModal();
    renderTrainings();
  } catch(err) { alert('등록 실패: ' + err.message); }
}

async function deleteTraining(id) {
  if (!confirm('이 교육 기록을 삭제하시겠습니까?')) return;
  try { await API.delete(`/trainings/${id}`); renderTrainings(); }
  catch(e) { alert('삭제 실패'); }
}

// ==================== 초기 실행 ====================
navigate('dashboard');

// ==================== 위험성평가(최초) ====================

const RISK_LEVEL_MAP = {
  very_high: { label: '매우높음', cls: 'bg-red-100 text-red-700 border border-red-300', dot: 'bg-red-500' },
  high:      { label: '높음',     cls: 'bg-orange-100 text-orange-700 border border-orange-300', dot: 'bg-orange-500' },
  medium:    { label: '보통',     cls: 'bg-yellow-100 text-yellow-700 border border-yellow-300', dot: 'bg-yellow-400' },
  low:       { label: '낮음',     cls: 'bg-green-100 text-green-700 border border-green-300', dot: 'bg-green-500' },
};

const RA_STATUS_MAP = {
  draft:       { label: '작성중',  cls: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '검토중',  cls: 'bg-blue-100 text-blue-700' },
  completed:   { label: '완료',    cls: 'bg-green-100 text-green-700' },
  approved:    { label: '승인됨',  cls: 'bg-purple-100 text-purple-700' },
};

function calcRiskLevel(freq, intensity) {
  const score = freq * intensity;
  if (score >= 15) return 'very_high';
  if (score >= 9)  return 'high';
  if (score >= 4)  return 'medium';
  return 'low';
}

function riskLevelBadge(level) {
  const r = RISK_LEVEL_MAP[level] || RISK_LEVEL_MAP.low;
  return `<span class="text-xs px-2 py-0.5 rounded-full font-semibold ${r.cls}">${r.label}</span>`;
}

function raStatusBadge(s) {
  const r = RA_STATUS_MAP[s] || RA_STATUS_MAP.draft;
  return `<span class="text-xs px-2 py-0.5 rounded-full font-medium ${r.cls}">${r.label}</span>`;
}

async function renderRiskAssessments() {
  showLoading();
  try {
    const [raRes, sitesRes] = await Promise.all([
      API.get('/risk-assessments', { params: { assessment_type: 'initial' } }),
      API.get('/sites')
    ]);
    sites = sitesRes.data;
    window._raData = raRes.data;
    renderRiskAssessmentsContent(raRes.data);
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderRiskAssessmentsContent(list) {
  const counts = { total: list.length, draft: 0, in_progress: 0, completed: 0, approved: 0 };
  list.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  const html = `
  <!-- 상단 요약 카드 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
        <i class="fas fa-file-alt text-blue-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-gray-800">${counts.total}</div><div class="text-xs text-gray-500">전체</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
        <i class="fas fa-pencil-alt text-gray-500 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-gray-700">${counts.draft}</div><div class="text-xs text-gray-500">작성중</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
        <i class="fas fa-check-circle text-green-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-green-700">${counts.completed}</div><div class="text-xs text-gray-500">완료</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
        <i class="fas fa-stamp text-purple-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-purple-700">${counts.approved}</div><div class="text-xs text-gray-500">승인됨</div></div>
    </div>
  </div>

  <!-- 필터 & 등록 버튼 -->
  <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
    <div class="flex gap-2 flex-wrap">
      <select id="ra-site-filter" class="form-input w-auto text-sm" onchange="applyRaFilter()">
        <option value="">전체 현장</option>
        ${sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <select id="ra-status-filter" class="form-input w-auto text-sm" onchange="applyRaFilter()">
        <option value="">전체 상태</option>
        <option value="draft">작성중</option>
        <option value="in_progress">검토중</option>
        <option value="completed">완료</option>
        <option value="approved">승인됨</option>
      </select>
    </div>
    <button class="btn-primary text-sm" onclick="showRaForm()">
      <i class="fas fa-plus mr-1"></i>위험성평가 등록
    </button>
  </div>

  <!-- 목록 -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">공종</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">작업내용</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">중점위험요인</th>
            <th class="text-center px-4 py-3 text-gray-600 font-semibold">빈도</th>
            <th class="text-center px-4 py-3 text-gray-600 font-semibold">강도</th>
            <th class="text-center px-4 py-3 text-gray-600 font-semibold">등급</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">구체적개선대책</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">평가일</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">평가자</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">상태</th>
            <th class="text-left px-4 py-3 text-gray-600 font-semibold">관리</th>
          </tr>
        </thead>
        <tbody id="ra-tbody">
          ${renderRaRows(list)}
        </tbody>
      </table>
    </div>
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}

function renderRaRows(list) {
  if (!list.length) return `
    <tr><td colspan="11" class="text-center py-12 text-gray-400">
      <i class="fas fa-search text-4xl mb-3 block"></i>등록된 위험성평가가 없습니다
    </td></tr>`;

  return list.map(r => {
    const rLevel = RISK_LEVEL_MAP[r.risk_grade] || RISK_LEVEL_MAP.low;
    return `
  <tr class="table-row border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer" onclick="openRaDetail(${r.id})">
    <td class="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">${r.work_category || '-'}</td>
    <td class="px-4 py-3 font-medium text-blue-700 hover:underline">${r.title}</td>
    <td class="px-4 py-3 text-gray-600 text-sm max-w-48"><div class="line-clamp-2">${r.key_hazard || '-'}</div></td>
    <td class="px-4 py-3 text-center text-gray-700 font-semibold">${r.frequency || 1}</td>
    <td class="px-4 py-3 text-center text-gray-700 font-semibold">${r.intensity || 1}</td>
    <td class="px-4 py-3 text-center">
      <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${rLevel.cls}">${rLevel.label}</span>
    </td>
    <td class="px-4 py-3 text-gray-600 text-sm max-w-56"><div class="line-clamp-2">${r.specific_countermeasure || '-'}</div></td>
    <td class="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">${formatDate(r.assessment_date)}</td>
    <td class="px-4 py-3 text-gray-700 whitespace-nowrap">${r.assessor}</td>
    <td class="px-4 py-3">${raStatusBadge(r.status)}</td>
    <td class="px-4 py-3" onclick="event.stopPropagation()">
      <div class="flex gap-1">
        <button class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
          onclick='showRaForm(${JSON.stringify(r).replace(/'/g,"&#39;")})'>
          <i class="fas fa-edit"></i>
        </button>
        <button class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
          onclick="deleteRa(${r.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </td>
  </tr>`;
  }).join('');
}

function applyRaFilter() {
  const siteId = document.getElementById('ra-site-filter')?.value || '';
  const status = document.getElementById('ra-status-filter')?.value || '';
  let filtered = window._raData || [];
  if (siteId)  filtered = filtered.filter(r => String(r.site_id) === siteId);
  if (status)  filtered = filtered.filter(r => r.status === status);
  document.getElementById('ra-tbody').innerHTML = renderRaRows(filtered);
}

function showRaForm(ra = null) {
  const isEdit = !!ra;
  const initFreq  = ra?.frequency  || 1;
  const initInt   = ra?.intensity  || 1;
  const initGrade = ra?.risk_grade || calcRiskLevel(initFreq, initInt);

  const freqOpts = [1,2,3,4,5].map(v =>
    `<option value="${v}" ${initFreq==v?'selected':''}>${v} - ${{1:'거의없음',2:'가끔',3:'보통',4:'자주',5:'매우자주'}[v]}</option>`
  ).join('');
  const intOpts = [1,2,3,4,5].map(v =>
    `<option value="${v}" ${initInt==v?'selected':''}>${v} - ${{1:'미미',2:'경미',3:'보통',4:'심각',5:'재해/사망'}[v]}</option>`
  ).join('');

  showModal(`
  <div class="flex justify-between items-center mb-5">
    <div>
      <h3 class="text-lg font-bold text-gray-800">${isEdit ? '위험성평가 수정' : '위험성평가 등록'}</h3>
      <p class="text-xs text-gray-400 mt-0.5">* 필수 입력 항목</p>
    </div>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveRa(event, ${ra?.id || 'null'})">
    <div class="space-y-3">

      <!-- 공종 + 작업내용 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">공종 *</label>
          <input class="form-input" name="work_category" value="${ra?.work_category || ''}" required placeholder="예: 철근공사, 거푸집공사">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">작업내용 *</label>
          <input class="form-input" name="title" value="${ra?.title || ''}" required placeholder="예: 철근 배근 및 운반 작업">
        </div>
      </div>

      <!-- 현장 + 작업유형 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s => `<option value="${s.id}" ${ra?.site_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">작업유형 *</label>
          <input class="form-input" name="work_type" value="${ra?.work_type || ''}" required placeholder="예: 고소작업, 굴착작업">
        </div>
      </div>

      <!-- 중점위험요인 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">중점위험요인</label>
        <textarea class="form-input" name="key_hazard" rows="2" placeholder="예: 2m 이상 고소작업 시 추락, 낙하물에 의한 충격">${ra?.key_hazard || ''}</textarea>
      </div>

      <!-- 빈도 / 강도 / 등급 -->
      <div class="bg-red-50 rounded-lg p-3">
        <div class="text-xs font-bold text-red-700 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>위험성 (빈도 × 강도 → 등급 자동계산)</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">빈도(가능성) *</label>
            <select class="form-input text-xs" name="frequency" required onchange="updateRaFormGrade(this.form)">${freqOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">강도(중대성) *</label>
            <select class="form-input text-xs" name="intensity" required onchange="updateRaFormGrade(this.form)">${intOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">등급 (자동계산)</label>
            <div id="ra-form-grade-preview" class="mt-1 text-center">${riskLevelBadge(initGrade)}</div>
          </div>
        </div>
      </div>

      <!-- 구체적개선대책 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">구체적개선대책</label>
        <textarea class="form-input" name="specific_countermeasure" rows="3" placeholder="예: 안전난간 설치, 안전대 착용 의무화, 낙하물 방지망 설치">${ra?.specific_countermeasure || ''}</textarea>
      </div>

      <!-- 평가일 / 평가자 / 부서 / 상태 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">평가일 *</label>
          <input type="date" class="form-input" name="assessment_date" value="${ra?.assessment_date || new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">평가자 *</label>
          <input class="form-input" name="assessor" value="${ra?.assessor || ''}" required placeholder="홍길동">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">부서/팀</label>
          <input class="form-input" name="department" value="${ra?.department || ''}" placeholder="안전관리팀">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select class="form-input" name="status">
            <option value="draft"       ${(!ra || ra.status === 'draft')       ? 'selected' : ''}>작성중</option>
            <option value="in_progress" ${ra?.status === 'in_progress'         ? 'selected' : ''}>검토중</option>
            <option value="completed"   ${ra?.status === 'completed'           ? 'selected' : ''}>완료</option>
            <option value="approved"    ${ra?.status === 'approved'            ? 'selected' : ''}>승인됨</option>
          </select>
        </div>
        ${isEdit && ra.status === 'approved' ? `
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">승인일</label>
          <input type="date" class="form-input" name="approval_date" value="${ra?.approval_date || ''}">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">승인자</label>
          <input class="form-input" name="approver" value="${ra?.approver || ''}">
        </div>` : ''}
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <textarea class="form-input" name="notes" rows="2">${ra?.notes || ''}</textarea>
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-6 border-t pt-4">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm">취소</button>
      <button type="submit" class="btn-primary text-sm">${isEdit ? '수정 저장' : '등록'}</button>
    </div>
  </form>`);
}

function updateRaFormGrade(form) {
  const f = parseInt(form.frequency?.value || 1);
  const i = parseInt(form.intensity?.value || 1);
  const el = document.getElementById('ra-form-grade-preview');
  if (el) el.innerHTML = riskLevelBadge(calcRiskLevel(f, i));
}

async function saveRa(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (id) await API.put(`/risk-assessments/${id}`, body);
    else    await API.post('/risk-assessments', body);
    closeModal();
    renderRiskAssessments();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deleteRa(id) {
  if (!confirm('이 위험성평가를 삭제하시겠습니까?\n(모든 평가 항목도 함께 삭제됩니다)')) return;
  try { await API.delete(`/risk-assessments/${id}`); renderRiskAssessments(); }
  catch(e) { alert('삭제 실패'); }
}

// ── 위험성평가 상세(항목 관리) ──────────────────────────────
async function openRaDetail(id) {
  showLoading();
  try {
    const { data } = await API.get(`/risk-assessments/${id}`);
    window._currentRa = data;
    renderRaDetail(data);
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderRaDetail(ra) {
  const items = ra.items || [];
  const totalItems = items.length;
  const vhCount = items.filter(i => i.before_risk_level === 'very_high').length;
  const hCount  = items.filter(i => i.before_risk_level === 'high').length;
  const mCount  = items.filter(i => i.before_risk_level === 'medium').length;
  const lCount  = items.filter(i => i.before_risk_level === 'low').length;

  const hazardTypes = ['추락','낙하','감전','화재','폭발','충돌','협착','무너짐','화학물질','건강장해','기타'];
  const ctTypes = ['제거','대체','공학적 대책','관리적 대책','개인보호구'];
  const freqLabels = { 1:'거의없음(1)', 2:'가끔(2)', 3:'보통(3)', 4:'자주(4)', 5:'매우자주(5)' };
  const intLabels  = { 1:'미미(1)', 2:'경미(2)', 3:'보통(3)', 4:'심각(4)', 5:'재해(5)' };

  const html = `
  <!-- 뒤로가기 + 헤더 -->
  <div class="flex items-center gap-3 mb-5">
    <button onclick="renderRiskAssessments()" class="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100">
      <i class="fas fa-arrow-left text-lg"></i>
    </button>
    <div class="flex-1">
      <div class="flex items-center gap-3 flex-wrap">
        <h2 class="text-xl font-bold text-gray-800">${ra.title}</h2>
        ${raStatusBadge(ra.status)}
      </div>
      <div class="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
        ${ra.work_category ? `<span><i class="fas fa-layer-group mr-1"></i>공종: <b class="text-gray-700">${ra.work_category}</b></span>` : ''}
        <span><i class="fas fa-building mr-1"></i>${ra.site_name}</span>
        <span><i class="fas fa-tools mr-1"></i>${ra.work_type}</span>
        <span><i class="fas fa-calendar mr-1"></i>${formatDate(ra.assessment_date)}</span>
        <span><i class="fas fa-user mr-1"></i>${ra.assessor}</span>
        ${ra.key_hazard ? `<span class="text-orange-600"><i class="fas fa-exclamation-triangle mr-1"></i>중점위험: ${ra.key_hazard}</span>` : ''}
      </div>
    </div>
    <button class="btn-primary text-sm" onclick='showRaForm(${JSON.stringify(ra).replace(/'/g,"&#39;")})'>
      <i class="fas fa-edit mr-1"></i>정보 수정
    </button>
  </div>

  <!-- 위험성 요약 카드 -->
  <div class="grid grid-cols-4 gap-3 mb-5">
    <div class="card p-3 flex items-center gap-3 border-l-4 border-red-500">
      <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><i class="fas fa-exclamation-circle text-red-600"></i></div>
      <div><div class="text-xl font-bold text-red-600">${vhCount}</div><div class="text-xs text-gray-500">매우높음</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-orange-400">
      <div class="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center"><i class="fas fa-exclamation-triangle text-orange-500"></i></div>
      <div><div class="text-xl font-bold text-orange-500">${hCount}</div><div class="text-xs text-gray-500">높음</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-yellow-400">
      <div class="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center"><i class="fas fa-exclamation text-yellow-500"></i></div>
      <div><div class="text-xl font-bold text-yellow-600">${mCount}</div><div class="text-xs text-gray-500">보통</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-green-500">
      <div class="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><i class="fas fa-check-circle text-green-600"></i></div>
      <div><div class="text-xl font-bold text-green-600">${lCount}</div><div class="text-xs text-gray-500">낮음</div></div>
    </div>
  </div>

  <!-- 평가 항목 테이블 -->
  <div class="card overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
      <h3 class="font-bold text-gray-800"><i class="fas fa-list-ol mr-2 text-blue-500"></i>위험성 평가 항목 <span class="text-blue-600">(${totalItems}건)</span></h3>
      <button class="btn-primary text-xs py-1.5 px-3" onclick="showRaItemForm(${ra.id}, null, ${totalItems + 1})">
        <i class="fas fa-plus mr-1"></i>항목 추가
      </button>
    </div>

    <!-- 위험성 매트릭스 범례 -->
    <div class="px-5 py-3 bg-blue-50 border-b flex flex-wrap gap-4 text-xs text-gray-600 items-center">
      <span class="font-semibold text-blue-700"><i class="fas fa-info-circle mr-1"></i>위험성 = 빈도 × 강도</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span>매우높음(15↑)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>높음(9~14)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>보통(4~8)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-400 inline-block"></span>낮음(1~3)</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs" style="min-width:1100px">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-2 py-2 text-gray-600 font-semibold text-center w-8">No.</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">작업단계</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">유해·위험요인</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">사고유형</th>
            <th colspan="3" class="px-2 py-2 text-gray-600 font-semibold text-center bg-red-50">현재 위험성(전)</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">감소대책</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-center">대책유형</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-center">담당자</th>
            <th colspan="3" class="px-2 py-2 text-gray-600 font-semibold text-center bg-green-50">잔여 위험성(후)</th>
            <th class="px-2 py-2 text-gray-600 font-semibold text-center">관리</th>
          </tr>
          <tr class="bg-gray-50 border-b text-xs text-gray-500">
            <th></th><th></th><th></th><th></th>
            <th class="px-2 py-1 text-center bg-red-50">빈도</th>
            <th class="px-2 py-1 text-center bg-red-50">강도</th>
            <th class="px-2 py-1 text-center bg-red-50">위험성</th>
            <th></th><th></th><th></th>
            <th class="px-2 py-1 text-center bg-green-50">빈도</th>
            <th class="px-2 py-1 text-center bg-green-50">강도</th>
            <th class="px-2 py-1 text-center bg-green-50">위험성</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="ra-items-tbody">
          ${renderRaItemRows(items, ra.id)}
        </tbody>
      </table>
    </div>
    ${totalItems === 0 ? '' : ''}
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}

function renderRaItemRows(items, raId, source = 'initial') {
  if (!items.length) return `
    <tr><td colspan="14" class="text-center py-10 text-gray-400">
      <i class="fas fa-list-ol text-3xl mb-2 block"></i>
      평가 항목이 없습니다. [항목 추가] 버튼을 눌러 위험요인을 등록하세요.
    </td></tr>`;

  return items.map(item => {
    const bLevel = RISK_LEVEL_MAP[item.before_risk_level] || RISK_LEVEL_MAP.low;
    const aLevel = RISK_LEVEL_MAP[item.after_risk_level]  || RISK_LEVEL_MAP.low;
    return `
    <tr class="border-b border-gray-100 hover:bg-gray-50/80">
      <td class="px-2 py-2.5 text-center text-gray-500 font-medium">${item.no}</td>
      <td class="px-3 py-2.5 text-gray-800 font-medium whitespace-nowrap">${item.work_step}</td>
      <td class="px-3 py-2.5 text-gray-700">
        <div class="font-medium">${item.hazard_description}</div>
        <div class="text-gray-400 text-xs mt-0.5">${item.hazard_type}</div>
      </td>
      <td class="px-3 py-2.5 text-gray-700 whitespace-nowrap">${item.possible_accident}</td>
      <td class="px-2 py-2.5 text-center bg-red-50/50 text-gray-700">${item.before_frequency}</td>
      <td class="px-2 py-2.5 text-center bg-red-50/50 text-gray-700">${item.before_intensity}</td>
      <td class="px-2 py-2.5 text-center bg-red-50/50">
        <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${bLevel.cls}">${bLevel.label}</span>
      </td>
      <td class="px-3 py-2.5 text-gray-700 max-w-48">
        <div class="line-clamp-2">${item.countermeasure || '-'}</div>
      </td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">
        ${item.countermeasure_type ? `<span class="bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded">${item.countermeasure_type}</span>` : '-'}
      </td>
      <td class="px-3 py-2.5 text-center text-gray-600 whitespace-nowrap">${item.responsible || '-'}</td>
      <td class="px-2 py-2.5 text-center bg-green-50/50 text-gray-700">${item.after_frequency}</td>
      <td class="px-2 py-2.5 text-center bg-green-50/50 text-gray-700">${item.after_intensity}</td>
      <td class="px-2 py-2.5 text-center bg-green-50/50">
        <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${aLevel.cls}">${aLevel.label}</span>
      </td>
      <td class="px-2 py-2.5 text-center">
        <div class="flex items-center justify-center gap-1">
          <button class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
            onclick='showRaItemForm(${raId}, ${JSON.stringify(item).replace(/'/g,"&#39;")}, null, "${source}")'>
            <i class="fas fa-edit"></i>
          </button>
          <button class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
            onclick="deleteRaItem(${raId}, ${item.id}, '${source}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function showRaItemForm(raId, item = null, nextNo = null, source = 'initial') {
  const isEdit = !!item;
  const hazardTypes = ['추락','낙하','감전','화재','폭발','충돌/격돌','협착/끼임','무너짐','화학물질','소음/진동','건강장해','기타'];
  const ctTypes = ['제거','대체','공학적 대책','관리적 대책','개인보호구'];

  const freqOpts = [1,2,3,4,5].map(v => `<option value="${v}" ${(item?.before_frequency||1)==v?'selected':''}>${v} - ${{1:'거의없음',2:'가끔',3:'보통',4:'자주',5:'매우자주'}[v]}</option>`).join('');
  const intOpts  = [1,2,3,4,5].map(v => `<option value="${v}" ${(item?.before_intensity||1)==v?'selected':''}>${v} - ${{1:'미미',2:'경미',3:'보통',4:'심각',5:'재해/사망'}[v]}</option>`).join('');
  const aFreqOpts= [1,2,3,4,5].map(v => `<option value="${v}" ${(item?.after_frequency||1)==v?'selected':''}>${v} - ${{1:'거의없음',2:'가끔',3:'보통',4:'자주',5:'매우자주'}[v]}</option>`).join('');
  const aIntOpts = [1,2,3,4,5].map(v => `<option value="${v}" ${(item?.after_intensity||1)==v?'selected':''}>${v} - ${{1:'미미',2:'경미',3:'보통',4:'심각',5:'재해/사망'}[v]}</option>`).join('');

  showModal(`
  <div class="flex justify-between items-center mb-4">
    <div>
      <h3 class="text-lg font-bold text-gray-800">${isEdit ? '평가 항목 수정' : '평가 항목 추가'}</h3>
      <p class="text-xs text-gray-400 mt-0.5">빈도 × 강도로 위험성 수준이 자동 계산됩니다</p>
    </div>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveRaItem(event, ${raId}, ${item?.id || 'null'}, '${source}')">  
    <div class="space-y-4">

      <!-- 작업 단계 / 위험요인 분류 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">No.</label>
          <input type="number" class="form-input" name="no" value="${item?.no || nextNo || 1}" required min="1">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">작업 단계(공정) *</label>
          <input class="form-input" name="work_step" value="${item?.work_step || ''}" required placeholder="예: 철근 운반">
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">유해·위험요인 분류 *</label>
          <select class="form-input" name="hazard_type" required>
            ${hazardTypes.map(t => `<option value="${t}" ${item?.hazard_type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1">사고 유형 *</label>
          <input class="form-input" name="possible_accident" value="${item?.possible_accident || ''}" required placeholder="예: 추락, 낙하물 충격">
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-semibold text-gray-600 mb-1">유해·위험요인 설명 *</label>
          <textarea class="form-input" name="hazard_description" rows="2" required placeholder="예: 2m 이상 고소 작업 시 안전난간 미설치로 인한 작업자 추락 위험">${item?.hazard_description || ''}</textarea>
        </div>
      </div>

      <!-- 현재 위험성 -->
      <div class="bg-red-50 rounded-lg p-3">
        <div class="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
          <i class="fas fa-exclamation-triangle"></i> 현재 위험성 (개선 전)
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">빈도(가능성) *</label>
            <select class="form-input text-xs" name="before_frequency" required onchange="updateRiskPreview(this.form)">${freqOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">강도(중대성) *</label>
            <select class="form-input text-xs" name="before_intensity" required onchange="updateRiskPreview(this.form)">${intOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">위험성 수준</label>
            <div id="before-risk-preview" class="mt-1 text-center">${riskLevelBadge(item?.before_risk_level || calcRiskLevel(item?.before_frequency||1, item?.before_intensity||1))}</div>
          </div>
        </div>
      </div>

      <!-- 감소대책 -->
      <div class="bg-indigo-50 rounded-lg p-3">
        <div class="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1">
          <i class="fas fa-shield-alt"></i> 감소 대책
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="block text-xs text-gray-600 mb-1">감소대책 내용</label>
            <textarea class="form-input text-xs" name="countermeasure" rows="2" placeholder="예: 안전난간 설치, 안전대 착용 의무화, 작업발판 설치">${item?.countermeasure || ''}</textarea>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">대책 유형</label>
            <select class="form-input text-xs" name="countermeasure_type">
              <option value="">선택</option>
              ${ctTypes.map(t => `<option value="${t}" ${item?.countermeasure_type===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">담당자</label>
            <input class="form-input text-xs" name="responsible" value="${item?.responsible || ''}" placeholder="홍길동">
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">이행 기한</label>
            <input type="date" class="form-input text-xs" name="due_date" value="${item?.due_date || ''}">
          </div>
        </div>
      </div>

      <!-- 잔여 위험성 -->
      <div class="bg-green-50 rounded-lg p-3">
        <div class="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
          <i class="fas fa-check-circle"></i> 잔여 위험성 (개선 후)
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">빈도(가능성)</label>
            <select class="form-input text-xs" name="after_frequency" onchange="updateRiskPreview(this.form)">${aFreqOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">강도(중대성)</label>
            <select class="form-input text-xs" name="after_intensity" onchange="updateRiskPreview(this.form)">${aIntOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">위험성 수준</label>
            <div id="after-risk-preview" class="mt-1 text-center">${riskLevelBadge(item?.after_risk_level || calcRiskLevel(item?.after_frequency||1, item?.after_intensity||1))}</div>
          </div>
        </div>
      </div>

    </div>
    <div class="flex justify-end gap-3 mt-5 border-t pt-4">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm">취소</button>
      <button type="submit" class="btn-primary text-sm">${isEdit ? '수정 저장' : '항목 추가'}</button>
    </div>
  </form>`);
}

function updateRiskPreview(form) {
  const bf = parseInt(form.before_frequency?.value || 1);
  const bi = parseInt(form.before_intensity?.value || 1);
  const af = parseInt(form.after_frequency?.value  || 1);
  const ai = parseInt(form.after_intensity?.value  || 1);
  const bPrev = document.getElementById('before-risk-preview');
  const aPrev = document.getElementById('after-risk-preview');
  if (bPrev) bPrev.innerHTML = riskLevelBadge(calcRiskLevel(bf, bi));
  if (aPrev) aPrev.innerHTML = riskLevelBadge(calcRiskLevel(af, ai));
}

async function saveRaItem(e, raId, itemId, source = 'initial') {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (itemId) await API.put(`/risk-assessments/${raId}/items/${itemId}`, body);
    else        await API.post(`/risk-assessments/${raId}/items`, body);
    closeModal();
    if (source === 'periodic') openPaDetail(raId);
    else if (source === 'adhoc') openAdhocDetail(raId);
    else openRaDetail(raId);
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deleteRaItem(raId, itemId, source = 'initial') {
  if (!confirm('이 항목을 삭제하시겠습니까?')) return;
  try {
    await API.delete(`/risk-assessments/${raId}/items/${itemId}`);
    if (source === 'periodic') openPaDetail(raId);
    else if (source === 'adhoc') openAdhocDetail(raId);
    else openRaDetail(raId);
  } catch(e) { alert('삭제 실패'); }
}

// ============================================================
// 위험성평가(정기) - Periodic Risk Assessment
// ============================================================

// ── 주기 표시 헬퍼 ──────────────────────────────────────────
function periodicCycleLabel(cycle) {
  const map = { 1:'매월', 2:'2개월', 3:'분기(3개월)', 6:'반기(6개월)', 12:'연간(12개월)' };
  return map[cycle] || `${cycle}개월`;
}

function periodLabel(year, month) {
  if (!year) return '-';
  return month ? `${year}년 ${String(month).padStart(2,'0')}월` : `${year}년`;
}

// ── 연도/월 목록 생성 ──────────────────────────────────────
function genYearOptions(selected) {
  const cur = new Date().getFullYear();
  return [cur-1, cur, cur+1].map(y =>
    `<option value="${y}" ${selected==y?'selected':''}>${y}년</option>`
  ).join('');
}
function genMonthOptions(selected) {
  return Array.from({length:12},(_,i)=>i+1).map(m =>
    `<option value="${m}" ${selected==m?'selected':''}>${m}월</option>`
  ).join('');
}

// ── 메인 렌더러 ────────────────────────────────────────────
async function renderPeriodicAssessments() {
  showLoading();
  try {
    const [raRes, sitesRes] = await Promise.all([
      API.get('/risk-assessments', { params: { assessment_type: 'periodic' } }),
      API.get('/sites')
    ]);
    sites = sitesRes.data;
    window._paData = raRes.data;
    renderPeriodicContent(raRes.data);
  } catch(e) {
    document.getElementById('main-content').innerHTML =
      `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderPeriodicContent(list) {
  const counts = { total: list.length, draft: 0, in_progress: 0, completed: 0, approved: 0 };
  list.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  // 연도별 그룹
  const byYear = {};
  list.forEach(r => {
    const y = r.period_year || '미설정';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  });
  const sortedYears = Object.keys(byYear).sort((a,b) => b - a);

  const html = `
  <!-- 요약 카드 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
        <i class="fas fa-sync-alt text-blue-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-gray-800">${counts.total}</div><div class="text-xs text-gray-500">전체 회차</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
        <i class="fas fa-pencil-alt text-gray-500 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-gray-700">${counts.draft + counts.in_progress}</div><div class="text-xs text-gray-500">진행중</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
        <i class="fas fa-check-circle text-green-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-green-700">${counts.completed}</div><div class="text-xs text-gray-500">완료</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
        <i class="fas fa-stamp text-purple-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-purple-700">${counts.approved}</div><div class="text-xs text-gray-500">승인됨</div></div>
    </div>
  </div>

  <!-- 필터 & 등록 -->
  <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
    <div class="flex gap-2 flex-wrap">
      <select id="pa-site-filter" class="form-input w-auto text-sm" onchange="applyPaFilter()">
        <option value="">전체 현장</option>
        ${sites.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <select id="pa-year-filter" class="form-input w-auto text-sm" onchange="applyPaFilter()">
        <option value="">전체 연도</option>
        ${sortedYears.filter(y=>y!=='미설정').map(y=>`<option value="${y}">${y}년</option>`).join('')}
      </select>
      <select id="pa-month-filter" class="form-input w-auto text-sm" onchange="applyPaFilter()">
        <option value="">전체 월</option>
        ${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}">${m}월</option>`).join('')}
      </select>
      <select id="pa-status-filter" class="form-input w-auto text-sm" onchange="applyPaFilter()">
        <option value="">전체 상태</option>
        <option value="draft">작성중</option>
        <option value="in_progress">검토중</option>
        <option value="completed">완료</option>
        <option value="approved">승인됨</option>
      </select>
    </div>
    <button class="btn-primary text-sm" onclick="showPaForm()">
      <i class="fas fa-plus mr-1"></i>정기평가 등록
    </button>
  </div>

  <!-- 연도별 그룹 목록 -->
  <div id="pa-list-container">
    ${sortedYears.length === 0
      ? `<div class="card p-12 text-center text-gray-400">
           <i class="fas fa-sync-alt text-4xl mb-3 block"></i>
           등록된 정기 위험성평가가 없습니다.<br>
           <span class="text-sm mt-1 block">[정기평가 등록] 버튼으로 첫 번째 평가를 추가하세요.</span>
         </div>`
      : sortedYears.map(year => renderPaYearGroup(year, byYear[year])).join('')
    }
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}

function renderPaYearGroup(year, list) {
  return `
  <div class="mb-6">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-1 h-6 bg-blue-600 rounded"></div>
      <h3 class="text-base font-bold text-gray-800">${year === '미설정' ? '연도 미설정' : year + '년'}</h3>
      <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">${list.length}건</span>
    </div>
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold w-24">평가 기간</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold w-16">주기</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">공종</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">작업내용</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">중점위험요인</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">빈도</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">강도</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">등급</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">구체적개선대책</th>
              <th class="text-left px-3 py-2.5 text-gray-600 font-semibold">현장</th>
              <th class="text-left px-3 py-2.5 text-gray-600 font-semibold">평가자</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">상태</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(r => renderPaRow(r)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderPaRow(r) {
  const rLevel = RISK_LEVEL_MAP[r.risk_grade] || RISK_LEVEL_MAP.low;
  const period = r.period_month
    ? `${r.period_year || '?'}년 ${String(r.period_month).padStart(2,'0')}월`
    : (r.period_year ? `${r.period_year}년` : '-');

  return `
  <tr class="border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer" onclick="openPaDetail(${r.id})">
    <td class="px-3 py-2.5 text-center font-semibold text-blue-700 whitespace-nowrap">${period}</td>
    <td class="px-3 py-2.5 text-center text-xs text-gray-500 whitespace-nowrap">
      <span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">${periodicCycleLabel(r.periodic_cycle || 3)}</span>
    </td>
    <td class="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">${r.work_category || '-'}</td>
    <td class="px-4 py-2.5 font-medium text-blue-700">${r.title}</td>
    <td class="px-4 py-2.5 text-gray-600 max-w-40"><div class="line-clamp-2">${r.key_hazard || '-'}</div></td>
    <td class="px-3 py-2.5 text-center font-semibold text-gray-700">${r.frequency || 1}</td>
    <td class="px-3 py-2.5 text-center font-semibold text-gray-700">${r.intensity || 1}</td>
    <td class="px-3 py-2.5 text-center">
      <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${rLevel.cls}">${rLevel.label}</span>
    </td>
    <td class="px-4 py-2.5 text-gray-600 max-w-48"><div class="line-clamp-2">${r.specific_countermeasure || '-'}</div></td>
    <td class="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">${r.site_name}</td>
    <td class="px-3 py-2.5 text-gray-700 whitespace-nowrap">${r.assessor}</td>
    <td class="px-3 py-2.5 text-center">${raStatusBadge(r.status)}</td>
    <td class="px-3 py-2.5 text-center" onclick="event.stopPropagation()">
      <div class="flex items-center justify-center gap-1">
        <button class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
          onclick='showPaForm(${JSON.stringify(r).replace(/'/g,"&#39;")})'>
          <i class="fas fa-edit"></i>
        </button>
        <button class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
          onclick="deletePa(${r.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </td>
  </tr>`;
}

function applyPaFilter() {
  const siteId  = document.getElementById('pa-site-filter')?.value  || '';
  const year    = document.getElementById('pa-year-filter')?.value   || '';
  const month   = document.getElementById('pa-month-filter')?.value  || '';
  const status  = document.getElementById('pa-status-filter')?.value || '';
  let filtered  = window._paData || [];
  if (siteId)  filtered = filtered.filter(r => String(r.site_id)    === siteId);
  if (year)    filtered = filtered.filter(r => String(r.period_year) === year);
  if (month)   filtered = filtered.filter(r => String(r.period_month)=== month);
  if (status)  filtered = filtered.filter(r => r.status             === status);

  // 연도별 재그룹
  const byYear = {};
  filtered.forEach(r => {
    const y = r.period_year || '미설정';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  });
  const sortedYears = Object.keys(byYear).sort((a,b) => b - a);
  const container = document.getElementById('pa-list-container');
  if (!container) return;
  container.innerHTML = sortedYears.length === 0
    ? `<div class="card p-10 text-center text-gray-400"><i class="fas fa-search text-3xl mb-2 block"></i>조건에 맞는 정기평가가 없습니다</div>`
    : sortedYears.map(y => renderPaYearGroup(y, byYear[y])).join('');
}

// ── 등록/수정 폼 ────────────────────────────────────────────
function showPaForm(ra = null) {
  const isEdit   = !!ra;
  const initFreq  = ra?.frequency  || 1;
  const initInt   = ra?.intensity  || 1;
  const initGrade = ra?.risk_grade || calcRiskLevel(initFreq, initInt);
  const curYear   = new Date().getFullYear();
  const curMonth  = new Date().getMonth() + 1;

  const freqOpts = [1,2,3,4,5].map(v =>
    `<option value="${v}" ${initFreq==v?'selected':''}>${v} - ${{1:'거의없음',2:'가끔',3:'보통',4:'자주',5:'매우자주'}[v]}</option>`
  ).join('');
  const intOpts = [1,2,3,4,5].map(v =>
    `<option value="${v}" ${initInt==v?'selected':''}>${v} - ${{1:'미미',2:'경미',3:'보통',4:'심각',5:'재해/사망'}[v]}</option>`
  ).join('');

  showModal(`
  <div class="flex justify-between items-center mb-4">
    <div>
      <h3 class="text-lg font-bold text-gray-800">${isEdit ? '정기 위험성평가 수정' : '정기 위험성평가 등록'}</h3>
      <p class="text-xs text-gray-400 mt-0.5">* 필수 입력 항목</p>
    </div>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="savePa(event, ${ra?.id || 'null'})">
    <input type="hidden" name="assessment_type" value="periodic">
    <div class="space-y-3">

      <!-- 평가 주기 / 연도 / 월 -->
      <div class="bg-blue-50 rounded-lg p-3">
        <div class="text-xs font-bold text-blue-700 mb-2"><i class="fas fa-sync-alt mr-1"></i>정기 주기 설정</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">평가 주기 *</label>
            <select class="form-input text-xs" name="periodic_cycle" required>
              <option value="1"  ${(ra?.periodic_cycle||3)==1 ?'selected':''}>매월</option>
              <option value="2"  ${(ra?.periodic_cycle||3)==2 ?'selected':''}>2개월</option>
              <option value="3"  ${(ra?.periodic_cycle||3)==3 ?'selected':''}>분기(3개월)</option>
              <option value="6"  ${(ra?.periodic_cycle||3)==6 ?'selected':''}>반기(6개월)</option>
              <option value="12" ${(ra?.periodic_cycle||3)==12?'selected':''}>연간(12개월)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">평가 연도 *</label>
            <select class="form-input text-xs" name="period_year" required>
              ${genYearOptions(ra?.period_year || curYear)}
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">평가 월 *</label>
            <select class="form-input text-xs" name="period_month" required>
              ${genMonthOptions(ra?.period_month || curMonth)}
            </select>
          </div>
        </div>
      </div>

      <!-- 공종 + 작업내용 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">공종 *</label>
          <input class="form-input" name="work_category" value="${ra?.work_category || ''}" required placeholder="예: 철근공사, 거푸집공사">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">작업내용 *</label>
          <input class="form-input" name="title" value="${ra?.title || ''}" required placeholder="예: 철근 배근 및 운반 작업">
        </div>
      </div>

      <!-- 현장 + 작업유형 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s=>`<option value="${s.id}" ${ra?.site_id==s.id?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">작업유형 *</label>
          <input class="form-input" name="work_type" value="${ra?.work_type || ''}" required placeholder="예: 고소작업, 굴착작업">
        </div>
      </div>

      <!-- 중점위험요인 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">중점위험요인</label>
        <textarea class="form-input" name="key_hazard" rows="2" placeholder="예: 2m 이상 고소작업 시 추락, 낙하물에 의한 충격">${ra?.key_hazard || ''}</textarea>
      </div>

      <!-- 빈도 / 강도 / 등급 -->
      <div class="bg-red-50 rounded-lg p-3">
        <div class="text-xs font-bold text-red-700 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>위험성 (빈도 × 강도 → 등급 자동계산)</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">빈도(가능성) *</label>
            <select class="form-input text-xs" name="frequency" required onchange="updateRaFormGrade(this.form)">${freqOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">강도(중대성) *</label>
            <select class="form-input text-xs" name="intensity" required onchange="updateRaFormGrade(this.form)">${intOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">등급 (자동계산)</label>
            <div id="ra-form-grade-preview" class="mt-1 text-center">${riskLevelBadge(initGrade)}</div>
          </div>
        </div>
      </div>

      <!-- 구체적개선대책 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">구체적개선대책</label>
        <textarea class="form-input" name="specific_countermeasure" rows="3" placeholder="예: 안전난간 설치, 안전대 착용 의무화, 낙하물 방지망 설치">${ra?.specific_countermeasure || ''}</textarea>
      </div>

      <!-- 평가일 / 평가자 / 부서 / 상태 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">평가일 *</label>
          <input type="date" class="form-input" name="assessment_date" value="${ra?.assessment_date || new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">평가자 *</label>
          <input class="form-input" name="assessor" value="${ra?.assessor || ''}" required placeholder="홍길동">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">부서/팀</label>
          <input class="form-input" name="department" value="${ra?.department || ''}" placeholder="안전관리팀">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select class="form-input" name="status">
            <option value="draft"       ${(!ra||ra.status==='draft')      ?'selected':''}>작성중</option>
            <option value="in_progress" ${ra?.status==='in_progress'      ?'selected':''}>검토중</option>
            <option value="completed"   ${ra?.status==='completed'        ?'selected':''}>완료</option>
            <option value="approved"    ${ra?.status==='approved'         ?'selected':''}>승인됨</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <textarea class="form-input" name="notes" rows="2">${ra?.notes || ''}</textarea>
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-5 border-t pt-4">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm">취소</button>
      <button type="submit" class="btn-primary text-sm">${isEdit ? '수정 저장' : '등록'}</button>
    </div>
  </form>`);
}

async function savePa(e, id) {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (id) await API.put(`/risk-assessments/${id}`, body);
    else    await API.post('/risk-assessments', body);
    closeModal();
    renderPeriodicAssessments();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deletePa(id) {
  if (!confirm('이 정기 위험성평가를 삭제하시겠습니까?\n(모든 평가 항목도 함께 삭제됩니다)')) return;
  try { await API.delete(`/risk-assessments/${id}`); renderPeriodicAssessments(); }
  catch(e) { alert('삭제 실패'); }
}

// ── 정기평가 상세 (항목 관리는 최초와 동일 로직 재사용) ──────
async function openPaDetail(id) {
  showLoading();
  try {
    const { data } = await API.get(`/risk-assessments/${id}`);
    window._currentRa = data;
    window._currentRaSource = 'periodic';   // 뒤로가기 구분용
    renderPaDetail(data);
  } catch(e) {
    document.getElementById('main-content').innerHTML =
      `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderPaDetail(ra) {
  const items    = ra.items || [];
  const totalItems = items.length;
  const vhCount  = items.filter(i => i.before_risk_level === 'very_high').length;
  const hCount   = items.filter(i => i.before_risk_level === 'high').length;
  const mCount   = items.filter(i => i.before_risk_level === 'medium').length;
  const lCount   = items.filter(i => i.before_risk_level === 'low').length;

  const period = ra.period_month
    ? `${ra.period_year}년 ${String(ra.period_month).padStart(2,'0')}월`
    : (ra.period_year ? `${ra.period_year}년` : '');

  const html = `
  <!-- 뒤로가기 + 헤더 -->
  <div class="flex items-center gap-3 mb-5">
    <button onclick="renderPeriodicAssessments()" class="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100">
      <i class="fas fa-arrow-left text-lg"></i>
    </button>
    <div class="flex-1">
      <div class="flex items-center gap-3 flex-wrap">
        ${period ? `<span class="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded-full"><i class="fas fa-calendar-alt mr-1"></i>${period}</span>` : ''}
        <h2 class="text-xl font-bold text-gray-800">${ra.title}</h2>
        ${raStatusBadge(ra.status)}
      </div>
      <div class="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
        ${ra.work_category ? `<span><i class="fas fa-layer-group mr-1"></i>공종: <b class="text-gray-700">${ra.work_category}</b></span>` : ''}
        <span><i class="fas fa-sync-alt mr-1"></i>주기: ${periodicCycleLabel(ra.periodic_cycle || 3)}</span>
        <span><i class="fas fa-building mr-1"></i>${ra.site_name}</span>
        <span><i class="fas fa-tools mr-1"></i>${ra.work_type}</span>
        <span><i class="fas fa-calendar mr-1"></i>${formatDate(ra.assessment_date)}</span>
        <span><i class="fas fa-user mr-1"></i>${ra.assessor}</span>
        ${ra.key_hazard ? `<span class="text-orange-600"><i class="fas fa-exclamation-triangle mr-1"></i>중점위험: ${ra.key_hazard}</span>` : ''}
      </div>
    </div>
    <button class="btn-primary text-sm" onclick='showPaForm(${JSON.stringify(ra).replace(/'/g,"&#39;")})'>
      <i class="fas fa-edit mr-1"></i>정보 수정
    </button>
  </div>

  <!-- 위험성 요약 카드 -->
  <div class="grid grid-cols-4 gap-3 mb-5">
    <div class="card p-3 flex items-center gap-3 border-l-4 border-red-500">
      <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><i class="fas fa-exclamation-circle text-red-600"></i></div>
      <div><div class="text-xl font-bold text-red-600">${vhCount}</div><div class="text-xs text-gray-500">매우높음</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-orange-400">
      <div class="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center"><i class="fas fa-exclamation-triangle text-orange-500"></i></div>
      <div><div class="text-xl font-bold text-orange-500">${hCount}</div><div class="text-xs text-gray-500">높음</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-yellow-400">
      <div class="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center"><i class="fas fa-exclamation text-yellow-500"></i></div>
      <div><div class="text-xl font-bold text-yellow-600">${mCount}</div><div class="text-xs text-gray-500">보통</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-green-500">
      <div class="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><i class="fas fa-check-circle text-green-600"></i></div>
      <div><div class="text-xl font-bold text-green-600">${lCount}</div><div class="text-xs text-gray-500">낮음</div></div>
    </div>
  </div>

  <!-- 평가 항목 테이블 (최초와 동일 구조) -->
  <div class="card overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
      <h3 class="font-bold text-gray-800">
        <i class="fas fa-list-ol mr-2 text-blue-500"></i>위험성 평가 항목
        <span class="text-blue-600">(${totalItems}건)</span>
      </h3>
      <button class="btn-primary text-xs py-1.5 px-3"
        onclick="showRaItemForm(${ra.id}, null, ${totalItems + 1}, 'periodic')">
        <i class="fas fa-plus mr-1"></i>항목 추가
      </button>
    </div>

    <!-- 범례 -->
    <div class="px-5 py-3 bg-blue-50 border-b flex flex-wrap gap-4 text-xs text-gray-600 items-center">
      <span class="font-semibold text-blue-700"><i class="fas fa-info-circle mr-1"></i>위험성 = 빈도 × 강도</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span>매우높음(15↑)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>높음(9~14)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>보통(4~8)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-400 inline-block"></span>낮음(1~3)</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs" style="min-width:1100px">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-2 py-2 text-gray-600 font-semibold text-center w-8">No.</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">작업단계</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">유해·위험요인</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">사고유형</th>
            <th colspan="3" class="px-2 py-2 text-gray-600 font-semibold text-center bg-red-50">현재 위험성(전)</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">감소대책</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-center">대책유형</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-center">담당자</th>
            <th colspan="3" class="px-2 py-2 text-gray-600 font-semibold text-center bg-green-50">잔여 위험성(후)</th>
            <th class="px-2 py-2 text-gray-600 font-semibold text-center">관리</th>
          </tr>
          <tr class="bg-gray-50 border-b text-xs text-gray-500">
            <th></th><th></th><th></th><th></th>
            <th class="px-2 py-1 text-center bg-red-50">빈도</th>
            <th class="px-2 py-1 text-center bg-red-50">강도</th>
            <th class="px-2 py-1 text-center bg-red-50">위험성</th>
            <th></th><th></th><th></th>
            <th class="px-2 py-1 text-center bg-green-50">빈도</th>
            <th class="px-2 py-1 text-center bg-green-50">강도</th>
            <th class="px-2 py-1 text-center bg-green-50">위험성</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="ra-items-tbody">
          ${renderRaItemRows(items, ra.id, 'periodic')}
        </tbody>
      </table>
    </div>
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}

// ============================================================
// 위험성평가(수시) - Adhoc Risk Assessment
// ============================================================

// ── 메인 렌더러 ──────────────────────────────────────────────
async function renderAdhocAssessments() {
  showLoading();
  try {
    const [raRes, sitesRes] = await Promise.all([
      API.get('/risk-assessments', { params: { assessment_type: 'adhoc' } }),
      API.get('/sites')
    ]);
    sites = sitesRes.data;
    window._adhocData = raRes.data;
    renderAdhocContent(raRes.data);
  } catch(e) {
    document.getElementById('main-content').innerHTML =
      `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderAdhocContent(list) {
  const counts = { total: list.length, draft: 0, in_progress: 0, completed: 0, approved: 0 };
  list.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  // 연도별 그룹
  const byYear = {};
  list.forEach(r => {
    const y = r.period_year || new Date(r.assessment_date || Date.now()).getFullYear() || '미설정';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  });
  const sortedYears = Object.keys(byYear).sort((a, b) => b - a);

  const html = `
  <!-- 요약 카드 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center">
        <i class="fas fa-bolt text-yellow-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-gray-800">${counts.total}</div><div class="text-xs text-gray-500">전체 건수</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
        <i class="fas fa-pencil-alt text-gray-500 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-gray-700">${counts.draft + counts.in_progress}</div><div class="text-xs text-gray-500">진행중</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
        <i class="fas fa-check-circle text-green-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-green-700">${counts.completed}</div><div class="text-xs text-gray-500">완료</div></div>
    </div>
    <div class="card p-4 flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
        <i class="fas fa-stamp text-purple-600 text-lg"></i>
      </div>
      <div><div class="text-2xl font-bold text-purple-700">${counts.approved}</div><div class="text-xs text-gray-500">승인됨</div></div>
    </div>
  </div>

  <!-- 필터 & 등록 -->
  <div class="flex flex-wrap gap-2 justify-between items-center mb-4">
    <div class="flex gap-2 flex-wrap">
      <select id="adhoc-site-filter" class="form-input w-auto text-sm" onchange="applyAdhocFilter()">
        <option value="">전체 현장</option>
        ${sites.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <select id="adhoc-year-filter" class="form-input w-auto text-sm" onchange="applyAdhocFilter()">
        <option value="">전체 연도</option>
        ${sortedYears.filter(y => y !== '미설정').map(y => `<option value="${y}">${y}년</option>`).join('')}
      </select>
      <select id="adhoc-month-filter" class="form-input w-auto text-sm" onchange="applyAdhocFilter()">
        <option value="">전체 월</option>
        ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `<option value="${m}">${m}월</option>`).join('')}
      </select>
      <select id="adhoc-status-filter" class="form-input w-auto text-sm" onchange="applyAdhocFilter()">
        <option value="">전체 상태</option>
        <option value="draft">작성중</option>
        <option value="in_progress">검토중</option>
        <option value="completed">완료</option>
        <option value="approved">승인됨</option>
      </select>
    </div>
    <button class="btn-primary text-sm" onclick="showAdhocForm()">
      <i class="fas fa-plus mr-1"></i>수시평가 등록
    </button>
  </div>

  <!-- 연도별 그룹 목록 -->
  <div id="adhoc-list-container">
    ${sortedYears.length === 0
      ? `<div class="card p-12 text-center text-gray-400">
           <i class="fas fa-bolt text-4xl mb-3 block"></i>
           등록된 수시 위험성평가가 없습니다.<br>
           <span class="text-sm mt-1 block">[수시평가 등록] 버튼으로 첫 번째 평가를 추가하세요.</span>
         </div>`
      : sortedYears.map(year => renderAdhocYearGroup(year, byYear[year])).join('')
    }
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}

// ── 연도별 그룹 렌더 ─────────────────────────────────────────
function renderAdhocYearGroup(year, list) {
  return `
  <div class="mb-6">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-1 h-6 bg-yellow-500 rounded"></div>
      <h3 class="text-base font-bold text-gray-800">${year === '미설정' ? '연도 미설정' : year + '년'}</h3>
      <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">${list.length}건</span>
    </div>
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold w-28">발생 일시</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">공종</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">작업내용</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">중점위험요인</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">빈도</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">강도</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">등급</th>
              <th class="text-left px-4 py-2.5 text-gray-600 font-semibold">구체적개선대책</th>
              <th class="text-left px-3 py-2.5 text-gray-600 font-semibold">현장</th>
              <th class="text-left px-3 py-2.5 text-gray-600 font-semibold">평가자</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">상태</th>
              <th class="text-center px-3 py-2.5 text-gray-600 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(r => renderAdhocRow(r)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderAdhocRow(r) {
  const rLevel = RISK_LEVEL_MAP[r.risk_grade] || RISK_LEVEL_MAP.low;
  const period = r.period_month
    ? `${r.period_year || '?'}년 ${String(r.period_month).padStart(2, '0')}월`
    : (r.period_year ? `${r.period_year}년` : formatDate(r.assessment_date) || '-');

  return `
  <tr class="border-b border-gray-100 hover:bg-yellow-50/30 cursor-pointer" onclick="openAdhocDetail(${r.id})">
    <td class="px-3 py-2.5 text-center font-semibold text-yellow-700 whitespace-nowrap text-xs">${period}</td>
    <td class="px-4 py-2.5 text-gray-700 font-medium whitespace-nowrap">${r.work_category || '-'}</td>
    <td class="px-4 py-2.5 font-medium text-yellow-700">${r.title}</td>
    <td class="px-4 py-2.5 text-gray-600 max-w-40"><div class="line-clamp-2">${r.key_hazard || '-'}</div></td>
    <td class="px-3 py-2.5 text-center font-semibold text-gray-700">${r.frequency || 1}</td>
    <td class="px-3 py-2.5 text-center font-semibold text-gray-700">${r.intensity || 1}</td>
    <td class="px-3 py-2.5 text-center">
      <span class="text-xs px-2 py-0.5 rounded-full font-semibold ${rLevel.cls}">${rLevel.label}</span>
    </td>
    <td class="px-4 py-2.5 text-gray-600 max-w-48"><div class="line-clamp-2">${r.specific_countermeasure || '-'}</div></td>
    <td class="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">${r.site_name}</td>
    <td class="px-3 py-2.5 text-gray-700 whitespace-nowrap">${r.assessor}</td>
    <td class="px-3 py-2.5 text-center">${raStatusBadge(r.status)}</td>
    <td class="px-3 py-2.5 text-center" onclick="event.stopPropagation()">
      <div class="flex items-center justify-center gap-1">
        <button class="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
          onclick='showAdhocForm(${JSON.stringify(r).replace(/'/g, "&#39;")})'>
          <i class="fas fa-edit"></i>
        </button>
        <button class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
          onclick="deleteAdhoc(${r.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </td>
  </tr>`;
}

// ── 필터 ────────────────────────────────────────────────────
function applyAdhocFilter() {
  const siteId = document.getElementById('adhoc-site-filter')?.value || '';
  const year   = document.getElementById('adhoc-year-filter')?.value  || '';
  const month  = document.getElementById('adhoc-month-filter')?.value || '';
  const status = document.getElementById('adhoc-status-filter')?.value || '';
  let filtered = window._adhocData || [];
  if (siteId)  filtered = filtered.filter(r => String(r.site_id) === siteId);
  if (year)    filtered = filtered.filter(r => String(r.period_year || new Date(r.assessment_date || Date.now()).getFullYear()) === year);
  if (month)   filtered = filtered.filter(r => String(r.period_month) === month);
  if (status)  filtered = filtered.filter(r => r.status === status);

  const byYear = {};
  filtered.forEach(r => {
    const y = r.period_year || new Date(r.assessment_date || Date.now()).getFullYear() || '미설정';
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  });
  const sortedYears = Object.keys(byYear).sort((a, b) => b - a);
  const container = document.getElementById('adhoc-list-container');
  if (!container) return;
  container.innerHTML = sortedYears.length === 0
    ? `<div class="card p-10 text-center text-gray-400"><i class="fas fa-search text-3xl mb-2 block"></i>조건에 맞는 수시평가가 없습니다</div>`
    : sortedYears.map(y => renderAdhocYearGroup(y, byYear[y])).join('');
}

// ── 등록/수정 폼 ─────────────────────────────────────────────
function showAdhocForm(ra = null) {
  const isEdit   = !!ra;
  const initFreq  = ra?.frequency  || 1;
  const initInt   = ra?.intensity  || 1;
  const initGrade = ra?.risk_grade || calcRiskLevel(initFreq, initInt);
  const curYear   = new Date().getFullYear();
  const curMonth  = new Date().getMonth() + 1;

  const freqOpts = [1, 2, 3, 4, 5].map(v =>
    `<option value="${v}" ${initFreq == v ? 'selected' : ''}>${v} - ${{ 1: '거의없음', 2: '가끔', 3: '보통', 4: '자주', 5: '매우자주' }[v]}</option>`
  ).join('');
  const intOpts = [1, 2, 3, 4, 5].map(v =>
    `<option value="${v}" ${initInt == v ? 'selected' : ''}>${v} - ${{ 1: '미미', 2: '경미', 3: '보통', 4: '심각', 5: '재해/사망' }[v]}</option>`
  ).join('');

  showModal(`
  <div class="flex justify-between items-center mb-4">
    <div>
      <h3 class="text-lg font-bold text-gray-800">${isEdit ? '수시 위험성평가 수정' : '수시 위험성평가 등록'}</h3>
      <p class="text-xs text-gray-400 mt-0.5">* 필수 입력 항목</p>
    </div>
    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
  </div>
  <form onsubmit="saveAdhoc(event, ${ra?.id || 'null'})">
    <input type="hidden" name="assessment_type" value="adhoc">
    <div class="space-y-3">

      <!-- 발생 시점 (연도/월) -->
      <div class="bg-yellow-50 rounded-lg p-3">
        <div class="text-xs font-bold text-yellow-700 mb-2"><i class="fas fa-bolt mr-1"></i>수시 발생 시점</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">발생 연도 *</label>
            <select class="form-input text-xs" name="period_year" required>
              ${genYearOptions(ra?.period_year || curYear)}
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">발생 월 *</label>
            <select class="form-input text-xs" name="period_month" required>
              ${genMonthOptions(ra?.period_month || curMonth)}
            </select>
          </div>
        </div>
      </div>

      <!-- 공종 + 작업내용 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">공종 *</label>
          <input class="form-input" name="work_category" value="${ra?.work_category || ''}" required placeholder="예: 철근공사, 거푸집공사">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">작업내용 *</label>
          <input class="form-input" name="title" value="${ra?.title || ''}" required placeholder="예: 철근 배근 및 운반 작업">
        </div>
      </div>

      <!-- 현장 + 작업유형 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">현장 *</label>
          <select class="form-input" name="site_id" required>
            ${sites.map(s => `<option value="${s.id}" ${ra?.site_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">작업유형 *</label>
          <input class="form-input" name="work_type" value="${ra?.work_type || ''}" required placeholder="예: 고소작업, 굴착작업">
        </div>
      </div>

      <!-- 중점위험요인 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">중점위험요인</label>
        <textarea class="form-input" name="key_hazard" rows="2" placeholder="예: 변경 공정 추가로 인한 낙하·충돌 위험">${ra?.key_hazard || ''}</textarea>
      </div>

      <!-- 빈도 / 강도 / 등급 -->
      <div class="bg-red-50 rounded-lg p-3">
        <div class="text-xs font-bold text-red-700 mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>위험성 (빈도 × 강도 → 등급 자동계산)</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-gray-600 mb-1">빈도(가능성) *</label>
            <select class="form-input text-xs" name="frequency" required onchange="updateRaFormGrade(this.form)">${freqOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">강도(중대성) *</label>
            <select class="form-input text-xs" name="intensity" required onchange="updateRaFormGrade(this.form)">${intOpts}</select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 mb-1">등급 (자동계산)</label>
            <div id="ra-form-grade-preview" class="mt-1 text-center">${riskLevelBadge(initGrade)}</div>
          </div>
        </div>
      </div>

      <!-- 구체적개선대책 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">구체적개선대책</label>
        <textarea class="form-input" name="specific_countermeasure" rows="3" placeholder="예: 안전난간 추가 설치, 작업 전 안전교육 실시">${ra?.specific_countermeasure || ''}</textarea>
      </div>

      <!-- 평가일 / 평가자 / 부서 / 상태 -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">평가일 *</label>
          <input type="date" class="form-input" name="assessment_date" value="${ra?.assessment_date || new Date().toISOString().split('T')[0]}" required>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">평가자 *</label>
          <input class="form-input" name="assessor" value="${ra?.assessor || ''}" required placeholder="홍길동">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">부서/팀</label>
          <input class="form-input" name="department" value="${ra?.department || ''}" placeholder="안전관리팀">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">상태</label>
          <select class="form-input" name="status">
            <option value="draft"       ${(!ra || ra.status === 'draft')       ? 'selected' : ''}>작성중</option>
            <option value="in_progress" ${ra?.status === 'in_progress'         ? 'selected' : ''}>검토중</option>
            <option value="completed"   ${ra?.status === 'completed'           ? 'selected' : ''}>완료</option>
            <option value="approved"    ${ra?.status === 'approved'            ? 'selected' : ''}>승인됨</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <textarea class="form-input" name="notes" rows="2">${ra?.notes || ''}</textarea>
      </div>
    </div>
    <div class="flex justify-end gap-3 mt-5 border-t pt-4">
      <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm">취소</button>
      <button type="submit" class="btn-primary text-sm">${isEdit ? '수정 저장' : '등록'}</button>
    </div>
  </form>`);
}

async function saveAdhoc(e, id) {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const body = Object.fromEntries(fd.entries());
  try {
    if (id) await API.put(`/risk-assessments/${id}`, body);
    else    await API.post('/risk-assessments', body);
    closeModal();
    renderAdhocAssessments();
  } catch(err) { alert('저장 실패: ' + err.message); }
}

async function deleteAdhoc(id) {
  if (!confirm('이 수시 위험성평가를 삭제하시겠습니까?\n(모든 평가 항목도 함께 삭제됩니다)')) return;
  try { await API.delete(`/risk-assessments/${id}`); renderAdhocAssessments(); }
  catch(e) { alert('삭제 실패'); }
}

// ── 수시평가 상세 ─────────────────────────────────────────────
async function openAdhocDetail(id) {
  showLoading();
  try {
    const { data } = await API.get(`/risk-assessments/${id}`);
    window._currentRa = data;
    window._currentRaSource = 'adhoc';
    renderAdhocDetail(data);
  } catch(e) {
    document.getElementById('main-content').innerHTML =
      `<div class="text-red-500 p-4">오류: ${e.message}</div>`;
  }
}

function renderAdhocDetail(ra) {
  const items      = ra.items || [];
  const totalItems = items.length;
  const vhCount    = items.filter(i => i.before_risk_level === 'very_high').length;
  const hCount     = items.filter(i => i.before_risk_level === 'high').length;
  const mCount     = items.filter(i => i.before_risk_level === 'medium').length;
  const lCount     = items.filter(i => i.before_risk_level === 'low').length;

  const period = ra.period_month
    ? `${ra.period_year}년 ${String(ra.period_month).padStart(2, '0')}월`
    : (ra.period_year ? `${ra.period_year}년` : '');

  const html = `
  <!-- 뒤로가기 + 헤더 -->
  <div class="flex items-center gap-3 mb-5">
    <button onclick="renderAdhocAssessments()" class="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100">
      <i class="fas fa-arrow-left text-lg"></i>
    </button>
    <div class="flex-1">
      <div class="flex items-center gap-3 flex-wrap">
        ${period ? `<span class="bg-yellow-100 text-yellow-700 text-sm font-bold px-3 py-1 rounded-full"><i class="fas fa-bolt mr-1"></i>${period}</span>` : ''}
        <h2 class="text-xl font-bold text-gray-800">${ra.title}</h2>
        ${raStatusBadge(ra.status)}
      </div>
      <div class="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
        ${ra.work_category ? `<span><i class="fas fa-layer-group mr-1"></i>공종: <b class="text-gray-700">${ra.work_category}</b></span>` : ''}
        <span><i class="fas fa-building mr-1"></i>${ra.site_name}</span>
        <span><i class="fas fa-tools mr-1"></i>${ra.work_type}</span>
        <span><i class="fas fa-calendar mr-1"></i>${formatDate(ra.assessment_date)}</span>
        <span><i class="fas fa-user mr-1"></i>${ra.assessor}</span>
        ${ra.key_hazard ? `<span class="text-orange-600"><i class="fas fa-exclamation-triangle mr-1"></i>중점위험: ${ra.key_hazard}</span>` : ''}
      </div>
    </div>
    <button class="btn-primary text-sm" onclick='showAdhocForm(${JSON.stringify(ra).replace(/'/g, "&#39;")})'>
      <i class="fas fa-edit mr-1"></i>정보 수정
    </button>
  </div>

  <!-- 위험성 요약 카드 -->
  <div class="grid grid-cols-4 gap-3 mb-5">
    <div class="card p-3 flex items-center gap-3 border-l-4 border-red-500">
      <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><i class="fas fa-exclamation-circle text-red-600"></i></div>
      <div><div class="text-xl font-bold text-red-600">${vhCount}</div><div class="text-xs text-gray-500">매우높음</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-orange-400">
      <div class="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center"><i class="fas fa-exclamation-triangle text-orange-500"></i></div>
      <div><div class="text-xl font-bold text-orange-500">${hCount}</div><div class="text-xs text-gray-500">높음</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-yellow-400">
      <div class="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center"><i class="fas fa-exclamation text-yellow-500"></i></div>
      <div><div class="text-xl font-bold text-yellow-600">${mCount}</div><div class="text-xs text-gray-500">보통</div></div>
    </div>
    <div class="card p-3 flex items-center gap-3 border-l-4 border-green-500">
      <div class="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center"><i class="fas fa-check-circle text-green-600"></i></div>
      <div><div class="text-xl font-bold text-green-600">${lCount}</div><div class="text-xs text-gray-500">낮음</div></div>
    </div>
  </div>

  <!-- 평가 항목 테이블 (최초/정기와 동일 구조) -->
  <div class="card overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
      <h3 class="font-bold text-gray-800">
        <i class="fas fa-list-ol mr-2 text-yellow-500"></i>위험성 평가 항목
        <span class="text-yellow-600">(${totalItems}건)</span>
      </h3>
      <button class="btn-primary text-xs py-1.5 px-3"
        onclick="showRaItemForm(${ra.id}, null, ${totalItems + 1}, 'adhoc')">
        <i class="fas fa-plus mr-1"></i>항목 추가
      </button>
    </div>

    <!-- 범례 -->
    <div class="px-5 py-3 bg-yellow-50 border-b flex flex-wrap gap-4 text-xs text-gray-600 items-center">
      <span class="font-semibold text-yellow-700"><i class="fas fa-info-circle mr-1"></i>위험성 = 빈도 × 강도</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500 inline-block"></span>매우높음(15↑)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>높음(9~14)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>보통(4~8)</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-400 inline-block"></span>낮음(1~3)</span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-xs" style="min-width:1100px">
        <thead class="bg-gray-50 border-b">
          <tr>
            <th class="px-2 py-2 text-gray-600 font-semibold text-center w-8">No.</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">작업단계</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">유해·위험요인</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">사고유형</th>
            <th colspan="3" class="px-2 py-2 text-gray-600 font-semibold text-center bg-red-50">현재 위험성(전)</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-left">감소대책</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-center">대책유형</th>
            <th class="px-3 py-2 text-gray-600 font-semibold text-center">담당자</th>
            <th colspan="3" class="px-2 py-2 text-gray-600 font-semibold text-center bg-green-50">잔여 위험성(후)</th>
            <th class="px-2 py-2 text-gray-600 font-semibold text-center">관리</th>
          </tr>
          <tr class="bg-gray-50 border-b text-xs text-gray-500">
            <th></th><th></th><th></th><th></th>
            <th class="px-2 py-1 text-center bg-red-50">빈도</th>
            <th class="px-2 py-1 text-center bg-red-50">강도</th>
            <th class="px-2 py-1 text-center bg-red-50">위험성</th>
            <th></th><th></th><th></th>
            <th class="px-2 py-1 text-center bg-green-50">빈도</th>
            <th class="px-2 py-1 text-center bg-green-50">강도</th>
            <th class="px-2 py-1 text-center bg-green-50">위험성</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="ra-items-tbody">
          ${renderRaItemRows(items, ra.id, 'adhoc')}
        </tbody>
      </table>
    </div>
  </div>`;

  document.getElementById('main-content').innerHTML = html;
}
