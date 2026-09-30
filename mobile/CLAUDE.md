# mobile/CLAUDE.md — weave 앱 (React Native + Expo)

> 루트 `CLAUDE.md`의 전역 규칙·보안 규칙을 먼저 따른다. 이 파일은 앱 전용 규칙이다.
> **주 타깃은 Android.** iOS는 나중에 추가한다.

## 0. Expo는 버전마다 바뀐다 — 기억을 믿지 말 것

Expo는 SDK마다 API가 이름이 바뀌거나 사라진다. Expo·EAS·React Native API를 건드리기 전에:
1. `package.json`의 `expo` 메이저 버전을 확인한다(현재 **57**).
2. 해당 버전 문서를 읽는다: `https://docs.expo.dev/versions/v57.0.0/`
3. 그 밖의 것은 `https://docs.expo.dev/llms.txt`(LLM이 자주 틀리는 부분 정정 포함)에서 해당 페이지를 찾아 읽는다.

실제로 부딪힌 변경: TypeScript 6은 `@types/*`를 자동으로 읽지 않는다(`tsconfig.json`의 `types`에 명시) · RN 0.86의 `ColorSchemeName`은 `'light' | 'dark' | 'unspecified'`(null 없음) · RNTL 14는 `render`와 **`fireEvent`도 async**(`await render(...)`, `await fireEvent.press(...)`), 테스트에서 Alert 버튼 콜백처럼 이벤트 밖의 상태 변경은 `await act(async () => ...)`로 감싼다.

## 1. 기술 스택 (Expo SDK 57 기준)

> ⚠ **React Native 관련 패키지는 개별 최신 버전을 고르지 않는다.** SDK가 호환 조합을 고정한다 — 네이티브 패키지는 반드시 `npx expo install`로(§2-8).

| 패키지 | 버전 | 역할 |
|---|---|---|
| Node.js | 24 LTS (`.nvmrc`) | 개발 도구 런타임 |
| Expo SDK / React Native / React | 57 / 0.86.3 / 19.2.3 | SDK가 고정 |
| TypeScript | 6.0.3 (정확히 고정) | 7.0은 lint 파서가 미지원 — 올리지 않는다 |
| Expo Router | 57.0.x | `src/app/` 폴더 구조 = 화면 구조 |
| react-native-safe-area-context | 5.7.x | 공통 `Screen`에서 처리 |
| expo-dev-client | 57.0.x | 개발 빌드(§2-13) |
| @expo/vector-icons (+ expo-asset) | 15.x (+ 57.0.x) | 아이콘. **expo-asset이 없으면 앱·테스트 모두 실행 중에 깨진다**(expo-font가 필요로 함) |
| Zod | 4.x | 폼 입력 검증 (`src/lib/validation.ts`) |
| react-native-android-widget | 0.22.x | Android 홈 화면 위젯(config plugin). 공식 예제는 SDK 55 기준 — SDK 57 실기기 동작은 확인 전 |
| Jest + jest-expo | 29.7 + 57.0.x | jest-expo 57은 Jest 29 기반 — 30으로 올리지 않는다 |
| @testing-library/react-native | 14.x | 역할·이름으로 요소를 찾는다 |
| ESLint + eslint-config-expo | 9.x + 57.0.x | `expo lint`가 설치한 조합(flat config) |

**필요해질 때 추가**(모두 `npx expo install`): TanStack Query · Zustand · Axios · `@react-native-community/netinfo` · `expo-secure-store` · `expo-auth-session` · `@shopify/flash-list` · `@expo/vector-icons` · Maestro(E2E, CLI 별도 설치). 추가 절차는 `../.claude/rules/native-modules.md`.

## 2. 필수 규칙

1. **색상·간격·글자 크기·글꼴 단일 소스** — `src/theme/`(`colors` · `spacing`/`radius` · `typography`)에서만. 컴포넌트에 `#fff`·`fontSize: 13`을 직접 쓰지 않는다. **밝은 테마만 쓴다(다크 모드 미지원)** — `useColorScheme()`으로 분기하지 않는다. 글꼴은 Pretendard(`assets/fonts`, OFL) — 굵기는 `fontWeight`가 아니라 `typography`의 `fontFamily`로 고른다(Android).
2. **공통 컴포넌트로만 UI 제작** — `Screen` · `AppText`(+ 필요 시 `Button` · `TextField` · `ListItem` 추가). 화면에서 RN 기본 `<Text>`/`<Pressable>`/`<TextInput>`을 새로 스타일링하지 않는다.
3. **API는 도메인 클라이언트로만** — 컴포넌트에서 `axios`/`fetch` 직접 호출 금지. `src/api/<domain>.ts` → `src/queries/<domain>.ts`(TanStack Query 훅). 토큰 첨부·갱신은 인터셉터 전담.
4. **서버 상태 ≠ 클라이언트 상태** — 서버 데이터는 Query 캐시, Zustand엔 UI 상태만.
5. **외부 입력은 경계에서 Zod로 검증** — 폼 입력과 API 응답 파싱 지점.
6. **모든 화면은 4가지 상태: 로딩 · 에러(다시 시도) · 빈 목록 · 오프라인** — `onlineManager`↔NetInfo, `focusManager`↔`AppState` 연결.
7. **긴 목록은 `FlashList`/`FlatList`로** — `ScrollView` + `map` 금지. 서버 페이지네이션 + 무한 스크롤.
8. **네이티브 패키지는 `npx expo install`로만** — 설치 후 `npx expo-doctor`. 네이티브 코드가 있으면 개발 빌드 재생성.
9. **플랫폼 분기는 공통 컴포넌트 안에만** — `Platform.OS` 분기를 화면에 흩뿌리지 않는다.
10. **기기 권한은 쓰는 순간에 요청하고 거부를 처리** — 권한 설명 문구는 `app.config.ts`(config plugin)에 반드시 넣는다.
11. **로컬 API 주소는 `EXPO_PUBLIC_API_URL`로 주입** — 이 프로젝트는 **폰 테스트를 USB 케이블로만 한다(Wi-Fi·LAN IP 사용 안 함)**. 폰·에뮬레이터 모두 `adb reverse tcp:8080 tcp:8080`(API), `adb reverse tcp:8081 tcp:8081`(개발 서버) 후 `http://localhost:<포트>`로 접속한다. 케이블을 다시 꽂으면 `adb reverse`를 다시 실행한다. HTTP는 개발 중에만.
12. **한 개념을 두 곳에 등록하는 구조는 문서화** — 예: 탭 화면(`src/app/(tabs)/`)과 탭 설정(`(tabs)/_layout.tsx`).
13. **개발 빌드를 기본으로, Expo Go는 화면 확인용** — 소셜 로그인·푸시 등 네이티브 기능은 `npx expo run:android`로 만든 개발 빌드에서 확인.
14. **`ios/`·`android/` 폴더는 직접 고치지 않는다** — `app.config.ts`에서 생성되는 폴더다(`.gitignore`됨). 네이티브 설정은 `app.config.ts`와 config plugin으로만.
15. **`src/app/` 안에는 라우트 파일만 둔다 — 테스트 포함 금지** — Expo Router가 `src/app/`의 모든 파일을 라우트로 번들링한다. 화면 테스트는 `src/__tests__/app/<route>.test.tsx`에 둔다(그 외 파일은 대상 옆 `*.test.ts(x)`). (스캐폴딩 중 `src/app/index.test.tsx`가 앱 번들에 테스트 라이브러리를 끌어들여 `expo export`가 실패했다 — `npm test`는 통과했었다.)
16. **목업 데이터는 `src/mocks/`에만** — 화면은 `useMockStore()`로만 목업에 접근한다. API 연동 시 이 폴더를 API 클라이언트·TanStack Query 훅으로 바꾸고 지운다. 목업 코드에는 `⚠ 목업` 주석을 단다.
17. **앱 진입점은 `index.ts`** — `expo-router/entry`를 불러온 뒤 위젯 처리기를 등록한다(`package.json`의 `main`). 진입점을 `expo-router/entry`로 되돌리면 위젯이 동작하지 않는다.
18. **위젯 컴포넌트(`src/widget/`)엔 `'use no memo'`** — 위젯 라이브러리가 컴포넌트를 React 렌더링 밖에서 함수로 호출하므로 React Compiler가 넣는 훅이 깨진다. 위젯은 스크린리더가 읽지 못하는 이미지로 그려지므로 `accessibilityLabel`에 요약 문장을 넣는다.
19. **프로젝트는 "실" 색으로 구분한다** — `threadColorFor(projectId, projects)`(등록 순서대로 5색 순환). 여러 프로젝트가 섞인 목록(오늘·전체 일정)에선 작업 행 왼쪽에 실 색을 단다. 색만으로 구분하지 않고 항상 프로젝트 이름을 함께 쓴다(§4-4). 오늘 화면의 진행 띠(`DayWeave`)가 이 앱의 시각적 핵심이다.

## 3. 디렉터리 골격

```
mobile/
├── index.ts                 # 진입점: expo-router/entry + 위젯 처리기 등록 (§2-17)
├── app.config.ts            # 이름·scheme(weave)·package(com.weave.app)·아이콘·위젯·plugin
├── eslint.config.js · jest.setup.ts(네이티브·expo-router 목) · tsconfig.json · .nvmrc
├── assets/images/           # 아이콘·스플래시
├── assets/fonts/            # Pretendard Regular·SemiBold·Bold + OFL 라이선스
└── src/
    ├── app/                 # Expo Router — 라우트 파일만 (§2-15)
    │   ├── _layout.tsx      # 루트 Stack + Stack.Protected(로그인 여부로 화면 묶음 전환)
    │   ├── (auth)/          # login · signup
    │   ├── (tabs)/          # index(오늘의 일정) · schedule(전체 일정) · projects · settings
    │   ├── project/new/     # index(기본 정보) → chat(챗봇) → review(태스크 검토)
    │   ├── project/[id]/    # index(상세+태스크 확인) · schedule(일정 확인) · task/[taskId](수정·삭제)
    │   └── settings/        # account(계정 관리)
    ├── __tests__/app/       # 라우트 화면 테스트 (src/app 구조와 대응)
    ├── components/          # Screen · AppText · Button · TextField · Card · ListItem · TaskRow · TaskList · ScheduleSections · ProjectRow · DayWeave · DateHeading · ThreadMark
    ├── theme/               # colors(+실 색) · spacing(+radius) · typography(Pretendard) · useAppTheme (단일 소스, 밝은 테마만)
    ├── lib/                 # 순수 헬퍼: date(DateKey 'YYYY-MM-DD') · validation(Zod) · contrast
    ├── mocks/               # ⚠ 목업 데이터·상태 (§2-16) — API 연동 시 제거
    ├── widget/              # Android 홈 화면 위젯 (§2-18)
    ├── test-utils/          # renderWithStore · expo-router 목
    ├── api/ · queries/ · stores/   # (API 연동 시 생성)
```

## 4. 접근성·기기 대응 (WCAG 2.2 AA + Android/iOS 플랫폼 기준)

**접근성**
1. 누를 수 있는 모든 요소에 `accessibilityRole` + `accessibilityLabel`(아이콘만 있는 버튼 특히). 상태는 `accessibilityState`.
2. 의미 있는 이미지는 `accessibilityLabel`, 장식용은 `accessible={false}`.
3. 입력칸엔 보이는 라벨(placeholder는 라벨이 아니다). 제출 실패는 `AccessibilityInfo.announceForAccessibility`.
4. 색만으로 정보 전달 금지 — 아이콘·문구를 함께.
5. 명도 대비 본문 4.5:1, 큰 글자·아이콘·그래픽 3:1 — `theme.test.ts`가 배경·카드 위의 모든 토큰과 프로젝트 실 색을 검사.
6. 시스템 글자 크기를 따른다 — `allowFontScaling={false}` 금지. 최대 글자 크기에서도 잘림·겹침 없이(고정 높이 대신 패딩).
7. 터치 영역 Android 48×48dp · iOS 44×44pt 이상(`hitSlop`/패딩).
8. 제스처 전용 기능 금지 — 같은 일을 하는 버튼을 함께.
9. 스크린리더 읽기 순서 = 화면 순서. 카드 등은 `accessible`로 묶는다.
10. "동작 줄이기" 설정 존중(Reanimated `useReducedMotion()`).

**기기 대응**
11. 작은 화면(폭 360dp)부터 — 고정 `width` 대신 `flex`·`maxWidth`.
12. Safe Area는 `react-native-safe-area-context`(공통 `Screen`에서). RN 기본 `SafeAreaView` 금지.
13. 키보드가 입력칸을 가리지 않게(`KeyboardAvoidingView` 등).
14. 다크 모드는 지원하지 않는다 — `app.config.ts`의 `userInterfaceStyle: 'light'`로 고정한다.
15. 세로 고정(`orientation: 'portrait'`).

## 5. 명령어 (2026-09-29 실제 실행 확인)

```bash
npm install
npx tsc --noEmit                         # 타입 검사
npm run lint                             # expo lint
npm test                                 # jest (1회 실행 후 종료 — watch 모드 쓰지 않는다)
npm test -- src/theme/theme.test.ts      # 단일 테스트 파일
npx expo-doctor                          # 의존성·설정 호환성 (인터넷 필요)
npx expo export --platform android       # Android JS 번들 생성 확인 (에뮬레이터 없이 가능)
npx expo install <패키지>                 # SDK 호환 버전으로 설치
```

```bash
CI=1 npx expo prebuild --platform android --no-install   # config plugin(위젯 등) 결과만 확인할 때. 확인 후 android/ 삭제
```

**실기기(USB) 실행** — 폰은 **케이블로만** 연결한다(Wi-Fi 접속 안 함). (2026-09-30 Galaxy S22+에서 확인):
```bash
adb devices                              # 폰이 'device'로 보여야 한다 ('unauthorized'면 폰에서 USB 디버깅 허용)
npx expo run:android                     # 개발 빌드 생성 → 폰에 설치 → 개발 서버 시작 (첫 빌드 약 10분)
adb reverse tcp:8081 tcp:8081            # 항상 실행 — USB로 개발 서버 연결
                                         # → 앱 시작 화면 주소칸에 http://localhost:8081 입력 후 Connect
npx expo start                           # 이후 JS만 바꿀 땐 개발 서버만 (CI=1 없이 실행해야 코드 변경이 바로 반영된다)
```
- `expo run:android`는 기본으로 Mac의 LAN 주소로 접속을 시도해서, 폰이 LTE 등 다른 망이면 흰 화면에서 멈춘다 — 항상 `adb reverse` 후 `localhost:8081`로 접속한다. 케이블을 다시 꽂으면 `adb reverse`를 다시 실행한다.
- 삼성 보안 폴더가 있으면 `expo run:android` 로그에 `SecurityException: ... user 150`이 찍히지만 설치·실행엔 영향 없다.
- 화면 확인: `adb exec-out screencap -p > screen.png` (Claude가 직접 캡처해 확인할 수 있다).

**에뮬레이터 실행** (2026-09-30 `Medium_Phone`, API 36 Google Play arm64 이미지에서 확인):
```bash
emulator -list-avds                                   # 만든 에뮬레이터 이름
emulator -avd Medium_Phone                            # 부팅
adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk   # 이미 빌드한 개발 빌드 설치 (재빌드 불필요)
adb -s emulator-5554 reverse tcp:8081 tcp:8081        # 개발 서버 연결 → 앱에서 http://localhost:8081
```
- 폰과 에뮬레이터가 둘 다 연결돼 있으면 `adb` 명령에 `-s <기기ID>`를 붙인다(`adb devices`로 확인). `npx expo run:android`는 어느 기기에 설치할지 묻는다.
Android 빌드 환경(Expo SDK 57 문서 기준, macOS): **JDK 17**(`brew install --cask zulu@17`, `JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home`) · Android Studio에서 **Android SDK Platform 36** + Build-Tools · `ANDROID_HOME=$HOME/Library/Android/sdk`, `PATH`에 `$ANDROID_HOME/platform-tools`·`$ANDROID_HOME/emulator`. 백엔드는 `jvmToolchain(25)`로 JDK 25를 따로 쓰므로 `JAVA_HOME`이 17이어도 된다.
폰: 설정 → 휴대전화 정보 → 소프트웨어 정보 → 빌드 번호 7번 탭 → 개발자 옵션 → USB 디버깅 켜기 → 케이블 연결 후 "USB 디버깅 허용".

> 네이티브 모듈은 테스트에서 목으로 바꾼다(`jest.setup.ts` 또는 테스트 파일의 `jest.mock(...)`). 목 없이 import하면 "native module is null".
