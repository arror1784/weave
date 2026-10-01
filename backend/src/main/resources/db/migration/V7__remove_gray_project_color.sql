-- 프로젝트 색에서 회색을 뺐다(사용자 결정 2026-10-01). 이미 회색인 프로젝트는 청록으로 바꾼다.
UPDATE projects SET color = 'teal' WHERE color = 'gray';
