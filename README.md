# 규정관리시스템

Google Sheets를 데이터베이스로 활용한 대학교 규정관리시스템입니다.

## 프로젝트 구조

```
rule/
├── frontend/                 # 프론트엔드 (HTML/CSS/JS)
│   ├── index.html           # 메인 페이지
│   ├── css/
│   │   └── style.css        # 스타일시트
│   ├── js/
│   │   ├── config.js        # 설정 파일
│   │   ├── api.js           # API 모듈 + 데모 데이터
│   │   └── app.js           # 메인 앱 로직
│   └── assets/              # 이미지, 폰트 등
├── backend/
│   └── Code.gs              # Google Apps Script 코드
└── docs/
    └── google-sheets-structure.md  # 구글 시트 구조 설계서
```

## 주요 기능

- **규정 분류**: 규정, 지침, 세칙, 내규 등 유형별 분류
- **부서별 트리**: 부서/조직별 계층 구조로 규정 탐색
- **버전 관리**: 제정/개정 이력 추적 및 버전별 조회
- **조문 뷰어**: 2단 레이아웃 (목차 + 본문), 개정 조문 하이라이트
- **검색 기능**: 제목/내용 통합 검색, 가나다 검색, 개정일 검색
- **첨부파일**: 전문(HWP/PDF), 별표/서식 다운로드
- **인쇄**: 인쇄용 스타일 지원

## 설치 및 설정

### 1단계: Google Sheets 생성

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 시트 이름을 다음과 같이 변경/추가:
   - `laws` (규정목록)
   - `versions` (버전이력)
   - `articles` (조문내용)
   - `departments` (부서분류)
   - `attachments` (첨부파일)
   - `config` (설정)

3. 각 시트의 1행에 컬럼명 입력 (`docs/google-sheets-structure.md` 참조)

4. 스프레드시트 ID 복사 (URL에서 `/d/` 와 `/edit` 사이의 문자열)
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

### 2단계: Google Apps Script 배포

1. Google Sheets에서 **확장 프로그램 > Apps Script** 선택
2. `backend/Code.gs` 내용을 붙여넣기
3. `SPREADSHEET_ID`를 실제 시트 ID로 변경
4. **배포 > 새 배포** 클릭
5. 유형: **웹 앱** 선택
6. 설정:
   - 설명: 규정관리시스템 API
   - 실행 주체: 본인
   - 액세스 권한: **모든 사용자**
7. **배포** 클릭 후 웹 앱 URL 복사

### 3단계: 프론트엔드 설정

1. `frontend/js/config.js` 파일 열기
2. `API_URL`을 복사한 웹 앱 URL로 변경:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
   ```
3. `DEMO_MODE`를 `false`로 변경:
   ```javascript
   DEMO_MODE: false
   ```
4. 사이트 정보 수정 (대학명, 주소 등)

### 4단계: 호스팅

#### GitHub Pages (무료)
1. GitHub 저장소 생성
2. `frontend/` 폴더 내용 업로드
3. Settings > Pages에서 배포

#### 기타 옵션
- Netlify
- Vercel
- 학교 웹서버

## 데모 모드 실행

API 연동 없이 바로 테스트하려면:

1. `frontend/js/config.js`에서 `DEMO_MODE: true` 확인
2. `frontend/index.html`을 브라우저에서 열기

샘플 데이터가 포함되어 있어 기능을 미리 확인할 수 있습니다.

## 시트 데이터 입력 예시

### laws (규정목록)
| SEQ | TITLE | TYPE | DEPT_CODE | DEPT_NAME | CURRENT_VERSION | STATUS |
|-----|-------|------|-----------|-----------|-----------------|--------|
| 1 | 학칙 | 규정 | D001 | 교무처 | 5 | 시행 |
| 2 | 연구비관리지침 | 지침 | D002 | 기획처 | 2 | 시행 |

### versions (버전이력)
| SEQ | LAW_SEQ | VERSION | REVISION_TYPE | REVISION_DATE | EFFECTIVE_DATE | IS_CURRENT |
|-----|---------|---------|---------------|---------------|----------------|------------|
| 1 | 1 | 5 | 개정 | 2024-03-01 | 2024-03-01 | TRUE |
| 2 | 1 | 4 | 개정 | 2023-03-01 | 2023-03-01 | FALSE |

### articles (조문내용)
| SEQ | VERSION_SEQ | CHAPTER | ARTICLE_NO | ARTICLE_TITLE | CONTENT | CHANGE_TYPE | SORT_ORDER |
|-----|-------------|---------|------------|---------------|---------|-------------|------------|
| 1 | 1 | 제1장 총칙 | 제1조 | 목적 | 이 학칙은... | | 1 |
| 2 | 1 | 제1장 총칙 | 제2조 | 적용범위 | 본 규정은... | 신규 | 2 |

## 커스터마이징

### 색상 변경
`frontend/css/style.css`의 `:root` 변수 수정:
```css
:root {
  --primary-color: #1a5276;    /* 메인 색상 */
  --accent-color: #f39c12;     /* 강조 색상 */
  ...
}
```

### 로고 변경
`frontend/index.html`의 `.logo` 영역 수정

### 규정 유형 추가
`frontend/js/config.js`의 `LAW_TYPES` 객체에 추가

## 제한사항

- Google Sheets API 호출 제한: 분당 60회
- 권장 데이터량: 규정 500건 이하, 조문 5,000건 이하
- 동시 접속자: 100명 이하 권장

대규모 시스템의 경우 별도 데이터베이스(Firebase, Supabase 등) 사용을 권장합니다.

## 라이선스

MIT License
