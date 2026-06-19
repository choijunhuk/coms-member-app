# COMS Member App

COMS 회원이 휴대폰에서 매일 쓰는 기능만 모은 독립 모바일 앱입니다.
기존 `coms-website` 서버의 `https://coms.kw.ac.kr/api`를 호출하고, 웹사이트의 모집/지원/소개/전체 관리자 화면은 앱에 넣지 않습니다.

[![Latest Android APK](https://img.shields.io/github/v/release/choijunhuk/coms-member-app?label=Android%20APK&style=for-the-badge)](https://github.com/choijunhuk/coms-member-app/releases/latest)

---

## 빠른 다운로드

### Android 폰 - APK 직접 설치

가장 쉬운 설치 방법입니다.

1. 폰 브라우저에서 [최신 Release 페이지](https://github.com/choijunhuk/coms-member-app/releases/latest)를 엽니다.
2. `coms-member-debug.apk`를 다운로드합니다.
3. 처음 설치하면 Android가 "출처를 알 수 없는 앱" 허용을 요구합니다.
   - 설정 - 보안 - 출처를 알 수 없는 앱 - 사용 중인 브라우저 허용
4. 다운로드된 APK를 열고 설치합니다.
5. 홈 화면의 `COMS Member` 앱을 실행하고 COMS 계정으로 로그인합니다.

현재 고정 테스트 빌드:

| 버전 | 빌드 | 파일 |
|---|---|---|
| v0.1.0 | Debug | [coms-member-debug.apk](https://github.com/choijunhuk/coms-member-app/releases/download/v0.1.0-debug/coms-member-debug.apk) |

최소 요구사항: Android 7.0(API 24) 이상.
Debug APK는 Play Store 자동 업데이트가 되지 않으므로 새 버전은 Release 페이지에서 다시 받아 설치해야 합니다.

### iPhone / iPad - Xcode 직접 설치

iOS는 Android APK처럼 파일 하나를 공개 링크로 바로 설치할 수 없습니다. Apple 서명 정책 때문에 아래 둘 중 하나가 필요합니다.

- 개인 설치: Mac + Xcode + Apple ID로 본인 iPhone에 직접 빌드
- 단체 배포: Apple Developer Program 계정으로 TestFlight 또는 App Store 배포

개인 iPhone에 직접 설치:

```sh
git clone https://github.com/choijunhuk/coms-member-app.git
cd coms-member-app
npm install
npm run cap:sync
npm run cap:ios
```

Xcode가 열리면 다음을 설정합니다.

1. 좌측 `App` 타깃 선택
2. `Signing & Capabilities` - `Team`에서 본인 Apple ID 선택
3. iPhone을 Mac에 연결하고 디바이스 드롭다운에서 선택
4. Run 버튼 또는 `Cmd+R`
5. iPhone에서 개발자 신뢰가 필요하면 설정 - 일반 - VPN 및 기기 관리 - 본인 Apple ID - 신뢰

최소 요구사항: iOS 15.0 이상.
무료 Apple ID로 설치한 앱은 보통 7일마다 재서명이 필요합니다. 여러 회원에게 배포하려면 TestFlight가 현실적인 경로입니다.

### iOS TestFlight 배포

Apple Developer Program 계정이 있는 경우:

1. `npm run cap:sync`
2. `npm run cap:ios`
3. Xcode에서 `Product - Archive`
4. Organizer에서 `Distribute App - App Store Connect`
5. App Store Connect에서 TestFlight 내부/외부 테스터 초대

현재 저장소에는 iOS 프로젝트가 포함되어 있고, 번들 ID는 `kr.ac.kw.coms.memberapp`입니다. 푸시 토큰 전달과 `coms-member-app://` 딥링크 스킴도 iOS 네이티브 설정에 연결되어 있습니다.

---

## 개발자용 빌드

### 공통 준비

```sh
npm install
```

로컬 웹 개발:

```sh
npm run dev
```

기본 주소는 `http://127.0.0.1:5174`입니다. 로컬 개발 중 `/api` 요청은 Vite proxy를 통해 `https://coms.kw.ac.kr`로 전달됩니다.

모바일 번들 빌드:

```sh
npm run build:mobile
```

모바일 빌드는 별도 지정이 없으면 `VITE_API_BASE_URL=https://coms.kw.ac.kr/api`를 사용합니다.

### Android 빌드

```sh
npm run cap:sync
cd android
./gradlew assembleDebug
```

결과물:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Android Studio에서 열기:

```sh
npm run cap:android
```

### iOS 빌드

```sh
npm run cap:sync
npm run cap:ios
```

Xcode에서 서명 팀을 선택한 뒤 실제 iPhone 또는 iOS Simulator로 실행합니다. 푸시 알림 토큰 등록은 실제 기기와 APNs 설정이 필요합니다.

---

## 기능 범위

### 회원 기능

- 로그인, 로그아웃, 로그인 유지
- 홈 대시보드: 일정/활동 요약, 최신 공지, 최근 커뮤니티 글, 안 읽은 알림
- 공지사항 목록/상세, 중요 공지 강조
- 커뮤니티 목록/상세, 글 작성, 댓글, 이미지 보기, 추천/비추천, 투표 참여
- 자료실 목록, 검색, 카테고리 필터, 다운로드
- 내 정보: 이름, 학번, 표시용 기수, 이메일 인증 상태, 비밀번호 변경
- 알림 센터: 알림 목록, 읽음 처리, 모두 읽음
- 앱 설정: 푸시 유형, 생체 잠금, 개인정보 안내

### 활동/일정 기능

- 활동 기록과 월간 캘린더
- 일정/활동 알림 딥링크
- 자료실 최근 다운로드 바로가기
- 홈은 요약 중심, 자세한 이력과 런처는 Activity 탭 중심

### 운영진 라이트 기능

관리자 권한 회원에게만 하단 `운영` 탭을 보여줍니다.

- 공지 작성/수정
- 활동/일정 등록
- 최근 커뮤니티 글 삭제
- 가입 회원 수와 명부 대기 상태 요약
- 최근 운영 기록 요약

명부 업로드, 차단 학생 관리, 권한 변경, 비밀번호 강제 변경, 전체 감사 로그 관리는 웹 관리자에서 처리합니다.

---

## 기능 매트릭스

| 기능 | Android | iOS | 웹 개발 |
|---|---:|---:|---:|
| COMS 로그인/세션 유지 | 지원 | 지원 | 지원 |
| 공지/커뮤니티/자료실 | 지원 | 지원 | 지원 |
| 활동/일정 탭 | 지원 | 지원 | 지원 |
| 운영진 라이트 탭 | 권한별 지원 | 권한별 지원 | 권한별 지원 |
| `coms-member-app://` 딥링크 | 지원 | 지원 | 브라우저 제한 |
| HTTPS universal link | 서버/OS 설정 필요 | Associated Domains 필요 | 웹 링크로 동작 |
| 푸시 권한 UI | 지원 | 지원 | 상태 표시만 |
| 푸시 토큰 등록 | Firebase 설정 필요 | APNs 설정 필요 | 미지원 |
| 생체 잠금 | 기기 지원 시 | 기기 지원 시 | 미지원 |

---

## 서버 호환 조건

앱은 서버 API를 통해서만 데이터를 가져옵니다. 운영 서버는 다음 API를 제공해야 합니다.

- `GET /api/mobile/v1/home`
- `GET /api/mobile/v1/app-config`
- `POST /api/mobile/v1/push-tokens`

`/api/mobile/v1/home`이 없으면 기존 공지/커뮤니티/자료실/알림 API로 fallback 합니다.

모바일 WebView에서 API가 동작하려면 운영 서버가 Capacitor origin을 허용해야 합니다.

```properties
cors.allowed-origins=https://coms.kw.ac.kr,http://localhost:5173,https://localhost,capacitor://localhost
```

앱 origin과 API origin이 다르므로 세션 쿠키는 운영 환경에서 `SameSite=None; Secure`로 발급되어야 합니다.

```yaml
server:
  servlet:
    session:
      cookie:
        same-site: none
        secure: true
```

푸시 토큰 저장용 DB 마이그레이션은 `V38__mobile_push_tokens.sql`입니다.

---

## 환경 변수

```sh
VITE_API_BASE_URL=https://coms.kw.ac.kr/api
VITE_SENTRY_DSN=
VITE_SENTRY_ENV=production
```

다른 서버를 쓰려면 `.env`에 값을 지정합니다. 브라우저 개발에서는 프록시 친화적인 상대 `/api`를 쓰고, Android/iOS 모바일 빌드에서는 운영 API 절대 경로를 기본값으로 사용합니다.

---

## 검증

```sh
npm test
npm run lint
npm run build
npm run cap:sync
```

`npm test`에는 iOS 네이티브 계약 검사가 포함되어 있습니다.

- `AppDelegate.swift`가 푸시 등록 토큰과 오류를 Capacitor에 전달하는지 확인
- `Info.plist`가 `COMS Member` 표시명과 `coms-member-app://` URL 스킴을 포함하는지 확인

---

## APK 릴리스

GitHub Actions의 `Release APK` 워크플로는 태그 push 또는 수동 실행으로 debug APK를 Release에 업로드합니다.

태그로 배포:

```sh
git tag v0.2.0-debug
git push origin v0.2.0-debug
```

워크플로는 `npm ci`, `npm run build:mobile`, `npx cap sync android`, `./gradlew assembleDebug` 순서로 실행하고 `coms-member-debug.apk`를 Release asset으로 올립니다.

---

## 보안 기준

- 앱 코드에 JWT secret, DB 비밀번호, SMTP 계정, 푸시 서버 키를 저장하지 않습니다.
- 앱은 서버 API를 통해서만 데이터를 가져옵니다.
- 운영 탭은 관리자 권한일 때만 보입니다.
- 전화번호, 이메일, IP 같은 민감 필드는 운영 요약 화면에 노출하지 않습니다.
- 푸시 발송 서버 키와 APNs/FCM 서버 인증 정보는 앱이 아니라 Spring Boot 서버 또는 비밀 저장소에 둡니다.

---

## 폴더 구조

```text
coms-member-app/
├── android/              # Capacitor Android 프로젝트
├── ios/                  # Capacitor iOS 프로젝트
├── scripts/              # 모바일 빌드 스크립트
├── src/
│   ├── screens/          # 탭/화면
│   ├── services/         # API, 네이티브 브리지, 관측성
│   └── utils/            # 라우팅, 버전, 권한, 포맷 유틸
├── tests/                # Node 기반 계약/유틸 테스트
├── capacitor.config.json
└── README.md
```
