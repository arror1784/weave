# 배포 (AWS Lightsail 1대 — 서버·DB·PC 웹)

사용자 결정(2026-10-17·10-19): Lightsail **시드니(ap-southeast-2)** 1대에 Docker Compose로 PostgreSQL·서버·Caddy를 함께 띄운다. 무료 주소(`<IP를 -로>.sslip.io`)에 Caddy가 HTTPS를 자동으로 붙이고, `/api`는 서버로, 나머지는 PC 웹으로 보낸다.

| 파일 | 역할 |
|---|---|
| `compose.yaml` | db(postgres 18.6) · server(`weave-server:latest`, `SPRING_PROFILES_ACTIVE=prod`) · caddy |
| `Caddyfile` | `/api/*`·`/actuator/health` → server:8080, 그 밖은 `./web`(SPA), 보안 헤더 |
| `.env.example` | 서버의 `deploy/.env`에 넣을 값 목록 — **`.env`는 커밋 금지** |
| `build.sh` | Mac에서 jar → 이미지, 웹 → `deploy/web` |
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

## 주의
- 서버의 `.env` 비밀값(`JWT_SECRET`·`POSTGRES_PASSWORD`)은 로컬과 다른 새 값으로. 바꾸면 기존 로그인이 모두 풀린다(JWT) / DB에 못 붙는다(DB 비밀번호는 볼륨을 처음 만들 때 정해진다).
- DB는 `pgdata` 볼륨에 있다 — `docker compose down -v`는 **데이터를 지운다**.
- 요청 횟수 제한(§3-14)은 아직 없다 — 배포할 때 다시 고려하기로 한 항목.
