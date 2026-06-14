# COMS Member App

COMS 회원이 매일 쓰는 기능만 담은 독립 모바일 앱 프로젝트입니다.

이 앱은 기존 `coms-website` 저장소와 분리되어 있으며, 기존 Spring Boot API 서버(`https://coms.kw.ac.kr/api`)를 호출합니다. 웹사이트의 모집, 지원서, 소개, 회원가입, 전체 관리자 패널은 앱에 포함하지 않습니다.

## 1차 MVP 범위

- 로그인, 로그아웃, 로그인 유지
- 홈 대시보드: 최신 공지, 최근 커뮤니티 글, 안 읽은 알림, 자료실 바로가기
- 공지사항 목록/상세, 중요 공지 강조
- 커뮤니티 목록/상세, 글 작성, 댓글, 이미지 보기, 추천/비추천, 투표 참여
- 자료실 목록, 검색, 카테고리 필터, 다운로드
- 내 정보: 이름, 학번, 표시용 기수, 이메일 인증 상태, 비밀번호 변경

## 제외 범위

- 지원서 작성
- 모집 안내
- 동아리 소개/활동/프로젝트 홍보 페이지
- 회원가입
- 전체 관리자 패널, 명부 업로드, 차단 학생 관리, 폰트 관리, 감사 로그

## 보안 기준

- 앱 코드에 JWT secret, DB 비밀번호, SMTP 계정, 푸시 키를 저장하지 않습니다.
- 앱은 서버 API를 통해서만 데이터를 가져옵니다.
- 민감한 관리자/명부 데이터는 앱 기능에 포함하지 않습니다.
- 모바일 WebView 인증은 실제 기기에서 쿠키/CORS 동작 검증이 필요합니다.

## 실행

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://127.0.0.1:5174`입니다. 로컬 개발 중 API 요청은 Vite proxy를 통해 `https://coms.kw.ac.kr/api`로 전달됩니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

## Android/iOS 동기화

```bash
npm run cap:sync
```

네이티브 프로젝트가 없으면 먼저 실행합니다.

```bash
npx cap add android
npx cap add ios
npm run cap:sync
```

Android Studio/Xcode에서 열기:

```bash
npm run cap:android
npm run cap:ios
```

## 환경 변수

```bash
VITE_API_BASE_URL=https://coms.kw.ac.kr/api
```

다른 서버를 쓰려면 `.env`에 값을 지정하세요. Android/iOS용 `npm run build:mobile`과 `npm run cap:sync`는 별도 지정이 없으면 `https://coms.kw.ac.kr/api`를 기본 API로 빌드합니다.
