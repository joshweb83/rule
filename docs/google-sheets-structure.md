# 구글 시트 구조 설계서

## 개요
이 문서는 규정관리시스템의 데이터베이스 역할을 하는 구글 시트의 구조를 정의합니다.

## 시트 구성

### 1. laws (규정목록)
규정/지침/세칙 등의 기본 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| SEQ | NUMBER | 고유번호 (자동증가) | 1 |
| TITLE | TEXT | 규정 제목 | 학칙 |
| TYPE | TEXT | 규정유형 (규정/지침/세칙/내규) | 규정 |
| DEPT_CODE | TEXT | 부서코드 | D001 |
| DEPT_NAME | TEXT | 담당부서명 | 교무처 |
| CURRENT_VERSION | NUMBER | 현행 버전 번호 | 3 |
| STATUS | TEXT | 상태 (시행/폐지) | 시행 |
| CREATED_DATE | DATE | 최초 등록일 | 2020-03-01 |
| UPDATED_DATE | DATE | 최종 수정일 | 2024-01-15 |

### 2. versions (버전이력)
각 규정의 제정/개정 이력을 관리합니다.

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| SEQ | NUMBER | 고유번호 | 1 |
| LAW_SEQ | NUMBER | 규정 SEQ (FK) | 1 |
| VERSION | NUMBER | 버전 번호 | 2 |
| REVISION_TYPE | TEXT | 구분 (제정/개정/폐지) | 개정 |
| REVISION_DATE | DATE | 제정/개정일 | 2023-05-01 |
| EFFECTIVE_DATE | DATE | 시행일 | 2023-06-01 |
| REVISION_REASON | TEXT | 개정 사유 | 조직개편에 따른 개정 |
| IS_CURRENT | BOOLEAN | 현행 여부 | TRUE |

### 3. articles (조문내용)
각 버전의 조문 상세 내용을 저장합니다.

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| SEQ | NUMBER | 고유번호 | 1 |
| VERSION_SEQ | NUMBER | 버전 SEQ (FK) | 2 |
| CHAPTER | TEXT | 장 번호/제목 | 제1장 총칙 |
| ARTICLE_NO | TEXT | 조 번호 | 제1조 |
| ARTICLE_TITLE | TEXT | 조 제목 | 목적 |
| CONTENT | TEXT | 조문 내용 | 이 규정은... |
| CHANGE_TYPE | TEXT | 변경구분 (신규/변경/삭제) | 신규 |
| SORT_ORDER | NUMBER | 정렬 순서 | 1 |

### 4. departments (부서분류)
규정을 분류하는 부서/조직 트리 구조입니다.

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| CODE | TEXT | 부서코드 (PK) | D001 |
| NAME | TEXT | 부서명 | 교무처 |
| PARENT_CODE | TEXT | 상위부서코드 | |
| CATEGORY | TEXT | 분류 (규정/지침/서식) | 지침 |
| SORT_ORDER | NUMBER | 정렬 순서 | 1 |
| IS_ACTIVE | BOOLEAN | 사용 여부 | TRUE |

### 5. attachments (첨부파일)
규정 관련 첨부파일 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| SEQ | NUMBER | 고유번호 | 1 |
| VERSION_SEQ | NUMBER | 버전 SEQ (FK) | 2 |
| FILE_NAME | TEXT | 파일명 | 학칙전문.hwp |
| FILE_URL | TEXT | Google Drive URL | https://drive.google.com/... |
| FILE_TYPE | TEXT | 구분 (전문/별표/서식) | 전문 |
| FILE_SIZE | TEXT | 파일 크기 | 125KB |
| SORT_ORDER | NUMBER | 정렬 순서 | 1 |

### 6. config (설정)
시스템 설정 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| KEY | TEXT | 설정 키 | SITE_TITLE |
| VALUE | TEXT | 설정 값 | 부천대학교 규정관리시스템 |
| DESCRIPTION | TEXT | 설명 | 사이트 제목 |

---

## 시트 생성 순서

1. 새 Google Sheets 문서 생성
2. 기본 시트명을 `laws`로 변경
3. 나머지 시트 추가: `versions`, `articles`, `departments`, `attachments`, `config`
4. 각 시트의 1행에 컬럼명 입력
5. 샘플 데이터 입력

## 구글 시트 URL 형식
```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
```

## 권한 설정
- 웹 앱에서 접근하려면 "링크가 있는 모든 사용자에게 공개" 설정 필요
- 또는 서비스 계정을 통한 접근 설정
