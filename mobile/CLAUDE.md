# mobile/CLAUDE.md — weave 앱 (React Native + Expo)

> 루트 `CLAUDE.md`의 전역 규칙·보안 규칙을 먼저 따른다. 이 파일은 앱 전용 규칙이다.
> **주 타깃은 Android.** iOS는 나중에 추가한다.

## 0. Expo는 버전마다 바뀐다 — 기억을 믿지 말 것

Expo는 SDK마다 API가 이름이 바뀌거나 사라진다. Expo·EAS·React Native API를 건드리기 전에:
1. `package.json`의 `expo` 메이저 버전을 확인한다(현재 **57**).
2. 해당 버전 문서를 읽는다: `https://docs.expo.dev/versions/v57.0.0/`
3. 그 밖의 것은 `https://docs.expo.dev/llms.txt`(LLM이 자주 틀리는 부분 정정 포함)에서 해당 페이지를 찾아 읽는다.

이번 스캐폴딩에서 실제로 부딪힌 변경: TypeScript 6은 `@types/*`를 자동으로 읽지 않는다(`tsconfig.json`의 `types`에 명시) · RN 0.86의 `ColorSchemeName`은 `'light' | 'dark' | 'unspecified'`(null 없음) · RNTL 14의 `render`는 async(`await render(...)`).

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
| Jest + jest-expo | 29.7 + 57.0.x | jest-expo 57은 Jest 29 기반 — 30으로 올리지 않는다 |
| @testing-library/react-native | 14.x | 역할·이름으로 요소를 찾는다 |
| ESLint + eslint-config-expo | 9.x + 57.0.x | `expo lint`가 설치한 조합(flat config) |

**필요해질 때 추가**(모두 `npx expo install`): TanStack Query · Zustand · Axios · Zod · `@react-native-community/netinfo` · `expo-secure-store` · `expo-auth-session` · `@shopify/flash-list` · `@expo/vector-icons` · Maestro(E2E, CLI 별도 설치). 추가 절차는 `../.claude/rules/native-modules.md`.

## 2. 필수 규칙

1. **색상·간격·글자 크기 단일 소스** — `src/theme/`(`colors` · `spacing` · `typography`)에서만. 컴포넌트에 `#fff`·`fontSize: 13`을 직접 쓰지 않는다. 라이트/다크는 `useAppTheme()`이 토큰 세트만 바꾼다. 색을 바꾸면 `theme.test.ts`가 명도 대비를 검사한다.
2. **공통 컴포넌트로만 UI 제작** — `Screen` · `AppText`(+ 필요 시 `Button` · `TextField` · `ListItem` 추가). 화면에서 RN 기본 `<Text>`/`<Pressable>`/`<TextInput>`을 새로 스타일링하지 않는다.
3. **API는 도메인 클라이언트로만** — 컴포넌트에서 `axios`/`fetch` 직접 호출 금지. `src/api/<domain>.ts` → `src/queries/<domain>.ts`(TanStack Query 훅). 토큰 첨부·갱신은 인터셉터 전담.
4. **서버 상태 ≠ 클라이언트 상태** — 서버 데이터는 Query 캐시, Zustand엔 UI 상태만.
5. **외부 입력은 경계에서 Zod로 검증** — 폼 입력과 API 응답 파싱 지점.
6. **모든 화면은 4가지 상태: 로딩 · 에러(다시 시도) · 빈 목록 · 오프라인** — `onlineManager`↔NetInfo, `focusManager`↔`AppState` 연결.
7. **긴 목록은 `FlashList`/`FlatList`로** — `ScrollView` + `map` 금지. 서버 페이지네이션 + 무한 스크롤.
8. **네이티브 패키지는 `npx expo install`로만** — 설치 후 `npx expo-doctor`. 네이티브 코드가 있으면 개발 빌드 재생성.
9. **플랫폼 분기는 공통 컴포넌트 안에만** — `Platform.OS` 분기를 화면에 흩뿌리지 않는다.
10. **기기 권한은 쓰는 순간에 요청하고 거부를 처리** — 권한 설명 문구는 `app.config.ts`(config plugin)에 반드시 넣는다.
11. **로컬 API 주소는 `EXPO_PUBLIC_API_URL`로 주입** — Android 에뮬레이터는 `http://10.0.2.2:8080`(또는 `adb reverse tcp:8080 tcp:8080` 후 `localhost`), 실기기는 `http://<PC LAN IP>:8080`(같은 Wi-Fi). HTTP는 개발 중에만.
12. **한 개념을 두 곳에 등록하는 구조는 문서화** — 예: 탭 화면(`src/app/(tabs)/`)과 탭 설정(`(tabs)/_layout.tsx`).
13. **개발 빌드를 기본으로, Expo Go는 화면 확인용** — 소셜 로그인·푸시 등 네이티브 기능은 `npx expo run:android`로 만든 개발 빌드에서 확인.
14. **`ios/`·`android/` 폴더는 직접 고치지 않는다** — `app.config.ts`에서 생성되는 폴더다(`.gitignore`됨). 네이티브 설정은 `app.config.ts`와 config plugin으로만.
15. **`src/app/` 안에는 라우트 파일만 둔다 — 테스트 포함 금지** — Expo Router가 `src/app/`의 모든 파일을 라우트로 번들링한다. 화면 테스트는 `src/__tests__/app/<route>.test.tsx`에 둔다(그 외 파일은 대상 옆 `*.test.ts(x)`). (스캐폴딩 중 `src/app/index.test.tsx`가 앱 번들에 테스트 라이브러리를 끌어들여 `expo export`가 실패했다 — `npm test`는 통과했었다.)

## 3. 디렉터리 골격

```
mobile/
├── app.config.ts            # 이름·scheme(weave)·package(com.weave.app)·아이콘·권한 설명·plugin
├── eslint.config.js · jest.setup.ts · tsconfig.json · .nvmrc
├── assets/images/           # 아이콘·스플래시
└── src/
    ├── app/                 # Expo Router — 라우트 파일만 (§2-15)
    │   ├── _layout.tsx      # 루트 레이아웃(테마·Stack)
    │   └── index.tsx        # 홈
    ├── __tests__/app/       # 라우트 화면 테스트
    ├── components/          # 공통 컴포넌트: Screen · AppText
    ├── theme/               # colors · spacing · typography · useAppTheme (단일 소스)
    ├── lib/                 # 순수 헬퍼 (contrast 등)
    ├── api/ · queries/ · stores/   # (필요할 때 생성)
```

## 4. 접근성·기기 대응 (WCAG 2.2 AA + Android/iOS 플랫폼 기준)

**접근성**
1. 누를 수 있는 모든 요소에 `accessibilityRole` + `accessibilityLabel`(아이콘만 있는 버튼 특히). 상태는 `accessibilityState`.
2. 의미 있는 이미지는 `accessibilityLabel`, 장식용은 `accessible={false}`.
3. 입력칸엔 보이는 라벨(placeholder는 라벨이 아니다). 제출 실패는 `AccessibilityInfo.announceForAccessibility`.
4. 색만으로 정보 전달 금지 — 아이콘·문구를 함께.
5. 명도 대비 본문 4.5:1, 큰 글자·아이콘 3:1 — `theme.test.ts`가 라이트·다크 모두 검사.
6. 시스템 글자 크기를 따른다 — `allowFontScaling={false}` 금지. 최대 글자 크기에서도 잘림·겹침 없이(고정 높이 대신 패딩).
7. 터치 영역 Android 48×48dp · iOS 44×44pt 이상(`hitSlop`/패딩).
8. 제스처 전용 기능 금지 — 같은 일을 하는 버튼을 함께.
9. 스크린리더 읽기 순서 = 화면 순서. 카드 등은 `accessible`로 묶는다.
10. "동작 줄이기" 설정 존중(Reanimated `useReducedMotion()`).

**기기 대응**
11. 작은 화면(폭 360dp)부터 — 고정 `width` 대신 `flex`·`maxWidth`.
12. Safe Area는 `react-native-safe-area-context`(공통 `Screen`에서). RN 기본 `SafeAreaView` 금지.
13. 키보드가 입력칸을 가리지 않게(`KeyboardAvoidingView` 등).
14. 다크 모드는 시스템 설정을 따르고 토큰만 바꾼다.
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

**아직 확인하지 못한 명령** (Android SDK/Android Studio 설치 후 확인하고 위로 옮긴다):
```bash
npx expo run:android                     # 개발 빌드 생성·설치 (처음 1회 + 네이티브 패키지·app.config 변경 시)
npx expo start                           # 개발 서버 (개발 빌드가 설치된 에뮬레이터/실기기가 접속)
```
Android 빌드엔 React Native 환경 설정 문서가 권장하는 JDK를 `JAVA_HOME`으로 둔다(백엔드는 `jvmToolchain(25)`로 따로 관리).

> 네이티브 모듈은 테스트에서 목으로 바꾼다(`jest.setup.ts` 또는 테스트 파일의 `jest.mock(...)`). 목 없이 import하면 "native module is null".
