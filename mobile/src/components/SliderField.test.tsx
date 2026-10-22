import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/colors';

import { SliderField } from './SliderField';

describe('SliderField', () => {
  it('빈 선은 입력칸 경계 색으로 그린다 — 옅은 구분선 색은 Android에서 반투명해져 안 보였다', async () => {
    await render(
      <SliderField label="월요일 가용 시간" min={0} max={24} step={0.5} value={8} format={(v) => `${v}시간`} onChange={() => {}} />,
    );
    const slider = screen.getByRole('adjustable', { name: '월요일 가용 시간' });
    expect(slider.props.maximumTrackTintColor).toBe(colors.control);
    expect(slider.props.minimumTrackTintColor).toBe(colors.thread);
  });
});
