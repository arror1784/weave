-- 상시(마감 없는) 프로젝트에 떼어 두는 칸 — 주 몇 번 × 한 번에 몇 시간(사용자 결정 2026-10-17, 기본 주 2번 × 1시간).
-- 이미 가입한 사용자도 기본값으로 채운다.
ALTER TABLE users ADD COLUMN IF NOT EXISTS standing_sessions_per_week INT NOT NULL DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS standing_session_hours DOUBLE PRECISION NOT NULL DEFAULT 1;
