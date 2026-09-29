---
name: new-feature
description: weave에 기능을 추가하는 순서 — 마이그레이션·엔티티 → 서비스 → API → 앱 API 클라이언트·쿼리 훅 → 화면. 단계마다 테스트 먼저(TDD).
---

# 기능 추가 런북

시작 전: 기능 브랜치에서 작업하는지 확인한다(`main` 직접 작업 금지). `CLAUDE.md`, `backend/CLAUDE.md`, `mobile/CLAUDE.md`, `.claude/rules/testing.md`를 읽는다.

각 단계는 RED(의도한 실패 확인) → GREEN(최소 구현) → REFACTOR.

1. **스키마** — `.claude/skills/db-migration` 절차로 마이그레이션 작성.
2. **엔티티** — `backend/src/main/kotlin/com/weave/<feature>/domain/`. `BaseEntity` 상속 + `@SQLDelete`/`@SQLRestriction`. 도메인 규칙은 순수 단위 테스트로.
3. **Repository** — Testcontainers 통합 테스트 먼저.
4. **Service** — `@Transactional`은 여기만. Repository·`client/`만 목으로 대체한 테스트 먼저. 본인 소유 확인(IDOR) 로직 포함.
5. **API** — `/api/v1/<resources>`, DTO는 별도 파일, 수정은 `PATCH`, 목록은 페이지네이션, 모든 메서드에 `@PreAuthorize`. `@WebMvcTest`로 401/403/검증 실패/camelCase 응답 테스트 먼저.
6. **백엔드 게이트** — `cd backend && ./gradlew build`.
7. **앱 API 클라이언트** — `mobile/src/api/<domain>.ts` (Zod로 응답 검증). 필요한 패키지(Axios·Zod·TanStack Query)가 없으면 `.claude/skills/add-native-module` 절차로 먼저 설치.
8. **쿼리 훅** — `mobile/src/queries/<domain>.ts`.
9. **화면** — `mobile/src/app/...`(라우트만) + 공통 컴포넌트. 로딩·에러·빈 목록·오프라인 4상태. 테스트는 `src/__tests__/app/`에, 역할·이름으로 요소를 찾는다.
10. **앱 게이트** — `cd mobile && npx tsc --noEmit && npm run lint && npm test && npx expo-doctor && npx expo export --platform android`.
11. **Layer 6** — 백엔드 `bootRun` + 앱을 Android에서 직접 확인(루트 CLAUDE.md 체크리스트). 못 한 항목은 보고에 적는다.
12. **커밋 조언** — 커밋은 사람이 한다. 커밋 단위·순서·메시지를 제안하고 섞이면 안 되는 파일을 경고한다.
