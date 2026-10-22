-- PC 웹 '로그인 상태 유지'(사용자 결정 2026-10-22) — 끄고 로그인하면 쿠키를 브라우저를 닫으면 사라지게 준다.
-- 토큰을 교체해도 그 선택을 이어 가려고 토큰에 남긴다. 앱과 기존 토큰은 지금처럼 유지(true).
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS remember BOOLEAN NOT NULL DEFAULT TRUE;
