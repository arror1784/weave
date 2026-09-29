# weave

Android 우선 모바일 앱 — 백엔드 Kotlin + Spring Boot 4, 앱 React Native + Expo SDK 57.

| 폴더 | 내용 | 시작 |
|---|---|---|
| `backend/` | API 서버 (PostgreSQL · Flyway) | `cd backend && ./gradlew bootRun` (Docker 필요) |
| `mobile/` | Expo 앱 | `cd mobile && npm install && npm test` |

개발 규칙·검증 절차는 `CLAUDE.md`(AI 하네스)를 따른다.
