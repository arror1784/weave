# backend/CLAUDE.md — weave API (Kotlin + Spring Boot)

> 루트 `CLAUDE.md`의 전역 규칙·보안 규칙을 먼저 따른다. 이 파일은 백엔드 전용 규칙이다.
> 좋은 규칙은 **아팠던 경험의 응축**이다. 규칙을 추가할 땐 "왜 / 어떤 사고에서"를 함께 적는다.

## 1. 기술 스택 (2026-09-29 기준, 버전은 `gradle/libs.versions.toml`이 단일 소스)

| 항목 | 버전 | 비고 |
|---|---|---|
| JDK | 25 (LTS) | `kotlin { jvmToolchain(25) }`로 고정 — 로컬 기본 JDK가 26이어도 Gradle이 25를 쓴다 |
| Kotlin | 2.4.20 | Boot BOM은 2.3.21을 관리 → `gradle.properties`의 `kotlin.version=2.4.20`으로 맞춤. 플러그인 `spring`(allopen) · `jpa`(noarg) |
| Spring Boot | 4.1.1 | Security 7.1 · Jackson 3.1(`tools.jackson.*`) · Hibernate 7.4 · Flyway 12.4 |
| Gradle | 9.8.0 (wrapper) | Kotlin DSL + Version Catalog, 단일 모듈 |
| PostgreSQL | 18.6 | 로컬은 `compose.yaml`, 테스트는 Testcontainers |
| springdoc-openapi | 3.1.1 | `/swagger-ui.html`, `/v3/api-docs` |
| Testcontainers / Kotest / MockK / springmockk | 2.0.5 / 6.2.5 / 1.14.11 / 5.0.1 | |
| Spring Security OAuth2 Resource Server | 7.1 (Boot 관리) | 서버가 직접 발급한 JWT(HS256) 검증 — 스타터 이름은 `spring-boot-starter-security-oauth2-resource-server` |
| anthropic-java | 2.66.0 | Claude API 공식 SDK — `client/ClaudeClient`에서만 |
| metadata-extractor | 2.21.0 | HEIC 사진의 위치정보(GPS) 확인용. JPEG·PNG 메타데이터는 직접 지운다(commons-imaging은 정식 버전이 없어 안 씀) |
| poi-ooxml · poi-scratchpad · hwplib · hwpxlib | 5.5.1 · 5.5.1 · 1.1.11 · 1.0.9 | 첨부를 AI에게 보낼 때 Office(옛 doc·ppt는 scratchpad)·한글에서 글자 뽑기(`ai/service/AttachmentContentLoader`). hwpxlib는 파일 경로로만 읽어서 임시 파일을 거친다 |

⚠ 인터넷의 옛 예제(Boot 2·3)를 복사할 때 주의: `javax.*` → `jakarta.*`, Jackson 2 → 3, `spring-boot-starter-web` → **`spring-boot-starter-webmvc`**, `@AutoConfigureMockMvc`는 `org.springframework.boot.webmvc.test.autoconfigure` 패키지, Testcontainers 2는 `org.testcontainers.postgresql.PostgreSQLContainer`, Flyway는 **`spring-boot-starter-flyway` + `flyway-database-postgresql`** 둘 다 필요.
⚠ `developmentOnly`는 `implementation`의 BOM을 상속하지 않는다 — 새 설정에 의존성을 넣을 땐 `springBootBom` 플랫폼도 같이 건다(`build.gradle.kts`).

## 2. 필수 규칙

1. **계층을 나누고 의존은 한 방향으로** — `controller → service → repository`. Controller는 요청 검증·응답 변환만, 비즈니스 로직은 Service에.
2. **엔티티를 API 응답으로 직접 내보내지 않는다** — Request/Response DTO를 별도 파일로. 엔티티를 반환하면 내부 필드가 새고, DB 컬럼 변경이 **이미 설치된 앱을 전부 깨뜨린다.**
3. **`@Transactional`은 Service에만** — 조회 전용은 `@Transactional(readOnly = true)`.
4. **파일당 클래스 하나.**
5. **새 엔티티는 `global/domain/BaseEntity` 상속** — `id`·`created_at`·`updated_at`·`deleted_at` 제공. 재선언 금지. "삭제"를 `is_active=false`로 표현하지 않는다. **소프트 삭제는 코드로 강제** — 엔티티마다 `@SQLDelete(sql = "UPDATE <테이블> SET deleted_at = now() WHERE id = ?")` + `@SQLRestriction("deleted_at IS NULL")`.
6. **엔티티를 바꾸면 같은 커밋에 Flyway 마이그레이션** — `ddl-auto=validate`라 누락 시 부팅 실패. 절차는 `../.claude/rules/migration.md`.
7. **인가는 `@PreAuthorize`로만** — 필터에 URL 경로로 권한 규칙을 하드코딩하지 않는다. `global/config/SecurityConfig`의 **`@EnableMethodSecurity`를 지우지 않는다**(없으면 `@PreAuthorize`가 에러 없이 무시된다 — `SecurityConfigIntegrationTest`가 지킨다). 필터 체인은 기본 거부(`anyRequest().authenticated()`), 로그인 없이 열 경로만 `PUBLIC_PATHS`에 추가한다.
8. **HTTP 메서드** — 생성 `POST` / 수정 **`PATCH`**(`PUT` 금지) / 삭제 `DELETE` / 조회 `GET`.
9. **외부 연동은 `client/` 패키지로 격리** — 외부 서비스마다 클래스 하나.
10. **목록 API는 처음부터 페이지네이션** — `page`/`size`(또는 커서).

## 3. 패키지 골격

```
backend/
├── build.gradle.kts · settings.gradle.kts · gradle.properties
├── gradle/libs.versions.toml            # 버전 단일 소스
├── compose.yaml                         # 로컬 PostgreSQL (bootRun 시 자동 기동)
└── src/
    ├── main/kotlin/com/weave/
    │   ├── WeaveApplication.kt
    │   ├── global/                      # time/TodayProvider(하루는 아침 6시에 바뀐다 — 오늘은 항상 여기서) · config(Security·Jwt·Clock(KST)·Password·WeaveProperties) · domain(BaseEntity) · error(ApiException·오류 응답) · security(Jwt.userId()) · web(PageResponse)
    │   ├── auth/                        # 가입·로그인·토큰 갱신(교체·재사용 감지)·로그아웃 · 개발용 로그인(@Profile("local"))
    │   ├── user/                        # 내 정보·하루 가용 시간·탈퇴(개인정보 실제 삭제 — AccountDeletionService)
    │   ├── project/                     # 프로젝트·작업 (작업은 완료 여부만 바뀐다)
    │   ├── schedule/                    # domain/Scheduler(일정 알고리즘 — 등록 때 전부 다시 배치, 하루에 최대한 채워 앞당기기, 마감을 못 지키면 앞날에 몰기) · service/OverdueRoller(밀린 작업 → 오늘, 매일 6시 5분) · 일정 스냅샷 API
    │   ├── attachment/                  # 첨부 업로드·링크·내려받기 · storage/FileStorage(로컬 디스크) · OrphanAttachmentCleaner(연결 안 된 첨부 24시간 후 삭제, 매일 4시)
    │   ├── activity/                    # 사용 기록(ActivityRecorder — 각 서비스가 같은 트랜잭션에서 남긴다) · 앱 기록 받기 · 엑셀 내보내기(ActivityExportService, POI)
    │   ├── ai/                          # 등록 챗봇(ProjectChatService — propose_tasks 도구, 5턴 뒤 강제) · AttachmentContentLoader(첨부 → AI 내용)
    │   ├── client/                      # 외부 연동: AiClient ← ClaudeClient
    │   └── {feature}/{controller,dto,service,repository,domain}/
    ├── main/resources/
    │   ├── application.yml
    │   │                                # AI 시스템 프롬프트는 여기 두지 않는다 — 빌드할 때 ../docs/Weave-AI 작업 분할 시스템 프롬프트.md를 prompts/project-breakdown.md로 복사(build.gradle.kts)
    │   └── db/migration/                # V1 users·refresh_tokens · V2 projects·tasks · V3 attachments · V4 tasks.delayed_from · V5 tasks.description · V6 tasks.day_hours(날짜별 배정 시간) · V7 회색 프로젝트 색 제거(회색 → 청록) · V8 projects.deliverable·progress · V9 activity_logs·tasks.done_at · V10 기능 전 데이터로 사용 기록 채우기(backfill) · V11 users.standing_sessions_per_week·standing_session_hours(상시 프로젝트 칸) · V12 users.available_mon~sun·available_holiday(요일별·공휴일 가용 시간, daily_available_hours 삭제)·holidays
    └── test/kotlin/com/weave/           # main과 같은 패키지 구조
        ├── TestcontainersConfiguration.kt   # 통합 테스트는 @Import 해서 실제 PostgreSQL 사용
        └── support/ApiTestSupport.kt       # 가입 후 토큰 받기·JSON 헬퍼 (통합 테스트는 @ActiveProfiles("test") — src/test/resources/application-test.yml)
```

## 4. 명령어 (2026-09-29 실제 실행 확인)

> 선행 조건: **Docker 실행 중**이어야 한다(`bootRun`의 docker compose, 통합 테스트의 Testcontainers). Docker 없이 테스트가 실패하면 코드 문제로 오판하지 말 것.

```bash
./gradlew build                          # 전체 빌드 + 테스트
./gradlew test                           # 테스트만
./gradlew test --tests "SecurityConfigIntegrationTest"   # 단일 테스트
./gradlew bootRun                        # 실행 → http://localhost:8080 (compose로 DB 자동 기동)
```

확인용 엔드포인트: `GET /actuator/health`(공개) · `/swagger-ui.html`(공개) · 그 외는 토큰 없으면 401.

**로컬 실행에 필요한 `.env` 값**(`backend/.env`, 커밋되지 않음): `JWT_SECRET`(32바이트 이상 임의 문자열) · `ANTHROPIC_API_KEY` · (선택) `HOLIDAY_API_KEY`(공공데이터포털 한국천문연구원 특일 정보의 디코딩된 키 — 없으면 공휴일 없이 배치) · (선택) `WEAVE_STORAGE_ROOT`(첨부 저장 폴더, 기본 `uploads/`).

```bash
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun     # 개발용 로그인 POST /api/v1/dev/login {email} 이 열린다
```

**API 요약** (`/api/v1`, 모두 camelCase): `auth/signup·login·refresh·logout`(앱 — 본문으로 두 토큰) · `auth/web/csrf·login·refresh·logout`(PC 웹 — 리프레시 토큰은 HttpOnly 쿠키, 이 경로만 CSRF, 사용 기록에 `client: web`) · `me`(GET·DELETE) · `me/settings`(PATCH 요일별 7개·공휴일 가용 시간·상시 칸 — 바꿀 값만, 가용 시간·상시 칸이 바뀌면 밀린 작업까지 바로 다시 배치. `dailyAvailableHours`는 요일별 전 앱용으로 7요일·공휴일을 모두 그 값으로) · `projects`(POST 등록 → 서버가 날짜 배정 / GET `?status&page&size`) · `projects/{id}`(GET · PATCH 색·`status=done` · DELETE — 작업·첨부 파일까지) · `projects/{id}/replan-tasks`(POST, AI에게 재요청 확정 — 미완료 작업 교체·기본 정보 반영) · `tasks/{id}`(PATCH `done`) · `schedule`(오늘 기준 스냅샷) · `schedule/replan`(POST, 밀린 작업 포함 다시 배치) · `attachments`(POST multipart · `links` · `{id}/content` 내려받기 · DELETE) · `project-chat`(AI 챗봇, `attachmentIds`로 첨부 함께) · `activity/events`(POST, 앱 사용 기록 — 앱 열기·화면 보기·위젯 갱신만) · `me/activity/export`(GET, 내 사용 기록 .xlsx — Mac에서 `scripts/export-activity.sh <이메일>`).

**사용 기록**(사용자 결정 2026-10-07): 프로젝트·작업·AI 챗봇(대화 본문 포함)·설정·첨부·로그인은 서버가 `ActivityRecorder.record`로 남긴다 — 새 기능을 만들면 기록도 함께 넣고 `ActivityType`에 종류를 추가한다. 기록에는 개인정보가 담기므로 탈퇴 시 `AccountDeletionService`가 지운다. AI 챗봇 기록에는 대화 묶음 번호(`conversationId`, 앱이 등록 흐름마다 만든다 — 프로젝트 등록·재요청 기록에도 남아 대화와 이어진다)·모델·토큰(캐시 읽기/쓰기 포함)·비용(USD)이 남는다. 비용 단가는 `application.yml`의 `weave.anthropic.price`(기본: Sonnet 5.5 공식 단가) — 모델을 바꾸면 단가도 함께 바꾼다. **검토 화면 수정 기록**(2026-10-17, 보고서 향후 계획 — 프롬프트 개선 자료): AI 제안(`AI_CHAT.proposedTasks`)과 확정 목록(`PROJECT_CREATED`·`PROJECT_REPLANNED`의 `tasks`)을 같은 모양(`TaskLog.entry` — 이름·시간·선행 작업 이름·선행 지식)으로 남기고, 엑셀 "작업 검토 비교" 시트(`TaskReviewDiff`)가 같은 대화 번호끼리 비교한다. 작업은 이름으로 짝짓는다(이름을 바꾸면 삭제+추가로 보인다).

**정기 작업**(`@EnableScheduling`, 한국 시간): 6시 5분 밀린 작업을 오늘로(하루가 6시에 바뀐다)(`OverdueRoller` — 일정 조회·등록 직전에도 그 사용자 것을 한 번 더) · 4시 연결 안 된 첨부 정리(`OrphanAttachmentCleaner`) · 매달 1일 4시 30분과 서버 시작 때 올해·내년 공휴일 맞추기(`HolidaySync` ← `client/DataGoKrHolidayClient`, XML은 XXE를 막고 읽는다).

**일정 규칙**(`schedule/domain/Scheduler.kt` 머리 주석이 기준 — 바꾸면 주석과 `SchedulerTest`를 함께): 상시(마감 없는) 프로젝트는 사용자 설정의 칸(기본 주 2번 × 1시간)에만 배치한다(2026-10-17). 가용 시간은 날짜마다 다르다 — `AvailabilityService.capacityOn`(요일별 + 공휴일 우선)을 `Scheduler.plan`에 넘긴다. 작업마다 날짜별 배정 시간(`Task.dayHours`, 응답 `days`)을 저장한다. 오늘은 `LocalDate.now`가 아닌 `TodayProvider.today()`로만 구한다(아침 6시 전이면 전날).

**겪은 함정**
- Jackson 3의 `JsonNode.map(...)`은 코틀린 컬렉션 `map`이 아니다(노드 자체를 변환) — 테스트에서 배열을 돌 땐 `asIterable().map`.
- PostgreSQL은 준비된 문장 하나에 SQL 두 개를 못 넣는다 — `@Modifying` 네이티브 쿼리는 문장마다 메서드를 나눈다.
- `@Email`은 앞뒤 공백이 있으면 실패한다 — 앱이 trim해서 보낸다.
- 앱(Expo fetch)이 업로드 파일 이름을 퍼센트 인코딩해 보내고, 폰은 한글을 자모 분해(NFD)해서 준다 — `AttachmentService.displayName`이 되돌리고 합친다(NFC).
- **외부 API 응답은 바이트로 받아 형식이 정한 인코딩으로 읽는다** — 공공데이터 API가 `Content-Type: application/xml`에 charset을 주지 않아 `body(String)`이 ISO-8859-1로 읽었고, 공휴일 이름이 깨진 채 저장됐다(2026-10-17). XML은 바이트를 파서에 넘기면 머리말의 encoding을 따른다.
- **같은 클래스 안에서 부른 `@Transactional` 메서드는 트랜잭션이 걸리지 않는다**(프록시를 거치지 않음) — 엔티티 값을 바꿔 두기만 하면 저장되지 않는다. 정기 작업이 자기 메서드를 부를 땐 `repository.save`로 명시적으로 저장한다(공휴일 이름이 안 고쳐진 버그, 2026-10-17).
- 테스트 프로필은 외부 API 키를 비운다(`application-test.yml`) — `.env`를 테스트도 읽어서, 키를 넣자 테스트 서버가 뜰 때마다 실제 공휴일 API를 부를 뻔했다.
- 요청 횟수 제한은 지금 없다(사용자 결정 — 배포 때 다시 고려). 넣을 때는 서버가 여러 대일 수 있으니 공유 저장소 기준으로, 통합 테스트는 모두 같은 IP라는 점을 고려한다.
