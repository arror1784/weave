#!/bin/sh
# 사용 기록을 엑셀(.xlsx)로 받는다 — 로컬 서버(local 프로필)의 개발용 로그인을 쓴다.
# 사용: scripts/export-activity.sh <이메일> [저장할 파일]
#   예: scripts/export-activity.sh demo@weave.app
#       scripts/export-activity.sh me@example.com ~/Desktop/weave-사용기록.xlsx
# 서버 주소는 WEAVE_API_URL(기본 http://localhost:8080). 개발용 로그인은 local 프로필에서만 열려 있다.
set -eu
EMAIL="${1:?사용: $0 <이메일> [저장할 파일]}"
API="${WEAVE_API_URL:-http://localhost:8080}"
OUT="${2:-weave-사용기록-$(echo "$EMAIL" | cut -d@ -f1)-$(date +%Y%m%d-%H%M).xlsx}"

TOKEN=$(curl -sf -X POST "$API/api/v1/dev/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["accessToken"])') \
  || { echo "로그인 실패 — 서버가 local 프로필로 켜져 있는지, 이메일이 맞는지 확인하세요." >&2; exit 1; }

curl -sf "$API/api/v1/me/activity/export" -H "Authorization: Bearer $TOKEN" -o "$OUT" \
  || { echo "내보내기 실패" >&2; exit 1; }
echo "저장: $OUT"
