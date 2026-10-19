#!/usr/bin/env bash
# 운영 DB 매일 백업(사용자 결정 2026-10-19) — 서버의 ~/weave에서 cron이 돌린다. 14일 지난 덤프는 지운다.
# 서버를 통째로 잃는 경우는 Lightsail 자동 스냅샷(매일, 7일)이 맡는다.
# 복원: docker compose exec -T db pg_restore -U weave -d weave --clean --if-exists < ~/backups/weave-<날짜>.dump
set -euo pipefail
cd "$(dirname "$0")"
DIR="$HOME/backups"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$DIR" && chmod 700 "$DIR"
OUT="$DIR/weave-$(TZ=Asia/Seoul date +%Y%m%d-%H%M).dump"
docker compose exec -T db pg_dump -U weave -d weave -Fc > "$OUT.tmp"
mv "$OUT.tmp" "$OUT" && chmod 600 "$OUT"
find "$DIR" -name 'weave-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) 백업 $(basename "$OUT") $(du -h "$OUT" | cut -f1)"
