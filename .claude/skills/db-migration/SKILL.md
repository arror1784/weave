---
name: db-migration
description: weave 백엔드에 Flyway 마이그레이션을 작성하고 검증하는 절차.
---

# DB 마이그레이션 런북

1. `.claude/rules/migration.md`를 읽는다.
2. 다음 번호 확인: `ls backend/src/main/resources/db/migration/` → 최대 `V<n>` + 1.
3. 엔티티 변경과 **같은 커밋**이 되도록 엔티티와 마이그레이션을 함께 작성한다. 기존 파일은 수정하지 않는다.
4. DDL을 멱등하게 작성한다(`IF NOT EXISTS`). BaseEntity 4컬럼 포함.
5. 검증 (Docker 실행 중이어야 함):
   ```bash
   cd backend && ./gradlew test
   ```
   Testcontainers PostgreSQL에 Flyway가 적용된 뒤 `ddl-auto=validate`로 컨텍스트가 뜨면 스키마와 엔티티가 일치한다. 실패 메시지의 테이블·컬럼명을 확인해 마이그레이션을 고친다(아직 커밋 전일 때만 파일 수정 가능).
6. 로컬 DB 확인이 필요하면 `./gradlew bootRun` 로그에서 `Successfully applied N migrations`를 확인한다.
7. **운영·공유 DB에 직접 DDL을 치거나 데이터를 지우는 작업은 하지 않는다** — 필요하면 사용자 확인.
