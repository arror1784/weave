#!/usr/bin/env bash
# 운영 계정 비밀번호 바꾸기(앱에 재설정 기능이 없을 때) — 비밀번호는 이 Mac에서만 입력받고, 서버에는 bcrypt 해시만 보낸다.
#   사용: scripts/reset-password.sh <이메일>
# 비밀번호 규칙은 가입과 같다(8~64자, 영문·숫자·특수문자 각 1개 이상, 공백 없음 — ValidPassword).
# 바꾸면 그 계정의 로그인(리프레시 토큰)을 모두 끊는다 — 앱·웹에서 새 비밀번호로 다시 로그인한다.
set -euo pipefail
EMAIL="${1:?사용: $0 <이메일>}"
HOST="${WEAVE_SSH_HOST:-ubuntu@13.54.18.38}"
KEY="${WEAVE_SSH_KEY:-$HOME/.ssh/weave-lightsail.pem}"

read -rsp "새 비밀번호: " PW; echo
read -rsp "한 번 더: " PW2; echo
[[ "$PW" == "$PW2" ]] || { echo "두 번 입력한 비밀번호가 달라요." >&2; exit 1; }
(( ${#PW} >= 8 && ${#PW} <= 64 )) || { echo "8~64자로 정해 주세요." >&2; exit 1; }
[[ "$PW" =~ [A-Za-z] && "$PW" =~ [0-9] && "$PW" =~ [^A-Za-z0-9] && ! "$PW" =~ [[:space:]] ]] \
  || { echo "영문·숫자·특수문자를 각각 1개 이상 넣고 공백은 빼 주세요." >&2; exit 1; }

# htpasswd -B는 $2y$ bcrypt — Spring BCryptPasswordEncoder가 읽는다(2a/2b/2y)
HASH=$(htpasswd -inBC 10 "" <<<"$PW" | tr -d ':\n')
unset PW PW2

printf '%s\n%s' "$EMAIL" "$HASH" | ssh -i "$KEY" "$HOST" 'set -e; cd ~/weave
  { read -r EMAIL; read -r HASH; }
  printf "%s\n" \
    "begin;" \
    "update users set password_hash = :'"'"'h'"'"', updated_at = now() where email = :'"'"'e'"'"' and deleted_at is null;" \
    "update refresh_tokens set revoked_at = now() where revoked_at is null and user_id = (select id from users where email = :'"'"'e'"'"' and deleted_at is null);" \
    "commit;" \
  | docker compose exec -T db psql -U weave -d weave -v ON_ERROR_STOP=1 -v h="$HASH" -v e="$EMAIL"'
echo "바꿨어요 — 앱·웹에서 새 비밀번호로 다시 로그인하세요."
