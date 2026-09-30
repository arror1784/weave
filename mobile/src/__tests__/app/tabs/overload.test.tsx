import { fireEvent, screen } from '@testing-library/react-native';

import OverloadScreen from '@/app/overload';
import { mockRouter, resetRouterMock } from '@/test-utils/router';
import { renderWithStore, storeRef } from '@/test-utils/render';

beforeEach(resetRouterMock);

describe('이번 주 과부하', () => {
  // 이번 주 남은 작업 + 밀린 작업 = 3+1.5+2+2+1+1.25+0.75+1(코드 리뷰) = 12.5h
  const lowCapacity = { settings: { weeklyAvailableHours: 10 } };

  it('예상 소요가 가용 시간을 넘으면 초과 시간을 알려준다', async () => {
    await renderWithStore(<OverloadScreen />, lowCapacity);
    expect(screen.getByRole('header', { name: '이번 주 과부하' })).toBeOnTheScreen();
    expect(screen.getByLabelText('예상 소요 12.5시간')).toBeOnTheScreen();
    expect(screen.getByText('2.5시간이 초과됐어요.')).toBeOnTheScreen();
  });

  it('미룰 작업을 고르면 예상 시간이 줄고, 반영하면 다음 주로 옮긴다', async () => {
    await renderWithStore(<OverloadScreen />, lowCapacity);
    expect(screen.getByRole('button', { name: '일정에 반영하기' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: /^설계 문서 작성, 3h/ }));
    expect(screen.getByLabelText('예상 소요 9.5시간')).toBeOnTheScreen();
    expect(screen.getByText(/가용 안으로 들어와요/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '일정에 반영하기' }));
    expect(storeRef.current?.tasks.find((t) => t.id === 'e-design')?.scheduledDate).toBe('2026-10-06');
    expect(mockRouter.back).toHaveBeenCalled();
    expect(screen.getByText('3시간을 다음 주로 옮겼어요')).toBeOnTheScreen();
  });
});
