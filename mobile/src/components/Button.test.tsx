import { screen } from '@testing-library/react-native';

import { IconPlus } from '@/components/icons';
import { renderWithProviders } from '@/test-utils/render';

import { Button } from './Button';

describe('Button', () => {
  it('글자는 simple 줄바꿈으로 그린다 — 삼성 폰에서 목록이 바뀐 뒤 다시 그릴 때 마지막 단어가 둘째 줄로 밀려 잘렸다(2026-10-18)', async () => {
    await renderWithProviders(<Button label="개인 일정 추가" onPress={() => {}} icon={(c) => <IconPlus size={17} color={c} />} />);
    expect(screen.getByRole('button', { name: '개인 일정 추가' })).toBeOnTheScreen();
    expect(screen.getByText('개인 일정 추가').props.textBreakStrategy).toBe('simple');
  });
});
