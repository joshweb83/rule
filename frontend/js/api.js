/**
 * 규정관리시스템 - API 모듈
 */

const API = {
  /**
   * API 호출 (GET)
   */
  async get(action, params = {}) {
    // 데모 모드일 경우 샘플 데이터 반환
    if (CONFIG.DEMO_MODE) {
      return this.getDemoData(action, params);
    }

    const url = new URL(CONFIG.API_URL);
    url.searchParams.append('action', action);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * API 호출 (POST)
   */
  async post(action, data) {
    if (CONFIG.DEMO_MODE) {
      return { success: true, message: '데모 모드에서는 저장되지 않습니다.' };
    }

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // ============================================
  // API 메서드
  // ============================================

  /**
   * 규정 목록 조회
   */
  getLawList(params = {}) {
    return this.get('getLawList', params);
  },

  /**
   * 규정 상세 조회
   */
  getLawDetail(seq) {
    return this.get('getLawDetail', { seq });
  },

  /**
   * 버전 목록 조회
   */
  getVersions(lawSeq) {
    return this.get('getVersions', { lawSeq });
  },

  /**
   * 조문 목록 조회
   */
  getArticles(versionSeq) {
    return this.get('getArticles', { versionSeq });
  },

  /**
   * 부서 목록 조회
   */
  getDepartments(category) {
    return this.get('getDepartments', { category });
  },

  /**
   * 첨부파일 목록 조회
   */
  getAttachments(versionSeq) {
    return this.get('getAttachments', { versionSeq });
  },

  /**
   * 검색
   */
  search(keyword, searchType = 'all') {
    return this.get('search', { keyword, searchType });
  },

  /**
   * 최신 제/개정 조회
   */
  getLatestRevisions(limit = 10) {
    return this.get('getLatestRevisions', { limit });
  },

  /**
   * 설정 조회
   */
  getConfig() {
    return this.get('getConfig');
  },

  // ============================================
  // 데모 데이터
  // ============================================

  getDemoData(action, params) {
    debug('Demo API:', action, params);

    switch (action) {
      case 'getLawList':
        return this.getDemoLawList(params);
      case 'getLawDetail':
        return this.getDemoLawDetail(params.seq);
      case 'getVersions':
        return this.getDemoVersions(params.lawSeq);
      case 'getDepartments':
        return this.getDemoDepartments(params.category);
      case 'search':
        return this.getDemoSearch(params.keyword);
      case 'getLatestRevisions':
        return this.getDemoLatestRevisions();
      default:
        return { success: false, error: 'Unknown action' };
    }
  },

  // 데모 규정 목록
  getDemoLawList(params) {
    const allLaws = DEMO_DATA.laws;
    let filtered = allLaws;

    if (params.type) {
      filtered = filtered.filter(law => law.type === params.type);
    }
    if (params.deptCode) {
      filtered = filtered.filter(law => law.deptCode === params.deptCode);
    }

    return {
      success: true,
      data: filtered,
      total: filtered.length
    };
  },

  // 데모 규정 상세
  getDemoLawDetail(seq) {
    const law = DEMO_DATA.laws.find(l => l.seq == seq);
    if (!law) {
      return { success: false, error: '규정을 찾을 수 없습니다.' };
    }

    const versions = DEMO_DATA.versions.filter(v => v.lawSeq == seq);
    const currentVersion = versions.find(v => v.isCurrent);
    const articles = currentVersion
      ? DEMO_DATA.articles.filter(a => a.versionSeq == currentVersion.seq)
      : [];
    const attachments = currentVersion
      ? DEMO_DATA.attachments.filter(a => a.versionSeq == currentVersion.seq)
      : [];

    return {
      success: true,
      data: {
        ...law,
        currentVersion,
        articles,
        attachments,
        versions
      }
    };
  },

  // 데모 버전 목록
  getDemoVersions(lawSeq) {
    const versions = DEMO_DATA.versions.filter(v => v.lawSeq == lawSeq);
    return { success: true, data: versions };
  },

  // 데모 부서 목록
  getDemoDepartments(category) {
    let depts = DEMO_DATA.departments;
    if (category) {
      depts = depts.filter(d => d.category === category);
    }
    return { success: true, data: this.buildTree(depts) };
  },

  buildTree(depts) {
    const map = {};
    const roots = [];

    depts.forEach(dept => {
      map[dept.code] = { ...dept, children: [] };
    });

    depts.forEach(dept => {
      if (dept.parentCode && map[dept.parentCode]) {
        map[dept.parentCode].children.push(map[dept.code]);
      } else {
        roots.push(map[dept.code]);
      }
    });

    return roots;
  },

  // 데모 검색
  getDemoSearch(keyword) {
    if (!keyword) return { success: true, data: [], total: 0 };

    const results = [];
    const kw = keyword.toLowerCase();

    DEMO_DATA.laws.forEach(law => {
      if (law.title.toLowerCase().includes(kw)) {
        results.push({
          type: 'title',
          lawSeq: law.seq,
          title: law.title,
          lawType: law.type,
          deptName: law.deptName,
          matchText: law.title
        });
      }
    });

    DEMO_DATA.articles.forEach(article => {
      if (article.content.toLowerCase().includes(kw)) {
        const version = DEMO_DATA.versions.find(v => v.seq == article.versionSeq);
        const law = version ? DEMO_DATA.laws.find(l => l.seq == version.lawSeq) : null;
        if (law) {
          results.push({
            type: 'content',
            lawSeq: law.seq,
            title: law.title,
            lawType: law.type,
            deptName: law.deptName,
            articleNo: article.articleNo,
            articleTitle: article.articleTitle,
            matchText: article.content.substring(0, 100) + '...'
          });
        }
      }
    });

    return {
      success: true,
      data: results,
      total: results.length,
      keyword
    };
  },

  // 데모 최신 제/개정
  getDemoLatestRevisions() {
    const results = DEMO_DATA.versions
      .sort((a, b) => new Date(b.revisionDate) - new Date(a.revisionDate))
      .slice(0, 10)
      .map(version => {
        const law = DEMO_DATA.laws.find(l => l.seq == version.lawSeq);
        return {
          lawSeq: law?.seq,
          title: law?.title,
          type: law?.type,
          deptName: law?.deptName,
          revisionType: version.revisionType,
          revisionDate: version.revisionDate,
          effectiveDate: version.effectiveDate
        };
      });

    return { success: true, data: results };
  }
};

// ============================================
// 데모 데이터
// ============================================

const DEMO_DATA = {
  laws: [
    { seq: 1, title: '학칙', type: '규정', deptCode: 'D001', deptName: '교무처', currentVersion: 5, status: '시행', updatedDate: '2024-03-01' },
    { seq: 2, title: '교원인사규정', type: '규정', deptCode: 'D001', deptName: '교무처', currentVersion: 3, status: '시행', updatedDate: '2024-01-15' },
    { seq: 3, title: '학생회칙', type: '규정', deptCode: 'D003', deptName: '학생처', currentVersion: 2, status: '시행', updatedDate: '2023-09-01' },
    { seq: 4, title: '장학금지급규정', type: '규정', deptCode: 'D003', deptName: '학생처', currentVersion: 4, status: '시행', updatedDate: '2024-02-20' },
    { seq: 5, title: '연구비관리지침', type: '지침', deptCode: 'D002', deptName: '기획처', currentVersion: 2, status: '시행', updatedDate: '2024-01-10' },
    { seq: 6, title: '출장여비지급지침', type: '지침', deptCode: 'D004', deptName: '사무처', currentVersion: 1, status: '시행', updatedDate: '2023-06-01' },
    { seq: 7, title: 'RISE 사업비 관리 운영 지침', type: '지침', deptCode: 'D010', deptName: 'RISE사업단', currentVersion: 1, status: '시행', updatedDate: '2025-10-20' },
    { seq: 8, title: '대학발전기금 관리규정', type: '규정', deptCode: 'D002', deptName: '기획처', currentVersion: 2, status: '시행', updatedDate: '2023-12-15' },
    { seq: 9, title: '산학협력단 회계규정', type: '규정', deptCode: 'D006', deptName: '산학협력단', currentVersion: 3, status: '시행', updatedDate: '2024-02-01' },
    { seq: 10, title: '정보보안관리지침', type: '지침', deptCode: 'D005', deptName: '정보전산원', currentVersion: 1, status: '시행', updatedDate: '2023-08-01' }
  ],

  versions: [
    { seq: 1, lawSeq: 1, version: 5, revisionType: '개정', revisionDate: '2024-03-01', effectiveDate: '2024-03-01', isCurrent: true },
    { seq: 2, lawSeq: 1, version: 4, revisionType: '개정', revisionDate: '2023-03-01', effectiveDate: '2023-03-01', isCurrent: false },
    { seq: 3, lawSeq: 1, version: 3, revisionType: '개정', revisionDate: '2022-03-01', effectiveDate: '2022-03-01', isCurrent: false },
    { seq: 4, lawSeq: 2, version: 3, revisionType: '개정', revisionDate: '2024-01-15', effectiveDate: '2024-02-01', isCurrent: true },
    { seq: 5, lawSeq: 3, version: 2, revisionType: '개정', revisionDate: '2023-09-01', effectiveDate: '2023-09-01', isCurrent: true },
    { seq: 6, lawSeq: 4, version: 4, revisionType: '개정', revisionDate: '2024-02-20', effectiveDate: '2024-03-01', isCurrent: true },
    { seq: 7, lawSeq: 5, version: 2, revisionType: '개정', revisionDate: '2024-01-10', effectiveDate: '2024-02-01', isCurrent: true },
    { seq: 8, lawSeq: 6, version: 1, revisionType: '제정', revisionDate: '2023-06-01', effectiveDate: '2023-06-01', isCurrent: true },
    { seq: 9, lawSeq: 7, version: 1, revisionType: '제정', revisionDate: '2025-10-20', effectiveDate: '2025-10-20', isCurrent: true },
    { seq: 10, lawSeq: 8, version: 2, revisionType: '개정', revisionDate: '2023-12-15', effectiveDate: '2024-01-01', isCurrent: true },
    { seq: 11, lawSeq: 9, version: 3, revisionType: '개정', revisionDate: '2024-02-01', effectiveDate: '2024-03-01', isCurrent: true },
    { seq: 12, lawSeq: 10, version: 1, revisionType: '제정', revisionDate: '2023-08-01', effectiveDate: '2023-09-01', isCurrent: true }
  ],

  articles: [
    // 학칙 (lawSeq: 1, versionSeq: 1)
    { seq: 1, versionSeq: 1, chapter: '제1장 총칙', articleNo: '제1조', articleTitle: '목적', content: '이 학칙은 본 대학교의 학사운영에 관한 기본적인 사항을 규정함을 목적으로 한다.', changeType: '', sortOrder: 1 },
    { seq: 2, versionSeq: 1, chapter: '제1장 총칙', articleNo: '제2조', articleTitle: '명칭', content: '본 대학교는 "OO대학교"라 칭한다.', changeType: '', sortOrder: 2 },
    { seq: 3, versionSeq: 1, chapter: '제1장 총칙', articleNo: '제3조', articleTitle: '위치', content: '본 대학교는 경기도 OO시에 둔다.', changeType: '신규', sortOrder: 3 },
    { seq: 4, versionSeq: 1, chapter: '제2장 학기 및 수업일수', articleNo: '제4조', articleTitle: '학년도', content: '학년도는 3월 1일부터 다음 해 2월 말일까지로 한다.', changeType: '', sortOrder: 4 },
    { seq: 5, versionSeq: 1, chapter: '제2장 학기 및 수업일수', articleNo: '제5조', articleTitle: '학기', content: '① 학기는 2학기제로 한다.\n② 제1학기는 3월 1일부터 8월 31일까지, 제2학기는 9월 1일부터 다음 해 2월 말일까지로 한다.', changeType: '', sortOrder: 5 },
    { seq: 6, versionSeq: 1, chapter: '제2장 학기 및 수업일수', articleNo: '제6조', articleTitle: '수업일수', content: '각 학기의 수업일수는 15주 이상으로 한다.', changeType: '', sortOrder: 6 },
    { seq: 7, versionSeq: 1, chapter: '제3장 입학 및 등록', articleNo: '제7조', articleTitle: '입학시기', content: '입학시기는 학년 초로 한다.', changeType: '', sortOrder: 7 },
    { seq: 8, versionSeq: 1, chapter: '제3장 입학 및 등록', articleNo: '제8조', articleTitle: '입학자격', content: '본 대학교에 입학할 수 있는 자는 고등학교를 졸업한 자 또는 법령에 의하여 이와 동등 이상의 학력이 있다고 인정된 자로 한다.', changeType: '변경', sortOrder: 8 },
    { seq: 9, versionSeq: 1, chapter: '', articleNo: '부칙', articleTitle: '', content: '(시행일) 이 학칙은 2024년 3월 1일부터 시행한다.', changeType: '', sortOrder: 100 },

    // RISE 사업비 관리 운영 지침 (lawSeq: 7, versionSeq: 9)
    { seq: 20, versionSeq: 9, chapter: '', articleNo: '제1조', articleTitle: '목적', content: '이 지침은 RISE사업의 효율적인 사업비 관리를 위하여 필요한 사항을 규정함을 목적으로 한다.', changeType: '', sortOrder: 1 },
    { seq: 21, versionSeq: 9, chapter: '', articleNo: '제2조', articleTitle: '적용범위', content: '이 지침은 RISE사업에서 지원받는 모든 사업비에 적용한다.', changeType: '', sortOrder: 2 },
    { seq: 22, versionSeq: 9, chapter: '', articleNo: '제3조', articleTitle: '용어의 정의', content: '이 지침에서 사용하는 용어의 정의는 다음과 같다.\n1. "사업비"란 RISE사업 수행에 필요한 경비를 말한다.\n2. "실행부서"란 사업비를 직접 집행하는 부서를 말한다.', changeType: '', sortOrder: 3 },
    { seq: 23, versionSeq: 9, chapter: '제2장 사업비 관리', articleNo: '제4조', articleTitle: '회계연도', content: '사업비의 회계연도는 정부의 회계연도에 따른다.', changeType: '', sortOrder: 4 },
    { seq: 24, versionSeq: 9, chapter: '제2장 사업비 관리', articleNo: '제5조', articleTitle: '사업비 관리', content: '① 사업비는 별도의 계정으로 관리한다.\n② 사업단장은 사업비 관리에 관한 총괄 책임을 진다.', changeType: '', sortOrder: 5 },
    { seq: 25, versionSeq: 9, chapter: '제2장 사업비 관리', articleNo: '제6조', articleTitle: '실행부서', content: '사업비 집행을 위한 실행부서는 사업단장이 지정한다.', changeType: '', sortOrder: 6 },
    { seq: 26, versionSeq: 9, chapter: '제2장 사업비 관리', articleNo: '제7조', articleTitle: '예산 변경', content: '예산의 변경은 사업단장의 승인을 받아야 한다. 다만, 항목 간 전용은 총 예산의 20% 범위 내에서 가능하다.', changeType: '', sortOrder: 7 },
    { seq: 27, versionSeq: 9, chapter: '제2장 사업비 관리', articleNo: '제12조의2', articleTitle: '성과급 및 사업관리운영수당', content: '① 사업의 성공적 추진과 효과적 관리를 위해 내부 교직원을 대상으로 성과급 및 사업관리운영수당을 지급할 수 있다.\n② 성과급 및 사업관리 운영수당은 사업비 총액의 5% 범위내에서 지급 할 수 있으며, 지급대상의 범위 및 지급액 등 구체적인 사항은 총장이 따로 정한다.', changeType: '신규', sortOrder: 8 },
    { seq: 28, versionSeq: 9, chapter: '제4장 사업 결과 보고', articleNo: '제13조', articleTitle: '결과보고', content: '사업 실행부서장은 단위과제 종료 후 사업단장이 정한 기한 및 방법에 따라 사업별 결과보고서를 작성하여 사업단장에게 제출하여야 한다.', changeType: '신규', sortOrder: 9 },
    { seq: 29, versionSeq: 9, chapter: '제4장 사업 결과 보고', articleNo: '제14조', articleTitle: '성과보고', content: '사업단장은 각 사업 실행부서의 사업 결과보고서 수합 및 사업성과를 총장에게 보고(제출)하여야 한다.', changeType: '신규', sortOrder: 10 },
    { seq: 30, versionSeq: 9, chapter: '제4장 사업 결과 보고', articleNo: '제15조', articleTitle: '사후관리', content: '사업단장, 실행부서장은 국고보조금의 관리 및 집행에 관하여 수시로 자체 점검을 실시하여 보완 및 시정하고 사후관리에 철저를 기하여야 한다.', changeType: '신규', sortOrder: 11 },
    { seq: 31, versionSeq: 9, chapter: '제4장 사업 결과 보고', articleNo: '제16조', articleTitle: '기타 사항', content: '이 지침 시행에 필요한 세부 사항 등은 RISE운영위원회 심의를 거쳐 총장이 따로 정할 수 있다.', changeType: '신규', sortOrder: 12 },
    { seq: 32, versionSeq: 9, chapter: '', articleNo: '부칙', articleTitle: '', content: '(시행일) 이 지침은 2025년 10월 20일부터 시행한다.', changeType: '', sortOrder: 100 }
  ],

  departments: [
    // 규정 카테고리
    { code: 'D001', name: '교무처', parentCode: '', category: '규정', sortOrder: 1 },
    { code: 'D002', name: '기획처', parentCode: '', category: '규정', sortOrder: 2 },
    { code: 'D003', name: '학생처', parentCode: '', category: '규정', sortOrder: 3 },
    { code: 'D004', name: '사무처', parentCode: '', category: '규정', sortOrder: 4 },
    { code: 'D005', name: '정보전산원', parentCode: '', category: '규정', sortOrder: 5 },
    { code: 'D006', name: '산학협력단', parentCode: '', category: '규정', sortOrder: 6 },

    // 지침 카테고리
    { code: 'D001', name: '교무처', parentCode: '', category: '지침', sortOrder: 1 },
    { code: 'D002', name: '기획처', parentCode: '', category: '지침', sortOrder: 2 },
    { code: 'D003', name: '학생처', parentCode: '', category: '지침', sortOrder: 3 },
    { code: 'D004', name: '사무처', parentCode: '', category: '지침', sortOrder: 4 },
    { code: 'D005', name: '정보전산원', parentCode: '', category: '지침', sortOrder: 5 },
    { code: 'D006', name: '산학협력단', parentCode: '', category: '지침', sortOrder: 6 },
    { code: 'D010', name: 'RISE사업단', parentCode: '', category: '지침', sortOrder: 10 }
  ],

  attachments: [
    { seq: 1, versionSeq: 9, fileName: '[별표] 부천대학교 RISE사업 사업비 집행 기준.hwp', fileUrl: '#', fileType: '별표', fileSize: '125KB', sortOrder: 1 }
  ]
};
