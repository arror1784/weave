-- 사용 기록 기능(V9) 전 데이터에서 남아 있는 것만 채운다(사용자 결정 2026-10-07): 가입·프로젝트 등록·첨부 올리기.
-- 생성 시각만 알 수 있어 그 시각으로 남기고 출처를 'backfill'로 표시한다. 작업 완료 시각은 알 수 없어 만들지 않는다.
-- 다시 돌려도 늘지 않게 같은 기록이 있으면 건너뛴다.
INSERT INTO activity_logs (created_at, updated_at, user_id, occurred_at, type, project_id, detail, source)
SELECT now(), now(), u.id, u.created_at, 'SIGNUP', NULL, '{}', 'backfill'
FROM users u
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM activity_logs a WHERE a.user_id = u.id AND a.type = 'SIGNUP');

INSERT INTO activity_logs (created_at, updated_at, user_id, occurred_at, type, project_id, detail, source)
SELECT now(), now(), p.user_id, p.created_at, 'PROJECT_CREATED', p.id,
       json_build_object('name', p.name, 'deadline', p.deadline, 'taskCount',
           (SELECT count(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NULL),
           'deletedAt', p.deleted_at)::text,
       'backfill'
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM activity_logs a WHERE a.project_id = p.id AND a.type = 'PROJECT_CREATED');

INSERT INTO activity_logs (created_at, updated_at, user_id, occurred_at, type, project_id, detail, source)
SELECT now(), now(), f.user_id, f.created_at, CASE WHEN f.kind = 'link' THEN 'ATTACHMENT_LINK_ADDED' ELSE 'ATTACHMENT_UPLOADED' END, f.project_id,
       json_build_object('attachmentId', f.id, 'name', f.name, 'contentType', f.content_type, 'size', f.size_bytes)::text,
       'backfill'
FROM attachments f
WHERE NOT EXISTS (SELECT 1 FROM activity_logs a WHERE a.detail LIKE '%"attachmentId" : ' || f.id || ',%' OR a.detail LIKE '%"attachmentId":' || f.id || ',%');
