-- 밀린 작업: 오늘로 옮길 때 원래 끝나는 날을 남긴다 → 앱이 "지연 D+n"으로 보여준다(사용자 결정 2026-10-01)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS delayed_from DATE;
