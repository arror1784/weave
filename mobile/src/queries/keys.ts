export const queryKeys = {
  me: ['me'] as const,
  schedule: ['schedule'] as const,
  projects: (status: 'active' | 'done') => ['projects', status] as const,
  projectsAll: ['projects'] as const,
  project: (id: number) => ['project', id] as const,
};
