import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';

import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  it('선행 미완료 경고는 자기 줄에서 길면 줄바꿈해 카드 밖으로 잘리지 않는다', async () => {
    const s = sampleSchedule(TEST_TODAY);
    const long = 'record·HashMap·equals/hashCode/toString 기본 익히기';
    await renderWithProviders(<TaskCard task={s.tasks[2]} project={s.projects[0]} today={TEST_TODAY} onToggle={() => {}} blockedBy={long} />);
    const text = screen.getByText(`${long} 미완료`);
    expect(StyleSheet.flatten(text.props.style)).toMatchObject({ flexShrink: 1 });
    // 경고 줄은 D-day·소요 시간 줄과 나눠 전체 폭을 쓴다
    expect(StyleSheet.flatten(text.parent!.props.style)).toMatchObject({ width: '100%' });
  });
});
