/**
 * 규정관리시스템 - Google Apps Script API
 *
 * 사용법:
 * 1. Google Sheets에서 [확장 프로그램] > [Apps Script] 선택
 * 2. 이 코드를 붙여넣기
 * 3. SPREADSHEET_ID를 실제 시트 ID로 변경
 * 4. [배포] > [새 배포] > [웹 앱] 선택
 * 5. 액세스 권한: "모든 사용자" 선택
 * 6. 배포 후 웹 앱 URL을 프론트엔드에서 사용
 */

// ============================================
// 설정
// ============================================
const SPREADSHEET_ID = '1zBKigqguAdUGwyL-gnC8BRDQq-Hs1b6cR3XYtIiNcDA';

// 시트 이름
const SHEETS = {
  LAWS: 'laws',
  VERSIONS: 'versions',
  ARTICLES: 'articles',
  DEPARTMENTS: 'departments',
  ATTACHMENTS: 'attachments',
  CONFIG: 'config'
};

// ============================================
// 메인 핸들러
// ============================================

/**
 * GET 요청 처리
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getLawList':
        result = getLawList(e.parameter);
        break;
      case 'getLawDetail':
        result = getLawDetail(e.parameter.seq);
        break;
      case 'getVersions':
        result = getVersions(e.parameter.lawSeq);
        break;
      case 'getArticles':
        result = getArticles(e.parameter.versionSeq);
        break;
      case 'getDepartments':
        result = getDepartments(e.parameter.category);
        break;
      case 'getAttachments':
        result = getAttachments(e.parameter.versionSeq);
        break;
      case 'search':
        result = searchLaws(e.parameter);
        break;
      case 'getConfig':
        result = getConfig();
        break;
      case 'getLatestRevisions':
        result = getLatestRevisions(e.parameter.limit || 10);
        break;
      default:
        result = { error: 'Unknown action', action: action };
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.message });
  }
}

/**
 * POST 요청 처리 (관리자 기능)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'addLaw':
        result = addLaw(data);
        break;
      case 'updateLaw':
        result = updateLaw(data);
        break;
      case 'addVersion':
        result = addVersion(data);
        break;
      case 'addArticle':
        result = addArticle(data);
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.message });
  }
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * JSON 응답 생성
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 스프레드시트 가져오기
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * 시트 데이터를 객체 배열로 변환
 */
function sheetToObjects(sheetName, filterFn = null) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => h.toString().toUpperCase());
  const rows = data.slice(1);

  let result = rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 }; // 실제 행 번호 (1-indexed, 헤더 제외)
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  if (filterFn) {
    result = result.filter(filterFn);
  }

  return result;
}

/**
 * 다음 SEQ 번호 가져오기
 */
function getNextSeq(sheetName) {
  const objects = sheetToObjects(sheetName);
  if (objects.length === 0) return 1;
  const maxSeq = Math.max(...objects.map(obj => obj.SEQ || 0));
  return maxSeq + 1;
}

// ============================================
// 규정 관련 함수
// ============================================

/**
 * 규정 목록 조회
 */
function getLawList(params) {
  let laws = sheetToObjects(SHEETS.LAWS);

  // 유형 필터
  if (params.type) {
    laws = laws.filter(law => law.TYPE === params.type);
  }

  // 부서 필터
  if (params.deptCode) {
    laws = laws.filter(law => law.DEPT_CODE === params.deptCode);
  }

  // 상태 필터 (기본값: 시행)
  if (params.status) {
    laws = laws.filter(law => law.STATUS === params.status);
  } else {
    laws = laws.filter(law => law.STATUS === '시행');
  }

  // 정렬
  laws.sort((a, b) => {
    if (params.sort === 'title') {
      return a.TITLE.localeCompare(b.TITLE, 'ko');
    }
    return (b.SEQ || 0) - (a.SEQ || 0); // 기본: 최신순
  });

  return {
    success: true,
    data: laws.map(law => ({
      seq: law.SEQ,
      title: law.TITLE,
      type: law.TYPE,
      deptCode: law.DEPT_CODE,
      deptName: law.DEPT_NAME,
      currentVersion: law.CURRENT_VERSION,
      status: law.STATUS,
      updatedDate: law.UPDATED_DATE
    })),
    total: laws.length
  };
}

/**
 * 규정 상세 조회
 */
function getLawDetail(seq) {
  const laws = sheetToObjects(SHEETS.LAWS);
  const law = laws.find(l => l.SEQ == seq);

  if (!law) {
    return { success: false, error: '규정을 찾을 수 없습니다.' };
  }

  // 현행 버전 정보
  const versions = sheetToObjects(SHEETS.VERSIONS);
  const currentVersion = versions.find(v => v.LAW_SEQ == seq && v.IS_CURRENT === true);

  // 조문 목록
  let articles = [];
  if (currentVersion) {
    articles = getArticles(currentVersion.SEQ).data || [];
  }

  // 첨부파일
  let attachments = [];
  if (currentVersion) {
    attachments = getAttachments(currentVersion.SEQ).data || [];
  }

  return {
    success: true,
    data: {
      seq: law.SEQ,
      title: law.TITLE,
      type: law.TYPE,
      deptCode: law.DEPT_CODE,
      deptName: law.DEPT_NAME,
      status: law.STATUS,
      currentVersion: currentVersion ? {
        seq: currentVersion.SEQ,
        version: currentVersion.VERSION,
        revisionType: currentVersion.REVISION_TYPE,
        revisionDate: currentVersion.REVISION_DATE,
        effectiveDate: currentVersion.EFFECTIVE_DATE,
        revisionReason: currentVersion.REVISION_REASON
      } : null,
      articles: articles,
      attachments: attachments
    }
  };
}

/**
 * 규정 추가
 */
function addLaw(data) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.LAWS);
  const seq = getNextSeq(SHEETS.LAWS);
  const now = new Date();

  sheet.appendRow([
    seq,
    data.title,
    data.type,
    data.deptCode,
    data.deptName,
    1, // 최초 버전
    '시행',
    now,
    now
  ]);

  return { success: true, seq: seq };
}

// ============================================
// 버전 관련 함수
// ============================================

/**
 * 버전 목록 조회
 */
function getVersions(lawSeq) {
  const versions = sheetToObjects(SHEETS.VERSIONS)
    .filter(v => v.LAW_SEQ == lawSeq)
    .sort((a, b) => (b.VERSION || 0) - (a.VERSION || 0));

  return {
    success: true,
    data: versions.map(v => ({
      seq: v.SEQ,
      lawSeq: v.LAW_SEQ,
      version: v.VERSION,
      revisionType: v.REVISION_TYPE,
      revisionDate: v.REVISION_DATE,
      effectiveDate: v.EFFECTIVE_DATE,
      revisionReason: v.REVISION_REASON,
      isCurrent: v.IS_CURRENT
    }))
  };
}

/**
 * 버전 추가
 */
function addVersion(data) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.VERSIONS);
  const seq = getNextSeq(SHEETS.VERSIONS);

  // 기존 현행 버전 해제
  const versions = sheetToObjects(SHEETS.VERSIONS);
  versions.forEach(v => {
    if (v.LAW_SEQ == data.lawSeq && v.IS_CURRENT === true) {
      const rowIndex = v._rowIndex;
      const isCurrentCol = 8; // IS_CURRENT 컬럼 위치 (1-indexed)
      sheet.getRange(rowIndex, isCurrentCol).setValue(false);
    }
  });

  // 새 버전 추가
  sheet.appendRow([
    seq,
    data.lawSeq,
    data.version,
    data.revisionType,
    data.revisionDate,
    data.effectiveDate,
    data.revisionReason || '',
    true // IS_CURRENT
  ]);

  // 규정 테이블의 CURRENT_VERSION 업데이트
  const lawsSheet = getSpreadsheet().getSheetByName(SHEETS.LAWS);
  const laws = sheetToObjects(SHEETS.LAWS);
  const law = laws.find(l => l.SEQ == data.lawSeq);
  if (law) {
    lawsSheet.getRange(law._rowIndex, 6).setValue(data.version); // CURRENT_VERSION
    lawsSheet.getRange(law._rowIndex, 9).setValue(new Date()); // UPDATED_DATE
  }

  return { success: true, seq: seq };
}

// ============================================
// 조문 관련 함수
// ============================================

/**
 * 조문 목록 조회
 */
function getArticles(versionSeq) {
  const articles = sheetToObjects(SHEETS.ARTICLES)
    .filter(a => a.VERSION_SEQ == versionSeq)
    .sort((a, b) => (a.SORT_ORDER || 0) - (b.SORT_ORDER || 0));

  return {
    success: true,
    data: articles.map(a => ({
      seq: a.SEQ,
      versionSeq: a.VERSION_SEQ,
      chapter: a.CHAPTER,
      articleNo: a.ARTICLE_NO,
      articleTitle: a.ARTICLE_TITLE,
      content: a.CONTENT,
      changeType: a.CHANGE_TYPE,
      sortOrder: a.SORT_ORDER
    }))
  };
}

/**
 * 조문 추가
 */
function addArticle(data) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.ARTICLES);
  const seq = getNextSeq(SHEETS.ARTICLES);

  sheet.appendRow([
    seq,
    data.versionSeq,
    data.chapter || '',
    data.articleNo,
    data.articleTitle || '',
    data.content,
    data.changeType || '',
    data.sortOrder || 0
  ]);

  return { success: true, seq: seq };
}

// ============================================
// 부서 관련 함수
// ============================================

/**
 * 부서 목록 조회 (트리 구조)
 */
function getDepartments(category) {
  let depts = sheetToObjects(SHEETS.DEPARTMENTS)
    .filter(d => d.IS_ACTIVE === true || d.IS_ACTIVE === 'TRUE');

  if (category) {
    depts = depts.filter(d => d.CATEGORY === category);
  }

  // 트리 구조로 변환
  const tree = buildDeptTree(depts);

  return {
    success: true,
    data: tree
  };
}

/**
 * 부서 트리 구조 생성
 */
function buildDeptTree(depts) {
  const map = {};
  const roots = [];

  // 먼저 모든 부서를 맵에 저장
  depts.forEach(dept => {
    map[dept.CODE] = {
      code: dept.CODE,
      name: dept.NAME,
      category: dept.CATEGORY,
      sortOrder: dept.SORT_ORDER,
      children: []
    };
  });

  // 부모-자식 관계 설정
  depts.forEach(dept => {
    if (dept.PARENT_CODE && map[dept.PARENT_CODE]) {
      map[dept.PARENT_CODE].children.push(map[dept.CODE]);
    } else {
      roots.push(map[dept.CODE]);
    }
  });

  // 정렬
  const sortByOrder = (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0);
  roots.sort(sortByOrder);
  Object.values(map).forEach(node => node.children.sort(sortByOrder));

  return roots;
}

// ============================================
// 첨부파일 관련 함수
// ============================================

/**
 * 첨부파일 목록 조회
 */
function getAttachments(versionSeq) {
  const attachments = sheetToObjects(SHEETS.ATTACHMENTS)
    .filter(a => a.VERSION_SEQ == versionSeq)
    .sort((a, b) => (a.SORT_ORDER || 0) - (b.SORT_ORDER || 0));

  return {
    success: true,
    data: attachments.map(a => ({
      seq: a.SEQ,
      fileName: a.FILE_NAME,
      fileUrl: a.FILE_URL,
      fileType: a.FILE_TYPE,
      fileSize: a.FILE_SIZE
    }))
  };
}

// ============================================
// 검색 관련 함수
// ============================================

/**
 * 규정 검색
 */
function searchLaws(params) {
  const keyword = (params.keyword || '').toLowerCase();
  const searchType = params.searchType || 'all'; // all, title, content

  let results = [];

  if (searchType === 'all' || searchType === 'title') {
    // 제목 검색
    const laws = sheetToObjects(SHEETS.LAWS);
    const titleMatches = laws.filter(law =>
      law.TITLE.toLowerCase().includes(keyword) && law.STATUS === '시행'
    );
    results = results.concat(titleMatches.map(law => ({
      type: 'title',
      lawSeq: law.SEQ,
      title: law.TITLE,
      lawType: law.TYPE,
      deptName: law.DEPT_NAME,
      matchText: law.TITLE
    })));
  }

  if (searchType === 'all' || searchType === 'content') {
    // 내용 검색 (조문)
    const articles = sheetToObjects(SHEETS.ARTICLES);
    const versions = sheetToObjects(SHEETS.VERSIONS);
    const laws = sheetToObjects(SHEETS.LAWS);

    // 현행 버전만 검색
    const currentVersionSeqs = versions
      .filter(v => v.IS_CURRENT === true)
      .map(v => v.SEQ);

    const contentMatches = articles.filter(article =>
      currentVersionSeqs.includes(article.VERSION_SEQ) &&
      (article.CONTENT || '').toLowerCase().includes(keyword)
    );

    contentMatches.forEach(article => {
      const version = versions.find(v => v.SEQ === article.VERSION_SEQ);
      const law = version ? laws.find(l => l.SEQ === version.LAW_SEQ) : null;

      if (law && law.STATUS === '시행') {
        results.push({
          type: 'content',
          lawSeq: law.SEQ,
          title: law.TITLE,
          lawType: law.TYPE,
          deptName: law.DEPT_NAME,
          articleNo: article.ARTICLE_NO,
          articleTitle: article.ARTICLE_TITLE,
          matchText: article.CONTENT.substring(0, 100) + '...'
        });
      }
    });
  }

  return {
    success: true,
    data: results,
    total: results.length,
    keyword: params.keyword
  };
}

// ============================================
// 최신 제/개정 관련 함수
// ============================================

/**
 * 최신 제/개정 규정 조회
 */
function getLatestRevisions(limit) {
  const versions = sheetToObjects(SHEETS.VERSIONS);
  const laws = sheetToObjects(SHEETS.LAWS);

  // 최신순 정렬
  versions.sort((a, b) => {
    const dateA = new Date(a.REVISION_DATE);
    const dateB = new Date(b.REVISION_DATE);
    return dateB - dateA;
  });

  const results = [];
  const seen = new Set();

  for (const version of versions) {
    if (results.length >= limit) break;

    const law = laws.find(l => l.SEQ === version.LAW_SEQ);
    if (!law || law.STATUS !== '시행') continue;

    // 같은 규정 중복 방지
    if (seen.has(law.SEQ)) continue;
    seen.add(law.SEQ);

    results.push({
      lawSeq: law.SEQ,
      title: law.TITLE,
      type: law.TYPE,
      deptName: law.DEPT_NAME,
      revisionType: version.REVISION_TYPE,
      revisionDate: version.REVISION_DATE,
      effectiveDate: version.EFFECTIVE_DATE
    });
  }

  return {
    success: true,
    data: results
  };
}

// ============================================
// 설정 관련 함수
// ============================================

/**
 * 설정 조회
 */
function getConfig() {
  const configs = sheetToObjects(SHEETS.CONFIG);
  const configObj = {};

  configs.forEach(c => {
    configObj[c.KEY] = c.VALUE;
  });

  return {
    success: true,
    data: configObj
  };
}

// ============================================
// 테스트 함수
// ============================================

/**
 * 테스트용 함수 - 스크립트 에디터에서 실행
 */
function testGetLawList() {
  const result = getLawList({});
  console.log(JSON.stringify(result, null, 2));
}

function testSearch() {
  const result = searchLaws({ keyword: '학칙', searchType: 'all' });
  console.log(JSON.stringify(result, null, 2));
}

// ============================================
// 초기 데이터 입력 함수
// Apps Script 에디터에서 initializeData 실행
// ============================================

/**
 * 샘플 데이터 초기화 - 메뉴에서 실행
 */
function initializeData() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '데이터 초기화',
    '샘플 데이터를 입력하시겠습니까?\n기존 데이터가 있으면 덮어씁니다.',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    initializeLaws();
    initializeVersions();
    initializeArticles();
    initializeDepartments();
    initializeConfig();
    ui.alert('완료', '샘플 데이터가 입력되었습니다.', ui.ButtonSet.OK);
  }
}

/**
 * 스프레드시트 열 때 메뉴 추가
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('규정관리시스템')
    .addItem('샘플 데이터 입력', 'initializeData')
    .addItem('데이터 초기화 (삭제)', 'clearAllData')
    .addSeparator()
    .addItem('API 테스트', 'testGetLawList')
    .addToUi();
}

/**
 * laws 시트 초기화
 */
function initializeLaws() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.LAWS);
  const data = [
    [1, '학칙', '규정', 'D001', '교무처', 1, '시행', '2020-03-01', '2024-03-01'],
    [2, '교원인사규정', '규정', 'D001', '교무처', 1, '시행', '2021-01-01', '2024-01-15'],
    [3, '학생회칙', '규정', 'D002', '학생처', 1, '시행', '2022-03-01', '2023-09-01'],
    [4, '장학금지급규정', '규정', 'D002', '학생처', 1, '시행', '2022-03-01', '2024-02-20'],
    [5, '연구비관리지침', '지침', 'D003', '기획처', 1, '시행', '2023-01-01', '2024-01-10'],
    [6, '출장여비지급지침', '지침', 'D004', '사무처', 1, '시행', '2023-06-01', '2023-06-01'],
    [7, '정보보안관리지침', '지침', 'D005', '정보전산원', 1, '시행', '2023-08-01', '2023-08-01']
  ];

  // 기존 데이터 삭제 (헤더 제외)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  // 새 데이터 입력
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * versions 시트 초기화
 */
function initializeVersions() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.VERSIONS);
  const data = [
    [1, 1, 1, '제정', '2020-03-01', '2020-03-01', '최초 제정', true],
    [2, 2, 1, '제정', '2021-01-01', '2021-01-01', '최초 제정', true],
    [3, 3, 1, '제정', '2022-03-01', '2022-03-01', '최초 제정', true],
    [4, 4, 1, '제정', '2022-03-01', '2022-03-01', '최초 제정', true],
    [5, 5, 1, '제정', '2023-01-01', '2023-01-01', '최초 제정', true],
    [6, 6, 1, '제정', '2023-06-01', '2023-06-01', '최초 제정', true],
    [7, 7, 1, '제정', '2023-08-01', '2023-08-01', '최초 제정', true]
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * articles 시트 초기화
 */
function initializeArticles() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.ARTICLES);
  const data = [
    // 학칙 (VERSION_SEQ: 1)
    [1, 1, '제1장 총칙', '제1조', '목적', '이 학칙은 본 대학교의 학사운영에 관한 기본적인 사항을 규정함을 목적으로 한다.', '', 1],
    [2, 1, '제1장 총칙', '제2조', '명칭', '본 대학교는 "OO대학교"라 칭한다.', '', 2],
    [3, 1, '제1장 총칙', '제3조', '위치', '본 대학교는 경기도 OO시에 둔다.', '', 3],
    [4, 1, '제2장 학기 및 수업', '제4조', '학년도', '학년도는 3월 1일부터 다음 해 2월 말일까지로 한다.', '', 4],
    [5, 1, '제2장 학기 및 수업', '제5조', '학기', '① 학기는 2학기제로 한다.\n② 제1학기는 3월 1일부터 8월 31일까지, 제2학기는 9월 1일부터 다음 해 2월 말일까지로 한다.', '', 5],
    [6, 1, '제2장 학기 및 수업', '제6조', '수업일수', '각 학기의 수업일수는 15주 이상으로 한다.', '', 6],
    [7, 1, '제3장 입학', '제7조', '입학시기', '입학시기는 학년 초로 한다.', '', 7],
    [8, 1, '제3장 입학', '제8조', '입학자격', '본 대학교에 입학할 수 있는 자는 고등학교를 졸업한 자 또는 법령에 의하여 이와 동등 이상의 학력이 있다고 인정된 자로 한다.', '', 8],
    [9, 1, '', '부칙', '', '(시행일) 이 학칙은 2020년 3월 1일부터 시행한다.', '', 100],

    // 교원인사규정 (VERSION_SEQ: 2)
    [10, 2, '', '제1조', '목적', '이 규정은 교원의 임용, 승진, 보수 등 인사에 관한 사항을 규정함을 목적으로 한다.', '', 1],
    [11, 2, '', '제2조', '적용범위', '이 규정은 본 대학교 전임교원에게 적용한다.', '', 2],
    [12, 2, '', '제3조', '교원의 구분', '교원은 교수, 부교수, 조교수, 전임강사로 구분한다.', '', 3],
    [13, 2, '', '부칙', '', '이 규정은 2021년 1월 1일부터 시행한다.', '', 100],

    // 연구비관리지침 (VERSION_SEQ: 5)
    [14, 5, '', '제1조', '목적', '이 지침은 연구비의 효율적인 관리를 위하여 필요한 사항을 규정함을 목적으로 한다.', '', 1],
    [15, 5, '', '제2조', '적용범위', '이 지침은 본 대학교에서 수행하는 모든 연구과제에 적용한다.', '', 2],
    [16, 5, '', '제3조', '연구비의 집행', '연구비는 승인된 연구계획서에 따라 집행하여야 한다.', '', 3],
    [17, 5, '', '부칙', '', '이 지침은 2023년 1월 1일부터 시행한다.', '', 100]
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * departments 시트 초기화
 */
function initializeDepartments() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.DEPARTMENTS);
  const data = [
    // 규정 카테고리
    ['D001', '교무처', '', '규정', 1, true],
    ['D002', '학생처', '', '규정', 2, true],
    ['D003', '기획처', '', '규정', 3, true],
    ['D004', '사무처', '', '규정', 4, true],
    ['D005', '정보전산원', '', '규정', 5, true],
    ['D006', '산학협력단', '', '규정', 6, true],
    // 지침 카테고리
    ['D001', '교무처', '', '지침', 1, true],
    ['D002', '학생처', '', '지침', 2, true],
    ['D003', '기획처', '', '지침', 3, true],
    ['D004', '사무처', '', '지침', 4, true],
    ['D005', '정보전산원', '', '지침', 5, true],
    ['D006', '산학협력단', '', '지침', 6, true]
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * config 시트 초기화
 */
function initializeConfig() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.CONFIG);
  const data = [
    ['SITE_TITLE', '규정관리시스템', '사이트 제목'],
    ['UNIVERSITY_NAME', 'OO대학교', '대학명'],
    ['ADMIN_EMAIL', 'admin@university.ac.kr', '관리자 이메일']
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
}

/**
 * 모든 데이터 삭제 (헤더 제외)
 */
function clearAllData() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '데이터 삭제',
    '모든 데이터를 삭제하시겠습니까?\n(컬럼 헤더는 유지됩니다)',
    ui.ButtonSet.YES_NO
  );

  if (response === ui.Button.YES) {
    const sheetNames = [SHEETS.LAWS, SHEETS.VERSIONS, SHEETS.ARTICLES, SHEETS.DEPARTMENTS, SHEETS.ATTACHMENTS, SHEETS.CONFIG];

    sheetNames.forEach(name => {
      const sheet = getSpreadsheet().getSheetByName(name);
      if (sheet && sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
    });

    ui.alert('완료', '모든 데이터가 삭제되었습니다.', ui.ButtonSet.OK);
  }
}
