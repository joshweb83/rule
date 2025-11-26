/**
 * 규정관리시스템 - 설정 파일
 */

const CONFIG = {
  // Google Apps Script 웹 앱 URL (배포 후 변경 필요)
  API_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL',

  // 사이트 정보
  SITE: {
    TITLE: '규정관리시스템',
    UNIVERSITY_NAME: '대학교',
    UNIVERSITY_URL: 'https://www.university.ac.kr',
    ADDRESS: '(우00000) 경기도 OO시 OO로 00',
    TEL: '000-000-0000',
    FAX: '000-000-0000'
  },

  // 규정 유형
  LAW_TYPES: {
    '규정': { label: '규정', class: 'type-regulation', icon: 'fas fa-book' },
    '지침': { label: '지침', class: 'type-guideline', icon: 'fas fa-file-alt' },
    '세칙': { label: '세칙', class: 'type-detail', icon: 'fas fa-file' },
    '내규': { label: '내규', class: 'type-internal', icon: 'fas fa-file-contract' }
  },

  // 개정 유형
  REVISION_TYPES: {
    '제정': { label: '제정', class: 'revision-new' },
    '개정': { label: '개정', class: 'revision-modified' },
    '폐지': { label: '폐지', class: 'revision-abolished' }
  },

  // 변경 유형 (조문)
  CHANGE_TYPES: {
    '신규': { label: '신규', class: 'new' },
    '변경': { label: '변경', class: 'modified' },
    '삭제': { label: '삭제', class: 'deleted' }
  },

  // 페이지당 항목 수
  PAGE_SIZE: 20,

  // 최신 제/개정 표시 개수
  LATEST_REVISION_COUNT: 10,

  // 디버그 모드 (개발 시 true로 설정)
  DEBUG: true,

  // 데모 모드 (API 연동 없이 샘플 데이터 사용)
  DEMO_MODE: true
};

// 디버그 로그
function debug(...args) {
  if (CONFIG.DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}
