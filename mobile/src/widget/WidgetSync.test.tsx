import { waitFor } from '@testing-library/react-native';

import * as projectsApi from '@/api/projects';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';

import { syncTodayWidget } from './sync-today-widget';
import { WidgetSync } from './WidgetSync';

jest.mock('@/api/projects');
jest.mock('./sync-today-widget', () => ({ syncTodayWidget: jest.fn(async () => {}) }));
const api = jest.mocked(projectsApi);
const sync = jest.mocked(syncTodayWidget);

beforeEach(() => {
  jest.clearAllMocks();
  api.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('위젯 동기화', () => {
  it('로그인 상태에서 일정을 받으면 위젯을 그 일정으로 다시 그린다', async () => {
    await renderWithProviders(<WidgetSync />);
    await waitFor(() => expect(sync).toHaveBeenCalledWith(expect.objectContaining({ today: TEST_TODAY })));
  });

  it('작업 체크 등으로 일정이 바뀌면 다시 그린다', async () => {
    const { queryClient } = await renderWithProviders(<WidgetSync />);
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    const changed = { ...sampleSchedule(TEST_TODAY), tasks: [] };
    api.getSchedule.mockResolvedValueOnce(changed);
    await queryClient.invalidateQueries({ queryKey: ['schedule'] });
    await waitFor(() => expect(sync).toHaveBeenLastCalledWith(changed));
  });

  it('로그아웃 상태면 서버를 부르지 않고 위젯을 안내 문구로 바꾼다', async () => {
    await renderWithProviders(<WidgetSync />, { auth: { status: 'signedOut', user: null } });
    await waitFor(() => expect(sync).toHaveBeenCalledWith(null));
    expect(api.getSchedule).not.toHaveBeenCalled();
  });
});
