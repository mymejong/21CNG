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
  const links = { dashboard: 0, workers: 1, hazards: 2, incidents: 3, inspections: 4, trainings: 5 };
  const allLinks = document.querySelectorAll('.sidebar-link');
  if (links[page] !== undefined) allLinks[links[page]]?.classList.add('active');

  const titles = {
    dashboard: ['대시보드', '전체 현장 안전 현황'],
    workers: ['작업자 관리', '현장 작업자 등록 및 관리'],
    hazards: ['위험요소 관리', '현장 위험요소 발굴 및 조치'],
    incidents: ['사고 보고', '사고 및 아차사고 보고 관리'],
    inspections: ['안전점검', '현장 안전점검 체크리스트'],
    trainings: ['안전교육', '안전교육 실시 기록 관리'],
  };
  const [title, subtitle] = titles[page] || ['페이지', ''];
  document.getElementById('page-title').textContent = title;
  document.getElementById('page-subtitle').textContent = subtitle;

  const pageRenderers = { dashboard: renderDashboard, workers: renderWorkers, hazards: renderHazards, incidents: renderIncidents, inspections: renderInspections, trainings: renderTrainings };
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
      <td colspan="17" class="text-center py-12 text-gray-400">
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
