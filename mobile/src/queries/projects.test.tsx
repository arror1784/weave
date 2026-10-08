import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { deleteProject } from '@/api/projects';

import { queryKeys } from './keys';
import { useDeleteProject } from './projects';

jest.mock('@/api/projects');

describe('useDeleteProject', () => {
  it('삭제하면 서버가 남은 작업을 다시 배치하므로 다른 프로젝트 상세도 새로 받는다', async () => {
    jest.mocked(deleteProject).mockResolvedValue(undefined);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
    client.setQueryData(queryKeys.project(1), { id: 1 });
    client.setQueryData(queryKeys.project(2), { id: 2 });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = await renderHook(() => useDeleteProject(), { wrapper });
    await act(() => result.current.mutateAsync(1));

    expect(client.getQueryState(queryKeys.project(1))).toBeUndefined();
    expect(client.getQueryState(queryKeys.project(2))?.isInvalidated).toBe(true);
    client.clear();
  });
});
