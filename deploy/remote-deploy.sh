#!/usr/bin/env bash
# 서버에서 실행 — GitHub Actions(.github/workflows/deploy.yml)가 SSH로 부른다(사용자 결정 2026-10-20).
#   표준 입력: 이번 작업의 GITHUB_TOKEN(GHCR 읽기) · 인자: <이미지 주소:커밋> <GitHub 사용자>
# 새 설정·웹 파일은 Actions가 ~/weave/.incoming에 풀어 둔다. .env·데이터 볼륨은 건드리지 않는다.
set -euo pipefail
IMAGE="$1"
ACTOR="$2"
cd ~/weave

docker login ghcr.io -u "$ACTOR" --password-stdin >/dev/null
trap 'docker logout ghcr.io >/dev/null' EXIT
docker pull -q "$IMAGE"
docker tag "$IMAGE" weave-server:latest   # compose.yaml은 weave-server:latest를 쓴다 — Mac에서 손으로 올리는 방법도 그대로 둔다

# compose.yaml·Caddyfile은 내용만 덮어쓴다(Caddy가 파일을 바인드 마운트하므로 같은 파일을 유지)
cp .incoming/compose.yaml .incoming/Caddyfile .incoming/backup.sh .
# 웹 폴더도 폴더째 바꾸지 않고 안의 파일만 바꾼다 — 폴더를 바꾸면 Caddy가 옛 폴더를 계속 본다
mkdir -p web
find web -mindepth 1 -delete
cp -R .incoming/web/. web/
rm -rf .incoming

docker compose up -d                     # 이미지가 바뀐 server만 다시 만든다
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

# 지금 쓰는 것 말고 예전 GHCR 이미지는 지운다(2GB 서버 디스크)
docker images "${IMAGE%:*}" --format '{{.Repository}}:{{.Tag}}' | grep -vx "$IMAGE" | xargs -r docker rmi >/dev/null || true
docker image prune -f >/dev/null
echo "배포 완료: $IMAGE"
