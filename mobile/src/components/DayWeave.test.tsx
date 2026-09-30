import { render, screen } from '@testing-library/react-native';

import { DayWeave } from './DayWeave';

const projects = [{ id: 'p1' }, { id: 'p2' }];

const tasks = [
  { id: 'a', projectId: 'p1', done: true },
  { id: 'b', projectId: 'p2', done: false },
  { id: 'c', projectId: 'p1', done: false },
];

describe('DayWeave (오늘의 진행 띠)', () => {
  it('작업마다 조각 하나를 그린다', async () => {
    await render(<DayWeave tasks={tasks} projects={projects} />);
    expect(screen.getAllByTestId('weave-segment')).toHaveLength(3);
  });

  it('스크린리더에 진행 상황을 문장으로 알린다', async () => {
    await render(<DayWeave tasks={tasks} projects={projects} />);
    expect(screen.getByLabelText('오늘 작업 3개 중 1개 완료')).toBeOnTheScreen();
  });

  it('작업이 없으면 아무것도 그리지 않는다', async () => {
    await render(<DayWeave tasks={[]} projects={projects} />);
    expect(screen.queryAllByTestId('weave-segment')).toHaveLength(0);
  });
});
