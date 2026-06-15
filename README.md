# COMS Member App

COMS 회원이 매일 쓰는 기능만 담은 독립 모바일 앱 프로젝트입니다.

## 다운로드

| 버전 | 빌드 | 파일 |
|---|---|---|
| v0.1.0 | Debug (테스트용) | [coms-member-debug.apk](https://github.com/choijunhuk/coms-member-app/releases/download/v0.1.0-debug/coms-member-debug.apk) |

설치 방법은 [Android APK 빌드 및 배포 > 회원용 설치 가이드](#3-회원용-설치-가이드-앱-다운로드-후) 참고.


이 앱은 기존 `coms-website` 저장소와 분리되어 있으며, 기존 Spring Boot API 서버(`https://coms.kw.ac.kr/api`)를 호출합니다. 웹사이트의 모집, 지원서, 소개, 회원가입, 전체 관리자 패널은 앱에 포함하지 않습니다.

## 1차 MVP 범위

- 로그인, 로그아웃, 로그인 유지
- 홈 대시보드: 최신 공지, 최근 커뮤니티 글, 안 읽은 알림, 자료실 바로가기
- 공지사항 목록/상세, 중요 공지 강조
- 커뮤니티 목록/상세, 글 작성, 댓글, 이미지 보기, 추천/비추천, 투표 참여
- 자료실 목록, 검색, 카테고리 필터, 다운로드
- 내 정보: 이름, 학번, 표시용 기수, 이메일 인증 상태, 비밀번호 변경

## 2차 앱 기능

- 알림 센터: 알림 목록, 읽음 처리, 모두 읽음
- 딥링크: `coms-member-app://notices/{id}`, `coms-member-app://community/{id}`, `https://coms.kw.ac.kr/notices/{id}`, `https://coms.kw.ac.kr/community/{id}`
- 푸시 준비: Capacitor App/Push Notifications 플러그인 연결, 기기 토큰 등록 API 호출
- 앱 전용 홈 요약 API 우선 호출: `GET /api/mobile/v1/home`
- 앱 설정 API: `GET /api/mobile/v1/app-config`

`/api/mobile/v1/home`이 없는 서버에서는 기존 공지/커뮤니티/자료실/알림 API로 자동 fallback 합니다.

## 3차 운영진 라이트 기능

관리자 권한 회원에게만 하단 `운영` 탭을 보여줍니다.

- 공지 작성/수정
- 최근 커뮤니티 글 삭제
- 가입 회원 수와 명부 대기 상태 요약
- 최근 운영 기록 요약

명부 업로드, 차단 학생 관리, 권한 변경, 비밀번호 강제 변경, 전체 감사 로그 관리는 계속 웹 관리자에서 처리합니다.

## 제외 범위

- 지원서 작성
- 모집 안내
- 동아리 소개/활동/프로젝트 홍보 페이지
- 회원가입
- 전체 관리자 패널, 명부 업로드, 차단 학생 관리, 폰트 관리, 감사 로그

## 보안 기준

- 앱 코드에 JWT secret, DB 비밀번호, SMTP 계정, 푸시 키를 저장하지 않습니다.
- 앱은 서버 API를 통해서만 데이터를 가져옵니다.
- 앱의 운영 탭은 관리자 권한일 때만 보이고, 전화번호/이메일/IP 같은 민감 필드는 화면에 표시하지 않습니다.
- 푸시 발송 서버 키는 앱이 아니라 Spring Boot 서버 환경 변수 또는 서버 비밀 저장소에 둬야 합니다.
- 모바일 WebView 인증은 실제 기기에서 쿠키/CORS 동작 검증이 필요합니다.

## 백엔드 모바일 API

기존 `coms-website` Spring Boot 서버에 다음 API가 추가되어야 합니다.

- `GET /api/mobile/v1/home`
- `GET /api/mobile/v1/app-config`
- `POST /api/mobile/v1/push-tokens`

푸시 토큰 저장용 DB 마이그레이션은 `V38__mobile_push_tokens.sql`입니다.

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
VITE_SENTRY_DSN=                       # 비워두면 Sentry 비활성
VITE_SENTRY_ENV=production
```

다른 서버를 쓰려면 `.env`에 값을 지정하세요. Android/iOS용 `npm run build:mobile`과 `npm run cap:sync`는 별도 지정이 없으면 `https://coms.kw.ac.kr/api`를 기본 API로 빌드합니다.

## Android APK 빌드 및 배포

### 사전 준비

- macOS/Windows/Linux 어디서나 가능
- [Android Studio](https://developer.android.com/studio) 설치 (Android SDK + 빌드 도구 포함)
- Java 17 이상 (Android Studio에 번들된 JDK 사용 가능)
- `npm install`로 의존성 설치 완료 상태

### 1) Debug APK (테스트용, 빠름)

```bash
npm run cap:sync                          # dist → android 동기화
cd android
./gradlew assembleDebug
```

결과물:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

이 APK는 디버그 키스토어로 자동 서명됩니다. 본인 + 소수 테스터 설치 용도. 자동 업데이트는 안 되고, 새 버전마다 수동 재설치가 필요합니다.

### 2) Release APK (배포용, 영구 서명)

#### (a) 키스토어 생성 (한 번만)

```bash
keytool -genkeypair -v \
  -keystore ~/.coms-release.keystore \
  -alias coms-member \
  -keyalg RSA -keysize 2048 -validity 10000
```

비밀번호와 별칭(`coms-member`)을 안전한 곳에 보관하세요. **키스토어 파일을 잃으면 같은 앱으로 업데이트 불가**.

#### (b) Gradle에 서명 정보 연결

`~/.gradle/gradle.properties`에 다음 추가 (로컬 머신에만, 절대 깃에 커밋 금지):

```
COMS_RELEASE_STORE_FILE=/Users/choi/.coms-release.keystore
COMS_RELEASE_STORE_PASSWORD=...
COMS_RELEASE_KEY_ALIAS=coms-member
COMS_RELEASE_KEY_PASSWORD=...
```

`android/app/build.gradle`의 `android { ... }` 블록 안에 추가:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('COMS_RELEASE_STORE_FILE')) {
            storeFile file(COMS_RELEASE_STORE_FILE)
            storePassword COMS_RELEASE_STORE_PASSWORD
            keyAlias COMS_RELEASE_KEY_ALIAS
            keyPassword COMS_RELEASE_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

#### (c) 빌드

```bash
npm run cap:sync
cd android
./gradlew assembleRelease
```

결과물:

```
android/app/build/outputs/apk/release/app-release.apk
```

이 APK는 동아리 사이트에 직접 올려도 되고, Play Store에 업로드해도 됩니다.

### 3) 회원용 설치 가이드 (앱 다운로드 후)

웹사이트 또는 카톡으로 APK 링크를 전달받은 회원이 따라할 순서:

1. 안드로이드 폰에서 APK 링크 탭 → 다운로드
2. 첫 설치 시 "출처를 알 수 없는 앱" 경고가 뜨면:
   - 설정 → 보안 → 출처를 알 수 없는 앱 → 사용 중인 브라우저(Chrome/Samsung Internet) → "이 출처 허용"
3. 다시 APK 탭 → 설치
4. 설치 완료 후 홈에서 **COMS Member** 아이콘 실행
5. 학번/이메일 + 비밀번호로 로그인

### 4) 업데이트 배포

- 새 버전 빌드 전 `package.json`의 `version` 값을 올려주세요. (예: `0.1.0` → `0.2.0`)
- 같은 키스토어로 서명된 새 APK를 사이트에 올리면 기존 사용자도 덮어쓰기 설치 가능
- `minimumSupportedVersion`을 서버 `/api/mobile/v1/app-config`에서 강제 업데이트하려는 버전 이하로 올리면 옛날 앱은 강제 업데이트 화면이 뜸

## 백엔드 호환 체크리스트

APK에서 API가 동작하려면 운영 서버가 다음을 만족해야 합니다.

- **CORS 허용 도메인에 Capacitor origin 포함**
  운영 `.env` 또는 docker-compose env에:

  ```
  cors.allowed-origins=https://coms.kw.ac.kr,http://localhost:5173,https://localhost,capacitor://localhost
  ```

  `https://localhost`, `capacitor://localhost`가 없으면 앱 첫 호출이 CORS로 막힙니다.

- **세션 쿠키 SameSite 정책**
  앱 origin(`https://localhost`)과 API origin(`coms.kw.ac.kr`)이 다르므로 쿠키는 `SameSite=None; Secure`로 발급돼야 앱 요청에 실립니다. Spring `application-prod.yml`:

  ```yaml
  server:
    servlet:
      session:
        cookie:
          same-site: none
          secure: true
  ```

- **푸시 토큰 등록 API 동작**
  `POST /api/mobile/v1/push-tokens`가 200을 반환해야 회원 기기가 푸시 받을 준비 완료.

## iOS

iOS 빌드는 Mac + Xcode + Apple Developer 계정($99/년)이 필요합니다.

```bash
npm run cap:ios
```

Xcode에서 서명/프로비저닝 후 TestFlight 또는 App Store Connect로 배포합니다.
