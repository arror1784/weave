-- 프로젝트 기본 정보의 결과물 형태·기 진행사항을 저장한다 — "AI에게 재요청" 때 다시 채우려고(사용자 결정 2026-10-02).
-- 개인정보가 담길 수 있는 글 — 탈퇴 시 행째 삭제한다(§3-17). 이미 등록한 프로젝트는 빈 값.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deliverable VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress VARCHAR(2000) NOT NULL DEFAULT '';
