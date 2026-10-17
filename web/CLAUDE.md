# web/CLAUDE.md — weave PC 웹 (프로젝트 등록)

> 루트 `CLAUDE.md`의 전역 규칙·보안 규칙을 먼저 따른다. 이 파일은 웹 전용 규칙이다.
> **범위(사용자 결정 2026-10-17): PC에서 프로젝트 등록 + "AI에게 재요청"만.** 오늘 할 일·일정·체크·설정은 폰 앱에서 한다.
> 디자인: Figma Make "Personal-Schedule-Management-App"의 `src/web/WebApp.tsx`(W1~W6). 원본 사본은 `local-docs/웹-디자인-Figma-Make/`.

## 1. 기술 스택

| 패키지 | 버전 | 역할 |
|---|---|---|
| Vite / @vitejs/plugin-react | 8.3 / 6.1 | 개발 서버(`/api` → localhost:8080 프록시) · 빌드 |
| React / react-dom / react-router | 19.2.3 / 19.2.3 / 7.x | 화면 · 주소(BrowserRouter) |
| TypeScript | 6.0.3 (정확히 고정, 앱과 같다) | `baseUrl` 없이 `paths`만(TS 6에서 baseUrl은 경고) |
| Tailwind CSS (@tailwindcss/vite) | 4.3 | 디자인이 Tailwind라 그대로. 색·글꼴은 `src/styles.css`의 `@theme` 토큰만 |
| Zod / TanStack Query | 4 / 5 | 응답 검증 · 서버 상태 |
| Vitest + Testing Library + jsdom | 5 / 16 | 테스트(`globals: true`) |
| ESLint (typescript-eslint, react-hooks) | 9 | lint |

패키지는 `npm install --save-exact`로 정확한 버전을 고정한다.

## 2. 필수 규칙

1. **토큰은 메모리와 HttpOnly 쿠키에만** — 액세스 토큰은 `api/client.ts`의 변수에만, 리프레시 토큰은 서버가 주는 `weave_refresh` 쿠키(스크립트가 못 읽음). **localStorage·sessionStorage·IndexedDB에 토큰·초안 저장 금지**(루트 §3-2). 그래서 새로고침하면 등록 초안이 사라진다 — `NoDraft`가 안내한다.
2. **웹 인증 요청은 `webAuthPost`로만** — `/api/v1/auth/web/*`(로그인·갱신·로그아웃)는 서버가 CSRF를 검사한다. `XSRF-TOKEN` 쿠키 값을 `X-XSRF-TOKEN` 헤더로 보내고, 쿠키가 없으면 `/api/v1/auth/web/csrf`로 먼저 받는다. 그 밖의 API는 `request()`(Bearer).
3. **토큰 갱신은 한 번에 하나만** — 동시 401에서 같은 Promise를 기다린다(앱과 같은 이유: 두 번째 갱신이 교체된 쿠키를 보내면 "재사용"으로 전부 폐기된다).
4. **웹과 API는 같은 주소(origin)** — 코드에 서버 주소를 넣지 않고 경로(`/api/...`)만 쓴다. 개발은 Vite 프록시, 배포는 Caddy가 `/api`를 서버로 넘긴다. CORS를 켜지 않는다.
5. **API 모양은 앱과 같다** — `src/api/types.ts`는 `mobile/src/api/types.ts`에서 옮겨 왔다(웹 로그인 응답만 다르다). 서버 DTO가 바뀌면 둘 다 고친다. `lib/date`·`lib/markdown`·`lib/validation`·`state/draft`(+테스트)도 앱에서 옮긴 것 — 고치면 둘 다.
6. **앱과 다르게 만들지 않는다** — 디자인과 앱이 다르면 앱 기준(사용자 결정 2026-10-17): 챗봇 '질문 n/5' 없음 · 작업 시간 상한 없음 · 이름 없는 인사 · 작업 설명은 글 하나 · 달력은 월요일부터. 새로 다르게 하려면 사용자에게 묻는다.
7. **색·글꼴은 `@theme` 토큰으로** — `bg-thread`·`text-ink-soft`처럼. 프로젝트 7색은 `theme/palette.ts`(앱과 같은 값). 글꼴은 `public/fonts`의 Pretendard·JetBrains Mono(OFL, 앱과 같은 파일) — 외부 CDN에서 받지 않는다.
8. **접근성** — 입력칸마다 보이는 라벨, 아이콘만 있는 버튼엔 `aria-label`, 키보드만으로 모든 동작(포커스 테두리), 한글 조합 중 Enter로 보내지 않는다(`isComposing`).
9. **모든 화면 4가지 상태** — 로딩(스켈레톤) · 오류(다시 시도) · 빈 목록 · 연결 실패(`NetworkError` → "서버에 연결할 수 없어요").

## 3. 디렉터리

```
web/
├── index.html · vite.config.ts(프록시·테스트) · tsconfig.json · eslint.config.js
├── public/fonts/ · public/favicon.png
└── src/
    ├── main.tsx · App.tsx(라우트: /login · / · /new · /new/chat · /new/review · /new/done · /projects/:id/replan)
    ├── api/        # client(request·webAuthPost·토큰 갱신) · auth · projects · chat · attachments · errors · types
    ├── auth/       # AuthProvider — 페이지를 열면 쿠키로 세션 복원
    ├── state/      # draft(앱과 같은 reducer) · DraftProvider
    ├── components/ # ui(Btn·Card·Label·Spinner·배지…) · icons · brand · TopBar · StepHeader · DateField · AttachPanel
    ├── pages/      # Login · Home · Info(+재요청 시작) · Chat · Review · Done · NoDraft — 테스트는 같은 폴더 *.test.tsx
    ├── lib/ · theme/ · test/(setup·render)
```

## 4. 명령어

```bash
npm install
npm run dev          # http://localhost:5173 — 백엔드(8080)가 떠 있어야 한다
npm test             # vitest run
npm run typecheck    # tsc
npm run lint
npm run build        # dist/ (배포 때 Caddy가 이 정적 파일을 준다)
```

브라우저 쿠키는 `Secure`라 개발 중엔 Chrome·Firefox의 `http://localhost`에서 확인한다(둘 다 localhost를 안전한 주소로 본다).

## 5. 커밋 조언 전 게이트

`npm run typecheck && npm run lint && npm test && npm run build` 전부 통과 + 백엔드를 띄우고 브라우저에서 로그인 → 등록 → 완료까지 직접 확인.
