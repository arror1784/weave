-- 개인 일정 종류 늘리기(사용자 결정 2026-10-23): 한 번 일정을 날짜 여러 개(같은 시각) 또는 이어진 일정(시작 날짜·시각 ~ 끝 날짜·시각)으로.
-- repeat_type은 'weekly'·'once' 그대로 둔다(설치된 옛 앱이 읽을 수 있게). 개인정보(일정 날짜) — 탈퇴 시 행째 삭제(§3-17).
-- 한 번 일정의 날짜들 — 쉼표로 (예: '2026-10-24,2026-10-28'), event_date는 그 가운데 첫 날짜
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS event_dates VARCHAR(1200) NOT NULL DEFAULT '';
-- 이어진 일정의 끝 날짜 — 있으면 event_date start_time ~ until_date end_time이 하나로 이어진다
ALTER TABLE personal_events ADD COLUMN IF NOT EXISTS until_date DATE;

-- 기존 한 번 일정은 날짜 하나짜리 날짜 지정 일정으로
UPDATE personal_events SET event_dates = event_date::text WHERE repeat_type = 'once' AND event_date IS NOT NULL AND event_dates = '';
