# 배포 (AWS Lightsail 1대 — 서버·DB·PC 웹)

사용자 결정(2026-10-17·10-19): Lightsail **시드니(ap-southeast-2)** 1대에 Docker Compose로 PostgreSQL·서버·Caddy를 함께 띄운다. 무료 주소(`<IP를 -로>.sslip.io`)에 Caddy가 HTTPS를 자동으로 붙이고, `/api`는 서버로, 나머지는 PC 웹으로 보낸다.

| 파일 | 역할 |
|---|---|
| `compose.yaml` | db(postgres 18.6) · server(`weave-server:latest`, `SPRING_PROFILES_ACTIVE=prod`) · caddy |
| `Caddyfile` | `/api/*`·`/actuator/health` → server:8080, 그 밖은 `./web`(SPA), 보안 헤더 |
| `.env.example` | 서버의 `deploy/.env`에 넣을 값 목록 — **`.env`는 커밋 금지** |
| `build.sh` | Mac에서 jar → 이미지, 웹 → `deploy/web` |
| `backup.sh` | 서버에서 매일 DB 덤프(cron 03:30 KST) → `~/backups`, 14일 보관 |
| `../backend/Dockerfile` | jar를 넣은 실행 이미지(JRE 25) |
| `../backend/src/main/resources/application-prod.yml` | 운영 프로필: API 문서 끔, 프록시 헤더, 첨부 `/data/uploads` |

## 이 Mac에서 먼저 띄워 보기
```bash
./deploy/build.sh
cp deploy/.env.example deploy/.env   # SITE_ADDRESS=http://localhost, HTTP_PORT=8088, 비밀값 채우기
cd deploy && docker compose up -d
curl localhost:8088/actuator/health  # {"status":"UP"} — 브라우저는 http://localhost:8088
docker compose down                  # 끄기(데이터 볼륨은 남는다)
```

## 서버에 올리기
```bash
PLATFORM=linux/amd64 ./deploy/build.sh --save   # Lightsail은 x86 — deploy/weave-server.tar.gz
# compose.yaml · Caddyfile · web/ · weave-server.tar.gz 를 서버로 복사한 뒤 서버에서:
docker load < weave-server.tar.gz && docker compose up -d
```

## 백업 (사용자 결정 2026-10-19)
- **DB 덤프**: 서버 cron `30 18 * * *`(UTC = 03:30 KST)이 `~/weave/backup.sh` 실행 → `~/backups/weave-<날짜>.dump`(pg_dump -Fc), 14일 지난 것 삭제, 기록은 `~/backups/backup.log`.
- **서버 통째**: Lightsail 자동 스냅샷(매일 19:00 UTC = 04:00 KST, 최근 7개) — 첨부 파일(`uploads` 볼륨)·덤프까지 포함. 복원은 콘솔/CLI에서 스냅샷으로 새 인스턴스를 만들고 고정 IP를 옮긴다.
- DB만 되돌리기(데이터를 덮어쓴다 — 먼저 지금 상태를 한 번 더 덤프):
  ```bash
  cd ~/weave && ./backup.sh
  docker compose exec -T db pg_restore -U weave -d weave --clean --if-exists < ~/backups/weave-<날짜>.dump
  docker compose restart server
  ```
- 복원 연습(운영 DB는 안 건드림): `createdb weave_restore_check` → `pg_restore -d weave_restore_check` → 확인 → `dropdb` (2026-10-19 한 번 확인: 테이블 9개·공휴일 46건 복원).

## 주의
- 서버의 `.env` 비밀값(`JWT_SECRET`·`POSTGRES_PASSWORD`)은 로컬과 다른 새 값으로. 바꾸면 기존 로그인이 모두 풀린다(JWT) / DB에 못 붙는다(DB 비밀번호는 볼륨을 처음 만들 때 정해진다).
- DB는 `pgdata` 볼륨에 있다 — `docker compose down -v`는 **데이터를 지운다**.
- 요청 횟수 제한(§3-14)은 아직 없다 — 배포할 때 다시 고려하기로 한 항목.
