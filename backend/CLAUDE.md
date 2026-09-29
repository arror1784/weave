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
    │   ├── global/                      # config(SecurityConfig) · domain(BaseEntity) · 공통 예외
    │   ├── auth/                        # (추가 예정) ID 토큰 검증 · 토큰 발급/갱신/폐기
    │   ├── client/                      # (추가 예정) 외부 연동
    │   └── {feature}/{controller,dto,service,repository,domain}/
    ├── main/resources/
    │   ├── application.yml
    │   └── db/migration/                # V1__init.sql … (첫 기능에서 생성)
    └── test/kotlin/com/weave/           # main과 같은 패키지 구조
        └── TestcontainersConfiguration.kt   # 통합 테스트는 @Import 해서 실제 PostgreSQL 사용
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
