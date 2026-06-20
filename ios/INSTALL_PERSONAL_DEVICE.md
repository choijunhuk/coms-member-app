# COMS Member iOS 직접 설치 가이드

무료 Apple ID로 본인 iPhone 또는 iPad에 COMS Member App을 설치하는 절차입니다.

## 준비물

- macOS가 설치된 Mac
- Xcode 16 이상
- Node.js 22 이상
- npm
- Apple ID
- USB 또는 Wi-Fi로 연결 가능한 iPhone/iPad

## 1. 소스 받기

```sh
git clone https://github.com/choijunhuk/coms-member-app.git
cd coms-member-app
```

이미 저장소가 있으면 최신 상태만 당겨옵니다.

```sh
git pull
```

## 2. 웹 번들 및 Capacitor 동기화

```sh
npm install
npm run cap:sync
```

`npm run cap:sync`는 `dist/` 웹 번들을 만들고 Android/iOS 네이티브 프로젝트에 복사합니다. 앱 API 기본값은 `https://coms.kw.ac.kr/api`입니다.

## 3. Xcode 열기

```sh
npm run cap:ios
```

또는 직접 열 수 있습니다.

```sh
open ios/App/App.xcodeproj
```

이 저장소는 Capacitor iOS 프로젝트가 이미 포함되어 있습니다. Rusty Alarm처럼 `xcodegen generate`를 실행하지 않습니다.

## 4. 서명 설정

Xcode에서:

1. 좌측 프로젝트 탐색기에서 `App` 선택
2. `TARGETS`의 `App` 선택
3. `Signing & Capabilities` 탭 열기
4. `Automatically manage signing` 체크
5. `Team`에서 본인 Apple ID의 `Personal Team` 선택
6. Bundle Identifier가 충돌하면 `kr.ac.kw.coms.memberapp.<본인이름>`처럼 임시로 바꿔서 실행

공식 배포를 하려면 Bundle Identifier는 `kr.ac.kw.coms.memberapp`로 유지하고 Apple Developer Program 팀에서 서명해야 합니다.

## 5. iPhone/iPad 실행

1. iPhone/iPad를 Mac에 연결
2. iPhone에서 "이 컴퓨터를 신뢰" 선택
3. Xcode 좌측 상단 디바이스 드롭다운에서 본인 기기 선택
4. Run 버튼 또는 `Cmd+R`

처음 실행이 막히면 iPhone에서:

1. 설정
2. 일반
3. VPN 및 기기 관리
4. 본인 Apple ID 개발자 앱 선택
5. 신뢰

## 6. 7일 재서명

무료 Apple ID로 설치한 앱은 보통 7일 뒤 실행이 막힙니다. 다시 설치하려면 같은 Mac에서 Xcode를 열고 `Cmd+R`로 재실행하면 됩니다.

여러 회원에게 안정적으로 배포하려면 무료 ID가 아니라 Apple Developer Program + TestFlight를 사용해야 합니다.

## 푸시 알림 한계

iOS 푸시는 단순 빌드만으로 끝나지 않습니다.

- 실제 기기 필요
- Apple Developer Program의 Push Notifications capability 필요
- APNs 키/인증서 필요
- 서버의 `POST /api/mobile/v1/push-tokens` 동작 필요
- 앱의 `GoogleService-Info.plist` 또는 APNs/FCM 설정 필요

현재 앱은 Capacitor Push Notifications 콜백을 iOS `AppDelegate.swift`에 연결해 둔 상태입니다. 실제 토큰 발급은 위 조건을 충족한 기기에서 확인해야 합니다.

## 자주 막히는 지점

### No Team

Xcode 설정에서 Apple ID 로그인이 안 된 상태입니다.

- Xcode - Settings - Accounts
- Apple ID 추가
- 다시 `Signing & Capabilities`에서 Team 선택

### Bundle Identifier 충돌

무료 Personal Team에서 이미 같은 Bundle Identifier를 누가 쓰고 있으면 빌드가 막힐 수 있습니다.

개인 테스트만 할 때는 `kr.ac.kw.coms.memberapp.<이름>`처럼 바꿔도 됩니다. 공식 배포 전에는 원래 값으로 돌려야 합니다.

### 앱 실행 후 API 실패

앱은 `https://coms.kw.ac.kr/api`를 호출합니다. 서버가 세션 쿠키와 Capacitor origin을 허용해야 로그인/세션 유지가 됩니다.

필요한 서버 조건은 루트 [`README.md`](../README.md)의 "서버 호환 조건"을 확인하세요.
