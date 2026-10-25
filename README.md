# 🍓 상큼 과일 아케이드 존 (Fruit Arcade)

과일 미니게임 6종에 레벨, 오늘의 미션, 업적, 랭킹, 친구 대결을 더한 웹 아케이드입니다. 밝은 테마와 다크 테마를 지원하고, 휴대폰 홈 화면에 앱으로 설치해 오프라인에서도 플레이할 수 있습니다.

| 게임 | 설명 | 조작 |
|---|---|---|
| 🍓 과일 메모리 | 같은 과일 카드 짝 맞추기. 4×4, 6×6, 8×8 타임어택, 8×8 조커 모드 | 클릭 · 터치, `H` 플래시 힌트, `C` 카드 힌트 |
| 🍉 수박 게임 | 같은 과일끼리 합쳐 수박 만들기 (물리 엔진 직접 구현, 120Hz 고정 틱이라 어느 기기에서나 똑같이 움직임). 🔨 망치(고른 과일 부수기) · 🫨 흔들기(병 섞기) 아이템: 한 판에 두 개씩, 합체 10번마다 하나 더(종류마다 5개까지, 운영진은 무한). 넘침 선 위 5초면 끝 | `←` `→` / `A` `D` 이동, `Space` · `↓` 낙하, `1` 망치(과일 톡 · `Space`), `2` 흔들기, 마우스 · 터치 |
| 🏃 FRUIT DASH | 떨어지는 과일 피하며 황금 별 모으기. 쉬움 · 보통 · 어려움, 방패 · 자석 · 느림 · 점수 2배 아이템 | `←` `→` / `A` `D`, 마우스 · 터치 |
| 🧩 과일 퍼즐 | 같은 과일 3개를 한 줄로 맞추는 매치-3. 클래식(이동 30번 · 랭킹)과 목표가 있는 스테이지 30개, 줄 폭탄 · 큰 폭탄, 연쇄 보너스 | 밀기 · 두 칸 차례로 누르기, 방향키로 이동 후 `Enter`로 고르고 방향키로 바꾸기 |
| 🔪 과일 자르기 | 날아오르는 과일을 그어서 자르기. 한 번에 3개 이상 콤보, ⭐ 황금 별, ❄️ 얼음(느린 시간), 💣 폭탄을 자르거나 과일을 3개 놓치면 끝 | 마우스를 누른 채 긋기 · 손가락으로 밀기 |
| 🎹 과일 피아노 | 내려오는 과일 타일을 아래부터 눌러 노래 연주하기. 저작권이 끝난 동요 · 캐럴 · 클래식 13곡, 한 곡을 완주할 때마다 빨라짐, 빈 칸을 누르거나 타일을 놓치면 끝 | 터치 · 클릭, `D` `F` `J` `K` |

공통: `ESC` 일시정지 · 창 닫기, `Space` · `Enter` 게임 시작

## 기능

- **로비:** 게임 카드(최고 기록 · 플레이 수), 내 레벨, 연속 출석, 오늘의 미션, 최근 플레이
- **레벨 & 경험치:** 플레이 1판 20 XP, 30초마다 5 XP, 업적 50 XP, 미션 도장 100 XP. 레벨은 🌱 새싹부터 🍉 수박 마스터까지
- **오늘의 미션:** 날짜마다 정해지는 미션 3개. 모두 깨면 도장 1개
- **연속 출석:** 매일 한 판씩 하면 🔥 연속 일수가 쌓여요. 3 · 7 · 30일 업적
- **연속 출석 알림:** 설정 → 알림에서 켜면(Google 로그인 필요), 그날 아직 안 했을 때 저녁 8시에 "오늘 한 판 해요!" 웹 푸시가 옵니다. 아이폰 · 아이패드는 홈 화면에 설치한 앱에서만 됩니다
- **관리자:** 관리자 화면(상단 방패 버튼)에서 오늘 플레이어 · 판 수 통계, 유저 관리(모든 유저 검색 · 필터 · 정렬, 실제 닉네임 · 친구 코드 · 최고 기록 · 마지막 접속 · 오늘 판 수, 차단 · 해제 · 랭킹 기록 삭제), 신고 · 의견 처리, 차단 관리. 랭킹 창에서도 기록 삭제 · 차단. 설정 → 운영진 → **QA 모드**를 켜면 일반 사용자처럼 테스트합니다(코인 · 수박 아이템 무한, 운영진 물건, 관리자 버튼이 꺼지고 로비에 🧪 QA 표시. 닉네임과 서버의 관리자 권한은 그대로)
- **신고 · 의견:** 랭킹의 깃발 버튼으로 기록 신고, "의견 보내기"로 버그 · 아이디어 제보(Google 로그인 필요)
- **칭호 · 명예의 전당:** 업적마다 칭호를 달 수 있고(이름 옆 · 랭킹에 표시), 상점에서 칭호를 살 수도 있습니다. 지난주 게임별 1등은 왕관과 "주간 챔피언" 칭호. 랭킹의 명예의 전당 탭에서 최근 8주 1등을 봅니다
- **코인 · 상점:** 코인은 최대 999억 9,999만 9,999개([`coins.ts`](src/utils/coins.ts)의 `COIN_MAX`)이고 큰 숫자는 "12.3억"처럼 짧게 보입니다. 판마다 코인(점수 보너스 · 신기록 · 오늘 첫 판 · 미션 도장 보너스)을 모아 프로필 테두리(27), 아바타(41), 칭호(27), 메모리 카드 뒷면(18), 과일 자르기 칼날(10), FRUIT DASH 러너(10), 과일 스킨(4, 수박 게임 · 과일 자르기 · FRUIT DASH · 과일 퍼즐에 적용, [`skins.ts`](src/utils/skins.ts)), 모두 137개를 삽니다. 로그인하면 다른 기기에서도 그대로
- **친구 · 코인 선물:** 로그인하면 공개 프로필과 8자리 친구 코드가 생깁니다. 코드나 랭킹에서 이름을 눌러 친구 요청 → 수락. 친구에게 코인을 하루 5번, 한 번에 300코인까지 보낼 수 있고(관리자는 하루 20번, 999억 9,999만 9,999코인까지 · 코인이 줄지 않음), 받는 사람이 선물함에서 받습니다. 친구 목록 · 프로필에 온라인 여부와 마지막 접속 시간이 보입니다(`presence/{uid}`, 앱이 앞에 있는 동안 1분마다 기록 · 친구와 운영진만 읽음 · 설정 → 친구에서 끄면 기록을 지움)
- **은율이의 다른 앱:** 로비 아래 "은율이의 다른 앱 보기"([`AppsModal.tsx`](src/components/Modals/AppsModal.tsx))에서 계란이의 모험 · 논리 미궁 · SchoolFix로 이동합니다
- **이모지 그림:** 과일 · 게임 이모지는 [`public/emoji`](public/emoji)의 그림(Microsoft Fluent Emoji, MIT, [`LICENSE.txt`](public/emoji/LICENSE.txt))으로 그려서 휴대폰에서도 PC와 같게 보입니다. 새 이모지를 쓰려면 그 폴더에 `<코드포인트>.svg`를 넣고 [`emoji.ts`](src/utils/emoji.ts) 목록에 더하세요
- **약관:** 로비 아래 "약관 · 개인정보"와 설정에서 이용약관 · 개인정보 처리방침([`TermsModal.tsx`](src/components/Modals/TermsModal.tsx))을 봅니다. 데이터 처리가 바뀌면 이 글과 패치노트를 함께 고치세요
- **운영진 시리즈:** `staff_`로 시작하는 칭호 · 아바타 · 테두리 · 카드 뒷면 · 칼날 · 러너 · 수박 스킨(38개)은 관리자 계정만 씁니다(관리자는 처음부터 다 갖고, 코인이 무한이라 상점 물건도 무엇이든 받고, 업적도 모두 달성한 상태가 됩니다). 운영진 칭호는 랭킹에 파란 배지로 보이고, 다른 사람의 랭킹 기록에는 규칙이 막습니다
- **기록 그래프:** 내 기록에서 최근 7일 판 수 · 플레이 시간 · 게임별 최고 점수(이 기기 기준)
- **점수 검증:** 로그인한 플레이어의 점수는 Render 서버([`server/`](server))가 확인하고 서명한 뒤 랭킹에 올라갑니다. 과일 퍼즐은 시드와 둔 수로 점수를 그대로 다시 계산하고, 실시간 게임은 판 시작 때 받은 티켓으로 실제 걸린 시간을 재서 시간 대비 점수가 게임의 이론상 최대를 넘지 않는지 봅니다
- **랭킹:** 게임별 오늘 · 이번 주 · 전체 순위. Google 로그인하면 판이 끝날 때 최고 점수가 자동으로 올라가고, 결과 화면에 "오늘 3위 · 전체 23위"가 보입니다. 순위표에는 닉네임과 아바타만 공개됩니다(기본 아바타면 Google 프로필 사진). 욕설 · 성적인 말이 든 닉네임은 정할 수 없고, 남의 이름에 있으면 *로 가려 보입니다([`badWords.ts`](src/utils/badWords.ts))
- **친구 대결:** 결과를 공유하면 같은 판(같은 시드)으로 도전할 수 있는 링크가 붙습니다. 링크를 연 친구가 점수를 넘으면 "도전 성공!"
- **결과 화면:** 신기록, 얻은 경험치, 완료한 미션, 순위, 결과 이미지 저장 · 공유(공유 시트 또는 클립보드)
- **프로필 꾸미기:** 로그인하지 않아도 닉네임과 과일 아바타를 정할 수 있습니다
- **사운드:** 게임마다 다른 배경음악과 효과음(Web Audio로 직접 합성). 배경음악 · 효과음 볼륨 따로 조절
- **앱 설치 & 오프라인:** PWA. 홈 화면에 설치할 수 있고, 한 번 열어 두면 인터넷 없이도 게임이 됩니다(로그인 · 랭킹 제외)
- **첫 방문 안내:** 게임을 처음 열면 짧은 방법 안내. 시작 화면의 ? 버튼으로 다시 볼 수 있습니다
- **설정:** 라이트 · 다크 · 시스템 테마, 효과음 · 배경음악 볼륨, 연출, 휴대폰 진동, 고대비 카드, 카드 크기, 앱 설치, 데이터 초기화
- 운영체제의 "동작 줄이기" 설정을 따르고, 키보드만으로도 모든 메뉴를 쓸 수 있습니다

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # dist/ 에 빌드
npm start        # dist/ 를 서빙 (PORT, 기본 3000)
npm run lint     # 타입 검사
npm test         # 자동 테스트 (tests/: 수박 물리, 점수 서버 검사, 상점 · 스킨 · 그림 목록, 업적 수)
npm run test:rules  # Firestore 규칙 테스트 (scripts/rules-test/, 규칙 :test API · 배포 안 함 · Firebase CLI 로그인 필요)
```

GitHub Pages 배포는 `npm run lint`와 `npm test`가 통과해야 진행됩니다. 규칙(`firestore.rules`)을 바꾸면 배포 전에 `npm run test:rules`를 돌려 주세요.

## 배포

`main`에 push하면 두 곳에 자동으로 올라갑니다.

- **Render** 웹 서비스: https://fruitarcade.onrender.com
  - Build Command `npm ci`(기본값 `npm install`도 됨), Start Command `npm start`
  - Render에서는 설치가 끝나면 `postinstall`이 자동으로 빌드하고(`RENDER` 환경 변수가 있을 때만), `npm start`가 [`server.mjs`](server.mjs)로 `dist/`를 서빙합니다(압축, 캐시 헤더 포함).
  - 같은 서버가 점수 검증 API(`/api/round`, `/api/score`, `/api/health`)도 맡습니다. GitHub Pages에서 하는 플레이도 이 서버로 점수를 확인받으므로 **웹 서비스**여야 합니다(Static Site 불가).
  - 환경 변수 **`SCORE_SECRET`**(32자 이상)이 있어야 점수 검증이 켜집니다. Firestore `config/scoreKey` 문서의 `secret`과 같은 값이어야 하고, `/api/health`의 `key`(비밀 값 SHA-256 앞 8자리)로 맞는지 확인할 수 있습니다.
  - 무료 인스턴스는 한동안 접속이 없으면 잠들어서 첫 접속에 50초 정도 걸릴 수 있습니다. 앱은 로그인할 때 서버를 미리 깨우고, 점수 확인은 최대 90초까지 기다립니다.
- **GitHub Pages**: https://eunyool10.github.io/FruitArcade/ (GitHub Actions [`deploy.yml`](.github/workflows/deploy.yml)가 타입 검사와 빌드 후 배포)
- **연속 출석 알림**은 GitHub Actions [`reminders.yml`](.github/workflows/reminders.yml)이 매일 11:00 UTC(한국 20:00)에 [`scripts/reminders/send.mjs`](scripts/reminders/send.mjs)를 돌려 보냅니다. 저장소 Secrets에 `VAPID_PRIVATE_KEY`(웹 푸시 서명 키)와 `PUSH_BOX_KEY`(구독 정보 봉인을 여는 RSA 키)가 있어야 합니다. Actions 탭에서 손으로 돌리면 기본은 보내지 않고 대상만 세는 연습 실행입니다.
  - 공개 저장소의 예약 실행은 저장소에 60일 동안 활동이 없으면 GitHub가 멈춥니다. 그때는 Actions 탭에서 다시 켜세요.
  - 키를 바꾸려면 새 VAPID 키와 RSA 키를 만들어 공개 키를 [`src/utils/reminders.ts`](src/utils/reminders.ts)와 `send.mjs`에, 비밀 키를 Secrets에 넣으세요. 앱이 다음에 열릴 때 새 키로 다시 구독하고 다시 봉인합니다.
- Google 로그인을 쓰려면 Firebase 콘솔 → Authentication → 설정 → **승인된 도메인**에 `fruitarcade.onrender.com`과 `eunyool10.github.io`가 있어야 합니다.
- 보안 규칙([`firestore.rules`](firestore.rules))은 자동 배포되지 않습니다. 바꾼 뒤에는 Firebase 콘솔 → Firestore → 데이터베이스 `ai-studio-9fb7cc09-…` → **규칙** 탭에 붙여 넣고 게시하거나, Firebase CLI로 배포하세요. 규칙을 게시하기 전에는 랭킹 창에 "준비하고 있어요"가 표시됩니다.

### 로컬에서 Firebase 에뮬레이터로 테스트

```bash
firebase emulators:start --only firestore,auth --project ambient-post-1kpr3   # firebase.json에 firestore 8085, auth 9099
VITE_FIREBASE_EMULATOR=1 npm run dev
```

이 환경 변수가 있을 때만 에뮬레이터에 연결하고, 브라우저 콘솔에서 `__emulatorSignIn('uid', '이름')`으로 가짜 Google 계정 로그인을 할 수 있습니다. 실제 빌드에는 포함되지 않습니다.

점수 검증까지 함께 시험하려면 서버를 에뮬레이터 모드로 띄우고(에뮬레이터 토큰은 서명이 없어서 이 모드에서만 받습니다) 앱이 그 서버를 쓰게 합니다. 에뮬레이터의 `config/scoreKey`에도 같은 `secret`을 넣어 두세요.

```bash
npm run build
SCORE_SECRET=<32자 이상> SCORE_EMULATOR=1 PORT=8787 npm start
VITE_FIREBASE_EMULATOR=1 VITE_SCORE_API=http://localhost:8787 npm run dev
```

## 기술 스택

- React 19 + TypeScript, Vite 6, Tailwind CSS 4, motion
- Firebase Auth (Google 로그인) + Firestore (클라우드 저장, 랭킹)
- 서비스 워커 직접 작성 (`pwa/sw.js`, 빌드할 때 `vite.config.ts`가 캐시 목록을 채움)
- 폰트: Fredoka · Jua (제목, 버튼), Pretendard (본문)

## 구조

```
src/
  App.tsx                화면 전환, 창, 테마, 로그인 동기화, 게임 결과 → 보상 계산
  constants.ts           앱 버전, 게임 정보(GAMES), 색 톤(TONE)
  types.ts               공용 타입
  index.css              디자인 토큰(라이트/다크), 버튼 · 패널 등 공용 스타일
  components/
    Navbar.tsx           화면에 따라 바뀌는 상단 바
    lobby/               로비 (플레이어 카드, 게임 카드, 미션, 최근 플레이)
    game/                게임 공용 레이아웃, HUD, 시작 카드, 결과 카드, 첫 방문 안내
    MemoryGame/          메모리 게임 (설정, 보드)
    SuikaGame/           수박 게임
    FruitDashGame/       FRUIT DASH
    PuzzleGame/          과일 퍼즐 (engine.ts: 판 생성 · 매치 · 폭탄 · 연쇄, 화면과 분리)
    FruitSliceGame/      과일 자르기
    PianoGame/           과일 피아노 (songs.ts: 곡 악보, sound.ts: 피아노 소리)
    Modals/              프로필 · 업적 · 기록 · 랭킹 · 설정 · 패치노트 · 크레딧 · 일시정지 · 도전장
    ui/                  모달, 스위치, 선택 버튼, 진행 막대, 확인 버튼, 토스트
    PlayerContext · ChallengeContext · RankContext   결과 카드 등에서 쓰는 플레이어 · 대결 · 순위 정보
  utils/
    progress.ts          통계, 경험치 · 레벨, 최근 플레이, 연속 출석 (localStorage)
    missions.ts          오늘의 미션 선택과 진행
    achievements.ts      업적 정의와 해금, 로컬/클라우드 병합
    userDataService.ts   Firestore 내 데이터 읽기/쓰기 (로그인 후에만 로드)
    ranking.ts           랭킹 보드 id(한국 시간 기준 일 · 주), 공개 이름
    leaderboardService.ts  랭킹 점수 등록 · 순위 · 목록 (Firestore)
    challenge.ts · rng.ts  친구 대결 링크(#c=…)와 시드 난수
    audio.ts · music.ts  효과음, 배경음악 시퀀서
    scoreServer.ts      점수 서버(티켓 · 서명) 호출
    reminders.ts · reminderState.ts  연속 출석 알림: 웹 푸시 구독, 봉인해서 Firestore에 저장 · 이 기기의 켜짐 상태
    pwa.ts · haptics.ts · profile.ts · shareImage.ts · fx.ts · format.ts
pwa/sw.js                서비스 워커 템플릿 (오프라인 캐시, 알림 표시)
scripts/reminders/       연속 출석 알림 발송기 (GitHub Actions에서 실행)
server.mjs               npm start용 정적 서버 + /api/ (Render)
server/
  api.mjs                점수 API: Google 로그인 토큰 확인, 판 티켓, 서명, 요청 제한
  verify.ts              판 검사 (퍼즐 다시 계산, 시간 대비 점수). npm run build가 dist-server/로 빌드
```

## 데이터 저장

- **로그인 안 함:** 설정, 업적, 통계, 최근 플레이, 미션 진행을 브라우저 `localStorage`에 저장합니다.
- **Google 로그인:** Firestore `users/{uid}` 문서 하나에 프로필, 통계, 업적, 설정을 저장합니다.
  - 로그인하면 이 기기의 기록과 클라우드 기록을 합칩니다(항목마다 큰 값).
  - 게임 결과는 트랜잭션으로 저장해서, 여러 기기에서 동시에 해도 기록이 덮어써지지 않습니다.
  - 로그아웃하면 다른 계정과 섞이지 않도록 이 기기의 기록을 비웁니다. 다시 로그인하면 복원됩니다.
- 최근 플레이 목록과 미션 진행은 기기에만 저장합니다.
- **랭킹:** `leaderboards/{게임}_{기간}/scores/{uid}` 문서에 닉네임, 아바타, 점수(그리고 단 칭호 id)만 저장합니다. 기간은 `all`, `d<일 번호>`, `w<주 번호>`(한국 시간 자정 · 월요일 기준).
- 접근 규칙은 [`firestore.rules`](firestore.rules)에 있습니다.
  - `users/{uid}`: 본인만 읽고 쓸 수 있습니다(이메일이 들어 있음). 정해진 필드(profile · statistics · achievements · settings · inventory · stages)만 크기 제한 안에서 쓸 수 있고, uid · 이메일 · 가입일은 바꿀 수 없습니다. 코인은 statistics의 coinsEarned · coinsSpent(둘 다 늘기만 해서 기기끼리 큰 값으로 합침), 산 물건은 inventory에 있습니다.
  - 랭킹: 누구나 읽을 수 있고, Google 로그인 사용자가 자기 칸에만 쓸 수 있습니다. `staff_`로 시작하는 칭호 · 테두리는 관리자 기록에만 달 수 있습니다. 점수는 정수, 게임별 상한 이하, 올라갈 때만(3초에 한 번까지) 바뀌고(점수가 같으면 닉네임 · 아바타 · 칭호 · 테두리만 바꿀 수 있음), 오늘 · 어제 · 이번 주 · 지난주 · 전체 보드에만 쓸 수 있습니다. 운영진처럼 보이는 이름(Tester, QA, 관리자 …)과 차단된 계정은 올라가지 않습니다.
  - 연속 출석 알림(`push/{uid}~{기기}`): 브라우저의 푸시 구독, 마지막으로 한 날, 연속 일수를 발송기의 공개 키로 봉인(RSA-OAEP + AES-GCM)해서 저장합니다. 발송기(GitHub Actions)는 로그인이 없어서 이 컬렉션은 누구나 읽을 수 있지만, 봉인을 열 수 있는 건 발송기뿐입니다. 쓰기는 본인만, 40일 넘게 갱신되지 않은 문서는 발송기가 지웁니다. 알림을 끄거나 로그아웃하면 문서가 지워집니다.
  - 친구: `players/{uid}`(공개 프로필, 로그인한 사람이 한 명씩만 조회 · 목록 불가), `friendCodes/{code}`(코드 → uid, 처음 한 번만 등록), `friendships/{작은uid_큰uid}`(요청 → 상대가 수락, 두 사람만 읽음), `gifts/{보낸uid_날짜_n}`(친구에게만, 하루 n개 제한, 보낸 사람의 coinsSpent가 같은 쓰기에서 금액만큼 늘어야 함, 받는 사람이 한 번만 claimed). 선물 기록 정렬용 복합 색인은 [`firestore.indexes.json`](firestore.indexes.json)에 있습니다.
  - 신고(`reports`)는 한 사람이 같은 기록을 한 번만, 의견(`feedback`)은 5분에 한 번 보낼 수 있고 관리자만 읽습니다. `activity/{날짜}/players/{uid}`에는 로그인한 플레이어의 하루 판 수 · 플레이 시간만 쌓여 관리자 통계에 쓰입니다.
  - 관리자: Firestore `config/admins` 문서의 `emails` 배열에 있는 Google 계정(이메일 인증된 계정만)입니다. 랭킹 창의 방패 버튼으로 기록을 지우거나 계정을 차단(`bans/{uid}`)하고 풀 수 있습니다. 관리자를 추가 · 삭제하려면 Firebase 콘솔에서 이 배열을 고치세요(앱에서는 못 바꿉니다).
  - 점수 서명: 랭킹 기록에는 점수 서버가 만든 `proof`(SHA-256 "<secret>|<uid>|<게임>|<점수>|<한국 날짜>|<secret>")가 붙습니다. 규칙이 `config/scoreKey`(클라이언트는 못 읽음)의 secret으로 같은 값을 계산해 맞는지 봅니다. `enforce`가 `true`면 서명 없는 점수는 올라가지 않고, `false`면 서명 없이도 받습니다(서명이 붙어 있으면 언제나 맞아야 함). 2026-10-20부터 `enforce: true`(켜져 있음)입니다. 끄면 누구나 Firestore에 직접 아무 점수나 쓸 수 있으니 점수 서버를 바꿀 때만 잠깐 끄세요.
  - 실시간 게임(메모리 · 수박 · 대시 · 자르기)은 다시 계산할 수 없어서, 서버는 걸린 시간 대비 점수가 이론상 최대를 넘는지까지만 봅니다. 그 안에서 꾸민 점수는 막지 못하므로 이상한 기록은 관리자가 지우고 차단하세요.

## 새 게임 추가하기

1. `types.ts`의 `ScreenType`, `GameType`, `UserStatistics`(`<게임>PlayCount`, `<게임>HighScore`)에 추가하고 `progress.ts`의 `GAME_TYPES`, `EMPTY_STATS`도 채우기
2. `constants.ts`의 `GAMES`, `GAME_ORDER`, `SCREEN_GAME`, `PLAY_SCREENS`에 추가
3. `components/<게임>/`에 컴포넌트 작성. `game/GameFrame`, `StartCard`, `ResultCard`를 쓰고, props로 `settings`, `isPaused`, `onUnlockAchieve`, `onGameComplete`, `onRoundChange`, `onExit`를 받기
   - 판이 시작되면 `onRoundChange(true)`, 끝나면 `false`
   - 판이 끝나면 `onGameComplete({ game, score, seconds })`를 **한 번** 호출하고, 돌려받은 보상을 `ResultCard`에 넘기기
4. `App.tsx`에 lazy import와 화면 분기. `missions.ts`(미션), `challenge.ts`(대결 링크), `shop.ts`(코인 비율), `music.ts`(배경음악), `achievements.ts`와 업적 창 탭도 채우기
5. 랭킹: `firestore.rules`의 `isValidBoardId` 정규식과 `maxScore`에 게임 추가 후 규칙 게시
