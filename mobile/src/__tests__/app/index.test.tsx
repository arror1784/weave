import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

describe('HomeScreen', () => {
  it('스크린리더가 읽을 수 있는 앱 이름 제목을 보여준다', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'weave' })).toBeOnTheScreen();
  });
});
