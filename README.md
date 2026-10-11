# 🍓 상큼 과일 아케이드 존 (Fruit Arcade)

과일 미니게임 3종에 레벨, 오늘의 미션, 업적을 더한 웹 아케이드입니다. 밝은 테마와 다크 테마를 지원하고, 휴대폰에서도 플레이할 수 있습니다.

| 게임 | 설명 | 조작 |
|---|---|---|
| 🍓 과일 메모리 | 같은 과일 카드 짝 맞추기. 4×4, 6×6, 8×8 타임어택, 8×8 조커 모드 | 클릭 · 터치, `H` 플래시 힌트, `C` 카드 힌트 |
| 🍉 수박 게임 | 같은 과일끼리 합쳐 수박 만들기 (물리 엔진 직접 구현) | `←` `→` / `A` `D` 이동, `Space` · `↓` 낙하, 마우스 · 터치 |
| 🏃 FRUIT DASH | 떨어지는 과일 피하며 황금 별 모으기 | `←` `→` / `A` `D`, 마우스 · 터치 |

공통: `ESC` 일시정지 · 창 닫기, `Space` · `Enter` 게임 시작

## 기능

- **로비:** 게임 카드(최고 기록 · 플레이 수), 내 레벨, 오늘의 미션, 최근 플레이
- **레벨 & 경험치:** 플레이 1판 20 XP, 30초마다 5 XP, 업적 50 XP, 미션 도장 100 XP. 레벨은 🌱 새싹부터 🍉 수박 마스터까지
- **오늘의 미션:** 날짜마다 정해지는 미션 3개. 모두 깨면 도장 1개
- **결과 화면:** 신기록 표시, 얻은 경험치, 완료한 미션, 결과 공유(공유 시트 또는 클립보드)
- **설정:** 라이트 · 다크 · 시스템 테마, 효과음 · 볼륨, 연출, 고대비 카드, 카드 크기, 데이터 초기화
- 운영체제의 "동작 줄이기" 설정을 따르고, 키보드만으로도 모든 메뉴를 쓸 수 있습니다

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # dist/ 에 빌드
npm run lint     # 타입 검사
```

## 배포

`main`에 push하면 GitHub Actions([`deploy.yml`](.github/workflows/deploy.yml))가 타입 검사와 빌드를 한 뒤 GitHub Pages에 올립니다.

- 주소: https://eunyool10.github.io/FruitArcade/
- Google 로그인을 쓰려면 Firebase 콘솔 → Authentication → 설정 → **승인된 도메인**에 `eunyool10.github.io`가 있어야 합니다.

## 기술 스택

- React 19 + TypeScript, Vite 6, Tailwind CSS 4, motion
- Firebase Auth (Google 로그인) + Firestore (클라우드 저장)
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
    game/                게임 공용 레이아웃, HUD, 시작 카드, 결과 카드
    MemoryGame/          메모리 게임 (설정, 보드)
    SuikaGame/           수박 게임
    FruitDashGame/       FRUIT DASH
    Modals/              프로필 · 업적 · 기록 · 설정 · 패치노트 · 크레딧 · 일시정지
    ui/                  모달, 스위치, 선택 버튼, 진행 막대, 확인 버튼, 토스트
  utils/
    progress.ts          통계, 경험치 · 레벨, 최근 플레이 (localStorage)
    missions.ts          오늘의 미션 선택과 진행
    achievements.ts      업적 정의와 해금, 로컬/클라우드 병합
    userDataService.ts   Firestore 읽기/쓰기
    audio.ts · fx.ts · format.ts
```

## 데이터 저장

- **로그인 안 함:** 설정, 업적, 통계, 최근 플레이, 미션 진행을 브라우저 `localStorage`에 저장합니다.
- **Google 로그인:** Firestore `users/{uid}` 문서 하나에 프로필, 통계, 업적, 설정을 저장합니다.
  - 로그인하면 이 기기의 기록과 클라우드 기록을 합칩니다(항목마다 큰 값).
  - 게임 결과는 트랜잭션으로 저장해서, 여러 기기에서 동시에 해도 기록이 덮어써지지 않습니다.
  - 로그아웃하면 다른 계정과 섞이지 않도록 이 기기의 기록을 비웁니다. 다시 로그인하면 복원됩니다.
- 최근 플레이 목록과 미션 진행은 기기에만 저장합니다.
- 접근 규칙은 [`firestore.rules`](firestore.rules)에 있으며, 본인 문서만 읽고 쓸 수 있습니다.

## 새 게임 추가하기

1. `types.ts`의 `ScreenType`, `GameType`, `UserStatistics`(`<게임>PlayCount`, `<게임>HighScore`)에 추가하고 `progress.ts`의 `EMPTY_STATS`도 채우기
2. `constants.ts`의 `GAMES`, `GAME_ORDER`, `SCREEN_GAME`, `PLAY_SCREENS`에 추가
3. `components/<게임>/`에 컴포넌트 작성. `game/GameFrame`, `StartCard`, `ResultCard`를 쓰고, props로 `settings`, `isPaused`, `onUnlockAchieve`, `onGameComplete`, `onRoundChange`, `onExit`를 받기
   - 판이 시작되면 `onRoundChange(true)`, 끝나면 `false`
   - 판이 끝나면 `onGameComplete({ game, score, seconds })`를 **한 번** 호출하고, 돌려받은 보상을 `ResultCard`에 넘기기
4. `App.tsx`에 lazy import와 화면 분기, 필요하면 `missions.ts`에 미션 추가
