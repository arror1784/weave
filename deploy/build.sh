#!/usr/bin/env bash
# 배포 묶음 만들기(Mac에서) — 서버 jar·이미지, PC 웹 정적 파일.
#   ./deploy/build.sh            → 이 Mac에서 띄워 볼 이미지(로컬 아키텍처)
#   PLATFORM=linux/amd64 ./deploy/build.sh --save  → Lightsail(x86)용 이미지를 deploy/weave-server.tar.gz로 저장
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLATFORM="${PLATFORM:-}"

echo "▶ 서버 jar"
(cd "$ROOT/backend" && rm -f build/libs/*.jar && ./gradlew bootJar -q)

echo "▶ 서버 이미지 weave-server:latest ${PLATFORM:+($PLATFORM)}"
docker build ${PLATFORM:+--platform "$PLATFORM"} -t weave-server:latest "$ROOT/backend"

echo "▶ PC 웹 정적 파일 → deploy/web"
(cd "$ROOT/web" && npm run build --silent)
rm -rf "$ROOT/deploy/web" && cp -R "$ROOT/web/dist" "$ROOT/deploy/web"

if [[ "${1:-}" == "--save" ]]; then
  echo "▶ 이미지 저장 → deploy/weave-server.tar.gz"
  docker save weave-server:latest | gzip > "$ROOT/deploy/weave-server.tar.gz"
fi
echo "✔ 끝"
