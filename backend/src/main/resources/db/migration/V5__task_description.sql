-- 작업 세부 설명(목표·범위·완료 기준) — AI가 제안하고 사용자가 검토한 내용 (사용자 프롬프트 2026-10-01)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description VARCHAR(2000) NOT NULL DEFAULT '';
