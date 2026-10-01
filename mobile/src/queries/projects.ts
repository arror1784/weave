import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createProject, getProject, listProjects, setTaskDone, updateProject, type NewProject } from '@/api/projects';
import type { Project } from '@/api/types';

import { queryKeys } from './keys';

const PAGE_SIZE = 20;

/** 프로젝트 목록 — 서버 페이지네이션, 다음 페이지는 fetchNextPage로 */
export const useProjectList = (status: Project['status']) =>
  useInfiniteQuery({
    queryKey: queryKeys.projects(status),
    queryFn: ({ pageParam }) => listProjects(status, pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  });

export const useProject = (id: number) => useQuery({ queryKey: queryKeys.project(id), queryFn: () => getProject(id), enabled: Number.isFinite(id) });

/** 프로젝트·작업이 바뀌면 관련 화면 캐시를 모두 새로 받는다 */
function useInvalidateProjects() {
  const client = useQueryClient();
  return (projectId?: number) =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.schedule }),
      client.invalidateQueries({ queryKey: queryKeys.projectsAll }),
      projectId !== undefined ? client.invalidateQueries({ queryKey: queryKeys.project(projectId) }) : null,
    ]);
}

/** 작업 완료 체크 — 응답의 projectAllDone으로 프로젝트 완료 여부를 묻는다(사용자 결정 H) */
export function useSetTaskDone() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ taskId, done }: { taskId: number; done: boolean }) => setTaskDone(taskId, done),
    onSuccess: (result) => invalidate(result.task.projectId),
  });
}

export function useUpdateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: Parameters<typeof updateProject>[1] }) => updateProject(id, changes),
    onSuccess: (project) => invalidate(project.id),
  });
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({ mutationFn: (project: NewProject) => createProject(project), onSuccess: () => invalidate() });
}
