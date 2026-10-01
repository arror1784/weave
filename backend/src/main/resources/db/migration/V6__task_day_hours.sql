-- 날짜별 배정 시간 — 하루에 최대한 채워 앞당기는 배치(사용자 결정 2026-10-01). 형식: "YYYY-MM-DD=시간;…", 비어 있으면 기간에 똑같이 나눈다
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS day_hours VARCHAR(4000) NOT NULL DEFAULT '';
