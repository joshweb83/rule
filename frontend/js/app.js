/**
 * 규정관리시스템 - 메인 앱
 */

// 전역 상태
const state = {
  currentCategory: '규정',
  currentDeptCode: null,
  currentLawSeq: null,
  currentVersionSeq: null,
  currentArticleIndex: 0,
  viewMode: 'split', // split, full
  laws: [],
  lawDetail: null,
  searchResults: []
};

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  debug('App initialized');

  // 초기 데이터 로드
  await loadDepartmentTree();
  await loadLawList();

  // 이벤트 리스너 등록
  setupEventListeners();
}

function setupEventListeners() {
  // 검색 입력 엔터 키
  document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      doSearch();
    }
  });

  // 트리 검색 입력
  document.getElementById('treeSearch').addEventListener('keyup', () => {
    filterTree();
  });

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// ============================================
// 부서 트리
// ============================================

async function loadDepartmentTree() {
  try {
    const result = await API.getDepartments(state.currentCategory);
    if (result.success) {
      renderDepartmentTree(result.data);
    }
  } catch (error) {
    console.error('Failed to load departments:', error);
  }
}

function renderDepartmentTree(departments) {
  const container = document.getElementById('deptTree');
  container.innerHTML = renderTreeNodes(departments);
}

function renderTreeNodes(nodes, level = 0) {
  if (!nodes || nodes.length === 0) return '';

  return nodes.map(node => {
    const hasChildren = node.children && node.children.length > 0;
    const toggleIcon = hasChildren
      ? '<i class="fas fa-caret-right tree-toggle"></i>'
      : '<span class="tree-toggle"></span>';

    return `
      <div class="tree-node" data-code="${node.code}">
        <div class="tree-item" onclick="selectDepartment('${node.code}', '${node.name}')">
          ${toggleIcon}
          <i class="fas fa-folder tree-icon"></i>
          <span class="tree-label">${node.name}</span>
        </div>
        ${hasChildren ? `<div class="tree-children">${renderTreeNodes(node.children, level + 1)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function selectDepartment(code, name) {
  // 토글 처리
  const node = document.querySelector(`.tree-node[data-code="${code}"]`);
  const children = node.querySelector('.tree-children');
  const toggle = node.querySelector('.tree-toggle');

  if (children) {
    children.classList.toggle('expanded');
    if (toggle) {
      toggle.classList.toggle('fa-caret-right');
      toggle.classList.toggle('fa-caret-down');
    }
  }

  // 선택 표시
  document.querySelectorAll('.tree-item').forEach(item => {
    item.classList.remove('selected');
  });
  node.querySelector('.tree-item').classList.add('selected');

  // 상태 업데이트 및 목록 로드
  state.currentDeptCode = code;
  updateBreadcrumb(state.currentCategory + '정보', name);
  loadLawList({ deptCode: code });
  showListView();
}

function expandAllTree() {
  document.querySelectorAll('.tree-children').forEach(el => {
    el.classList.add('expanded');
  });
  document.querySelectorAll('.tree-toggle').forEach(el => {
    el.classList.remove('fa-caret-right');
    el.classList.add('fa-caret-down');
  });
}

function collapseAllTree() {
  document.querySelectorAll('.tree-children').forEach(el => {
    el.classList.remove('expanded');
  });
  document.querySelectorAll('.tree-toggle').forEach(el => {
    el.classList.add('fa-caret-right');
    el.classList.remove('fa-caret-down');
  });
}

function filterTree() {
  const keyword = document.getElementById('treeSearch').value.toLowerCase();
  const nodes = document.querySelectorAll('.tree-node');

  nodes.forEach(node => {
    const label = node.querySelector('.tree-label').textContent.toLowerCase();
    if (keyword === '' || label.includes(keyword)) {
      node.style.display = '';
    } else {
      node.style.display = 'none';
    }
  });
}

// ============================================
// 카테고리 변경
// ============================================

function changeCategory(category) {
  // 네비게이션 활성화
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`.nav-item[data-category="${category}"]`).classList.add('active');

  // 상태 업데이트
  state.currentCategory = category;
  state.currentDeptCode = null;

  // UI 업데이트
  document.getElementById('currentCategoryTitle').textContent = category + '정보';
  updateBreadcrumb(category + '정보');

  // 데이터 로드
  loadDepartmentTree();
  loadLawList({ type: category });
  showListView();
}

// ============================================
// 규정 목록
// ============================================

async function loadLawList(params = {}) {
  try {
    showLoading('lawList');

    // 기본 파라미터 설정
    if (!params.type && !params.deptCode) {
      params.type = state.currentCategory;
    }

    const result = await API.getLawList(params);

    if (result.success) {
      state.laws = result.data;
      renderLawList(result.data);
      document.getElementById('totalCount').textContent = result.total;
    }
  } catch (error) {
    console.error('Failed to load law list:', error);
    showError('lawList', '규정 목록을 불러오는데 실패했습니다.');
  }
}

function renderLawList(laws) {
  const container = document.getElementById('lawList');

  if (laws.length === 0) {
    container.innerHTML = `
      <li class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>등록된 규정이 없습니다.</p>
      </li>
    `;
    return;
  }

  container.innerHTML = laws.map(law => {
    const typeInfo = CONFIG.LAW_TYPES[law.type] || { label: law.type, class: '' };
    return `
      <li class="law-item" onclick="viewLawDetail(${law.seq})">
        <div class="law-item-title">${law.title}</div>
        <div class="law-item-meta">
          <span class="law-item-badge ${typeInfo.class}">${typeInfo.label}</span>
          <span><i class="fas fa-building"></i> ${law.deptName}</span>
          <span><i class="fas fa-calendar"></i> ${formatDate(law.updatedDate)}</span>
        </div>
      </li>
    `;
  }).join('');
}

function sortLawList() {
  const sortOption = document.getElementById('sortOption').value;
  let sorted = [...state.laws];

  if (sortOption === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  } else {
    sorted.sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate));
  }

  renderLawList(sorted);
}

// ============================================
// 규정 상세
// ============================================

async function viewLawDetail(seq) {
  try {
    showLoading('articleContent');
    state.currentLawSeq = seq;

    const result = await API.getLawDetail(seq);

    if (result.success) {
      state.lawDetail = result.data;
      renderLawDetail(result.data);
      showDetailView();
      updateBreadcrumb(state.currentCategory + '정보', result.data.deptName, result.data.title);
    }
  } catch (error) {
    console.error('Failed to load law detail:', error);
    alert('규정 상세 정보를 불러오는데 실패했습니다.');
  }
}

function renderLawDetail(data) {
  // 제목 및 메타 정보
  document.getElementById('lawTitle').textContent = data.title;
  document.getElementById('lawDeptName').textContent = data.deptName;

  // 버전 선택 드롭다운
  renderVersionSelect(data.versions);

  // 개정 내역 배지
  const revisionCount = data.articles.filter(a => a.changeType).length;
  if (revisionCount > 0) {
    document.getElementById('revisionBadge').style.display = 'block';
    document.getElementById('revisionCount').textContent = revisionCount;
  } else {
    document.getElementById('revisionBadge').style.display = 'none';
  }

  // 조문 목차
  renderArticleTree(data.articles);

  // 조문 본문
  renderArticleContent(data.articles);

  // 첨부파일
  renderAttachments(data.attachments);
}

function renderVersionSelect(versions) {
  const select = document.getElementById('versionSelect');
  select.innerHTML = versions.map(v => {
    const label = `${v.revisionDate} ${v.revisionType}`;
    return `<option value="${v.seq}" ${v.isCurrent ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

function renderArticleTree(articles) {
  const container = document.getElementById('articleTree');
  let currentChapter = '';

  const html = articles.map((article, index) => {
    let chapterHtml = '';

    // 새로운 장이 시작되면 장 제목 추가
    if (article.chapter && article.chapter !== currentChapter) {
      currentChapter = article.chapter;
      chapterHtml = `<div class="toc-item chapter">${article.chapter}</div>`;
    }

    // 변경 배지
    let changeBadge = '';
    if (article.changeType) {
      const changeInfo = CONFIG.CHANGE_TYPES[article.changeType] || {};
      changeBadge = `<span class="change-badge ${changeInfo.class || ''}">${article.changeType}</span>`;
    }

    const title = article.articleTitle
      ? `${article.articleNo}(${article.articleTitle})`
      : article.articleNo;

    return `
      ${chapterHtml}
      <div class="toc-item ${index === state.currentArticleIndex ? 'active' : ''}"
           onclick="scrollToArticle(${index})"
           data-index="${index}">
        ${title}
        ${changeBadge}
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderArticleContent(articles) {
  const container = document.getElementById('articleContent');
  let currentChapter = '';

  const html = articles.map((article, index) => {
    let chapterHtml = '';

    // 새로운 장이 시작되면 장 제목 추가
    if (article.chapter && article.chapter !== currentChapter) {
      currentChapter = article.chapter;
      chapterHtml = `<h3 class="chapter-title">${article.chapter}</h3>`;
    }

    // 변경 배지
    let badge = '';
    let highlightClass = '';
    if (article.changeType) {
      const changeInfo = CONFIG.CHANGE_TYPES[article.changeType] || {};
      badge = `<span class="badge ${changeInfo.class || ''}">${article.changeType}</span>`;
      highlightClass = 'highlight';
    }

    const title = article.articleTitle
      ? `${article.articleNo}(${article.articleTitle})`
      : article.articleNo;

    return `
      ${chapterHtml}
      <div class="article-section" id="article-${index}">
        <div class="article-title ${highlightClass}">
          ${title}
          ${badge}
        </div>
        <div class="article-body">${formatContent(article.content)}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

function renderAttachments(attachments) {
  const container = document.getElementById('attachmentList');

  if (!attachments || attachments.length === 0) {
    container.innerHTML = '<div class="empty-text">첨부파일 없음</div>';
    return;
  }

  container.innerHTML = attachments.map(att => `
    <a href="${att.fileUrl}" class="attachment-item" target="_blank">
      <i class="fas fa-file-download"></i>
      ${att.fileName}
    </a>
  `).join('');
}

function scrollToArticle(index) {
  state.currentArticleIndex = index;

  // 목차 활성화
  document.querySelectorAll('.toc-item').forEach(item => {
    item.classList.remove('active');
  });
  const tocItem = document.querySelector(`.toc-item[data-index="${index}"]`);
  if (tocItem) {
    tocItem.classList.add('active');
  }

  // 본문 스크롤
  const articleEl = document.getElementById(`article-${index}`);
  if (articleEl) {
    articleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function prevArticle() {
  if (state.currentArticleIndex > 0) {
    scrollToArticle(state.currentArticleIndex - 1);
  }
}

function nextArticle() {
  const articles = state.lawDetail?.articles || [];
  if (state.currentArticleIndex < articles.length - 1) {
    scrollToArticle(state.currentArticleIndex + 1);
  }
}

async function changeVersion() {
  const versionSeq = document.getElementById('versionSelect').value;
  // 버전 변경 시 해당 버전의 조문 로드
  // 실제 구현에서는 API 호출 필요
  debug('Change version:', versionSeq);
}

// ============================================
// 검색
// ============================================

async function doSearch() {
  const keyword = document.getElementById('searchKeyword').value.trim();
  const searchType = document.getElementById('searchType').value;

  if (!keyword) {
    alert('검색어를 입력하세요.');
    return;
  }

  try {
    const result = await API.search(keyword, searchType);

    if (result.success) {
      state.searchResults = result.data;
      renderSearchResults(result.data, keyword);
      showSearchResultView();
    }
  } catch (error) {
    console.error('Search failed:', error);
    alert('검색 중 오류가 발생했습니다.');
  }
}

function renderSearchResults(results, keyword) {
  document.getElementById('searchKeywordDisplay').textContent = keyword;
  document.getElementById('searchResultCount').textContent = results.length;

  const container = document.getElementById('searchResultList');

  if (results.length === 0) {
    container.innerHTML = `
      <li class="empty-state">
        <i class="fas fa-search"></i>
        <p>검색 결과가 없습니다.</p>
      </li>
    `;
    return;
  }

  container.innerHTML = results.map(result => {
    const typeInfo = CONFIG.LAW_TYPES[result.lawType] || { label: result.lawType, class: '' };
    const matchText = highlightKeyword(result.matchText, keyword);

    return `
      <li class="law-item search-result-item" onclick="viewLawDetail(${result.lawSeq})">
        <div class="law-item-title">${result.title}</div>
        <div class="law-item-meta">
          <span class="law-item-badge ${typeInfo.class}">${typeInfo.label}</span>
          <span><i class="fas fa-building"></i> ${result.deptName}</span>
          ${result.articleNo ? `<span><i class="fas fa-bookmark"></i> ${result.articleNo}</span>` : ''}
        </div>
        <div class="match-text">${matchText}</div>
      </li>
    `;
  }).join('');
}

function searchInLaw() {
  const keyword = prompt('규정 내용 검색어를 입력하세요:');
  if (keyword) {
    // 현재 규정 내에서 검색
    const content = document.getElementById('articleContent');
    const html = content.innerHTML;
    const highlighted = highlightKeyword(html, keyword);
    content.innerHTML = highlighted;
  }
}

// ============================================
// 최신 제/개정
// ============================================

async function showLatestRevisions() {
  // 네비게이션 활성화
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector('.nav-item[data-category="최신"]').classList.add('active');

  try {
    const result = await API.getLatestRevisions();

    if (result.success) {
      renderLatestRevisions(result.data);
      showLatestRevisionView();
      updateBreadcrumb('최신 제/개정');
    }
  } catch (error) {
    console.error('Failed to load latest revisions:', error);
  }
}

function renderLatestRevisions(revisions) {
  const container = document.getElementById('latestRevisionList');

  container.innerHTML = revisions.map(rev => {
    const typeInfo = CONFIG.LAW_TYPES[rev.type] || { label: rev.type, class: '' };
    const revInfo = CONFIG.REVISION_TYPES[rev.revisionType] || { label: rev.revisionType };

    return `
      <li class="law-item" onclick="viewLawDetail(${rev.lawSeq})">
        <div class="law-item-title">
          <span class="law-item-badge" style="background:#fff3cd;color:#856404;">${revInfo.label}</span>
          ${rev.title}
        </div>
        <div class="law-item-meta">
          <span class="law-item-badge ${typeInfo.class}">${typeInfo.label}</span>
          <span><i class="fas fa-building"></i> ${rev.deptName}</span>
          <span><i class="fas fa-calendar"></i> ${rev.revisionType}일: ${formatDate(rev.revisionDate)}</span>
          <span><i class="fas fa-play"></i> 시행일: ${formatDate(rev.effectiveDate)}</span>
        </div>
      </li>
    `;
  }).join('');
}

// ============================================
// 뷰 전환
// ============================================

function showListView() {
  document.getElementById('lawListView').style.display = 'block';
  document.getElementById('lawDetailView').style.display = 'none';
  document.getElementById('searchResultView').style.display = 'none';
  document.getElementById('latestRevisionView').style.display = 'none';
}

function showDetailView() {
  document.getElementById('lawListView').style.display = 'none';
  document.getElementById('lawDetailView').style.display = 'block';
  document.getElementById('searchResultView').style.display = 'none';
  document.getElementById('latestRevisionView').style.display = 'none';
}

function showSearchResultView() {
  document.getElementById('lawListView').style.display = 'none';
  document.getElementById('lawDetailView').style.display = 'none';
  document.getElementById('searchResultView').style.display = 'block';
  document.getElementById('latestRevisionView').style.display = 'none';
}

function showLatestRevisionView() {
  document.getElementById('lawListView').style.display = 'none';
  document.getElementById('lawDetailView').style.display = 'none';
  document.getElementById('searchResultView').style.display = 'none';
  document.getElementById('latestRevisionView').style.display = 'block';
}

function toggleViewMode(mode) {
  state.viewMode = mode;
  const content = document.getElementById('detailContent');

  if (mode === 'full') {
    content.classList.add('full-view');
  } else {
    content.classList.remove('full-view');
  }
}

// ============================================
// 액션 버튼
// ============================================

function downloadFullText() {
  // 첨부파일 중 '전문' 타입 찾기
  const attachment = state.lawDetail?.attachments?.find(a => a.fileType === '전문');
  if (attachment) {
    window.open(attachment.fileUrl, '_blank');
  } else {
    alert('전문 파일이 없습니다.');
  }
}

function showRevisionHistory() {
  const versions = state.lawDetail?.versions || [];

  const html = `
    <table class="revision-table">
      <thead>
        <tr>
          <th>버전</th>
          <th>구분</th>
          <th>제정/개정일</th>
          <th>시행일</th>
          <th>현행</th>
        </tr>
      </thead>
      <tbody>
        ${versions.map(v => `
          <tr>
            <td>${v.version}차</td>
            <td>${v.revisionType}</td>
            <td>${formatDate(v.revisionDate)}</td>
            <td>${formatDate(v.effectiveDate)}</td>
            <td>${v.isCurrent ? '✓' : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  openModal('개정 이력', html);
}

function printLaw() {
  window.print();
}

function toggleSupplementary() {
  // 부칙 표시/숨김
  const checked = document.getElementById('showSupplementary').checked;
  const supplementary = document.querySelector('.article-section:last-child');
  if (supplementary) {
    supplementary.style.display = checked ? 'block' : 'none';
  }
}

// 가나다 검색
function showKoreanIndex() {
  const consonants = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  const html = `
    <div class="korean-index">
      ${consonants.map(c => `
        <button class="btn btn-outline" onclick="searchByKorean('${c}')">${c}</button>
      `).join('')}
    </div>
  `;

  openModal('가나다 검색', html);
}

function searchByKorean(consonant) {
  closeModal();
  document.getElementById('searchKeyword').value = consonant;
  doSearch();
}

// 개정일 검색
function showDateSearch() {
  const html = `
    <div class="date-search">
      <div style="margin-bottom:15px;">
        <label>시작일:</label>
        <input type="date" id="searchStartDate" style="margin-left:10px;">
      </div>
      <div style="margin-bottom:15px;">
        <label>종료일:</label>
        <input type="date" id="searchEndDate" style="margin-left:10px;">
      </div>
      <button class="btn btn-search" onclick="searchByDate()">검색</button>
    </div>
  `;

  openModal('개정일 검색', html);
}

function searchByDate() {
  const startDate = document.getElementById('searchStartDate').value;
  const endDate = document.getElementById('searchEndDate').value;

  closeModal();
  // 날짜 범위 검색 구현
  debug('Search by date:', startDate, endDate);
  alert('개정일 검색 기능은 API 연동 후 사용 가능합니다.');
}

function showPreNotice() {
  alert('사전공고 기능은 추후 구현 예정입니다.');
}

// ============================================
// 모달
// ============================================

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// ============================================
// 유틸리티
// ============================================

function updateBreadcrumb(...paths) {
  const breadcrumb = document.getElementById('breadcrumb');
  let html = '<a href="#" onclick="goHome()">HOME</a>';

  paths.forEach((path, index) => {
    html += `<i class="fas fa-chevron-right"></i>`;
    if (index === paths.length - 1) {
      html += `<span>${path}</span>`;
    } else {
      html += `<a href="#">${path}</a>`;
    }
  });

  breadcrumb.innerHTML = html;
}

function goHome() {
  state.currentDeptCode = null;
  updateBreadcrumb(state.currentCategory + '정보');
  loadLawList();
  showListView();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatContent(content) {
  if (!content) return '';
  // 줄바꿈 처리
  return content.replace(/\n/g, '<br>');
}

function highlightKeyword(text, keyword) {
  if (!keyword) return text;
  const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showLoading(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="loading">
        <i class="fas fa-spinner"></i>
        <p>로딩 중...</p>
      </div>
    `;
  }
}

function showError(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }
}
