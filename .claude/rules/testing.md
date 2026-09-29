# 테스트 규칙 (Layer 5 상세)

## 변경 유형별로 먼저 쓸 테스트

| 변경 | 먼저 쓸 테스트 | 도구 |
|---|---|---|
| 엔티티·도메인 규칙 | 순수 단위 테스트 — Spring 컨텍스트 없이 | Kotest |
| Service 로직 | Repository·`client/`만 목으로 대체한 서비스 테스트 | Kotest + MockK |
| Repository·쿼리 | 실제 PostgreSQL 통합 테스트 | Testcontainers (`@Import(TestcontainersConfiguration::class)`) |
| 엔티티·스키마 변경 | 마이그레이션 적용 후 `ddl-auto=validate` 통과(컨텍스트 로드) | Testcontainers + Flyway |
| 새 API·컨트롤러 | 요청 검증, 응답 camelCase·`id`, 페이지네이션, `@PreAuthorize` 허용/403 | `@WebMvcTest` + springmockk (`spring-boot-starter-webmvc-test`) |
| 개발용 로그인 | `local` 외 프로필에서 개발용 로그인 API가 404 | `@SpringBootTest` + 프로필 |
| 권한·본인 확인 | 토큰 없음 401, 권한 없음 403, **남의 리소스 ID로 요청 시 403/404** | `@WebMvcTest` / Testcontainers |
| 인증 | 위조·만료·허용 목록 밖 `aud` 거부 / 리프레시 교체 / 재사용 시 전부 폐기 | Kotest + Testcontainers |
| 버그 수정 | **버그를 재현하는 테스트 먼저** RED 확인 → 수정 | 해당 층 도구 |
| 앱 헬퍼·스토어 | 단위 테스트 | Jest |
| 앱 컴포넌트·화면 | 렌더·사용자 동작. API는 `jest.mock('@/api/<domain>')`. **요소는 `getByRole('button', { name: '저장' })`처럼 역할·이름으로** — 못 찾으면 접근성 라벨 누락 | Jest + RNTL (`await render(...)`) |
| 화면 상태 | 로딩·에러(다시 시도)·빈 목록·오프라인 각각 | Jest + RNTL |
| 권한 거부 | 거부 시 대체 안내 표시 | Jest + RNTL (expo 모듈 목) |
| 사용자 흐름 | E2E 시나리오 | Maestro (도입 시) |

## 작성 규칙
- 테스트 이름은 행위를 문장으로: `"잔액이 부족하면 출금을 거절한다"`.
- 목은 **경계에만**(Repository·`client/`·외부 API·기기 기능 모듈). 엔티티·도메인 객체는 목으로 만들지 않는다.
- **테스트를 약하게 해서 통과시키기 금지** — 삭제, `skip`/`only`, 단언 완화, 기대값 끼워맞추기, 이유 없는 스냅샷 갱신(`-u`). 기대값은 요구사항이 바뀐 경우에만 바꾸고 이유를 보고한다.
- 플래키 테스트는 재시도로 덮지 않고 원인(시간·순서·공유 상태·애니메이션 대기)을 고친다.
- 위치: 백엔드 `src/test/kotlin/` 같은 패키지 구조, 단위 `*Test.kt` · 통합 `*IntegrationTest.kt`. 앱은 대상 옆 `*.test.ts(x)` — **단, 라우트 화면은 `src/__tests__/app/`**(`src/app/`엔 라우트만). E2E는 `.maestro/*.yaml`.
- Kotest + Spring: 스펙 클래스에 `@ApplyExtension(SpringExtension::class)`, 생성자 주입으로 빈을 받는다(`SecurityConfigIntegrationTest` 참고).
