import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import * as eventsApi from '@/api/events';
import * as projectsApi from '@/api/projects';
import type { PersonalEvent } from '@/api/types';
import EditEventScreen from '@/app/events/[id]';
import EventsScreen, { describeEvent } from '@/app/events/index';
import NewEventScreen from '@/app/events/new';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockParams, mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/events');
jest.mock('@/api/projects');
const api = jest.mocked(eventsApi);
const projects = jest.mocked(projectsApi);

const weekly: PersonalEvent = { id: 1, title: '운영체제 수업', repeat: 'weekly', weekdays: [1, 3], date: null, dates: [], untilDate: null, startTime: '10:00', endTime: '12:00', startDate: null, endDate: null };
const once: PersonalEvent = { id: 2, title: '동아리 모임', repeat: 'once', weekdays: [], date: '2026-10-24', dates: ['2026-10-24'], untilDate: null, startTime: '18:00', endTime: '21:00', startDate: null, endDate: null };
const several: PersonalEvent = { ...once, id: 3, title: '회식', dates: ['2026-10-24', '2026-10-28', '2026-11-02'], startTime: '19:00' };
const span: PersonalEvent = { ...once, id: 4, title: 'MT', untilDate: '2026-10-26', startTime: '14:00', endTime: '12:00' };
const page = (items: PersonalEvent[]) => ({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 });

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  projects.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('개인 일정 목록 (사용자 결정 2026-10-17)', () => {
  it('반복은 요일·시각, 날짜 지정은 날짜들·시각, 이어진 일정은 시작~끝으로 보여준다 — 바로 다시 배치한다고 알린다 (2026-10-23)', async () => {
    api.listEvents.mockResolvedValue(page([weekly, once]));
    await renderWithProviders(<EventsScreen />);
    expect(await screen.findByText('운영체제 수업')).toBeOnTheScreen();
    expect(screen.getByText('매주 월·수 · 10:00~12:00')).toBeOnTheScreen();
    expect(screen.getByText('10월 24일 토요일 · 18:00~21:00')).toBeOnTheScreen();
    expect(describeEvent({ ...weekly, weekdays: [5], startTime: '22:00', endTime: '01:00' })).toBe('매주 금 · 22:00~다음 날 01:00');
    expect(describeEvent(several)).toBe('10/24 · 10/28 · 11/2 · 19:00~21:00');
    expect(describeEvent({ ...several, dates: ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'] })).toBe('10/24 · 10/25 · 10/26 외 2일 · 19:00~21:00');
    expect(describeEvent(span)).toBe('10월 24일 토요일 14:00 ~ 10월 26일 월요일 12:00');
    expect(screen.getByText(/추가·수정·삭제하면 바로 작업을 다시 배치해요/)).toBeOnTheScreen();
  });

  it('일정을 누르면 수정 화면으로 간다', async () => {
    api.listEvents.mockResolvedValue(page([weekly]));
    await renderWithProviders(<EventsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: /운영체제 수업 수정/ }));
    expect(mockRouter.push).toHaveBeenCalledWith('/events/1');
  });

  it('없으면 비어 있다고 알리고, 추가 화면으로 간다', async () => {
    api.listEvents.mockResolvedValue(page([]));
    await renderWithProviders(<EventsScreen />);
    expect(await screen.findByText('아직 개인 일정이 없어요.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '개인 일정 추가' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/events/new');
  });

  it('불러오지 못하면 다시 시도', async () => {
    api.listEvents.mockRejectedValueOnce(new ApiError(500, 'X', '오류')).mockResolvedValue(page([weekly]));
    await renderWithProviders(<EventsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('운영체제 수업')).toBeOnTheScreen();
  });

  it('확인을 받은 뒤 지운다', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    api.listEvents.mockResolvedValue(page([weekly]));
    api.deleteEvent.mockResolvedValue(undefined);
    await renderWithProviders(<EventsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: '운영체제 수업 삭제' }));
    expect(api.deleteEvent).not.toHaveBeenCalled();
    await act(async () => alert.mock.calls.at(-1)![2]!.find((b) => b.text === '삭제')!.onPress!());
    expect(api.deleteEvent).toHaveBeenCalledWith(1);
  });
});

describe('개인 일정 추가', () => {
  async function fillTitle(title = '운영체제 수업') {
    await fireEvent.changeText(await screen.findByLabelText('일정 이름'), title);
  }

  it('매주 반복: 요일을 고르고 시각을 30분씩 바꿔 저장한다(기간은 비우면 계속)', async () => {
    api.createEvent.mockResolvedValue(weekly);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle();
    await fireEvent.press(screen.getByRole('checkbox', { name: '월요일' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: '수요일' }));
    // 기본 09:00~10:00 → 10:00~12:00
    await fireEvent.press(screen.getByRole('button', { name: '시작 시각 30분 늦게' }));
    await fireEvent.press(screen.getByRole('button', { name: '시작 시각 30분 늦게' }));
    expect(screen.getByLabelText('시작 시각')).toHaveDisplayValue('10:00');
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByRole('button', { name: '끝나는 시각 30분 늦게' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith({
      title: '운영체제 수업', repeat: 'weekly', weekdays: [1, 3], date: null, dates: [], untilDate: null, startTime: '10:00', endTime: '12:00', startDate: null, endDate: null,
    });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('시각은 숫자 칸에 직접 적을 수 있다 — 분은 아무 값이나, 1015처럼 붙여 써도 된다 (사용자 결정 2026-10-23)', async () => {
    api.createEvent.mockResolvedValue(weekly);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle();
    await fireEvent.press(screen.getByRole('checkbox', { name: '월요일' }));
    const start = screen.getByLabelText('시작 시각');
    await fireEvent.changeText(start, '1015');
    await fireEvent(start, 'blur');
    expect(start).toHaveDisplayValue('10:15');
    const end = screen.getByLabelText('끝나는 시각');
    await fireEvent.changeText(end, '11:50');
    await fireEvent(end, 'blur');
    // −/+는 그 값에서 30분씩
    await fireEvent.press(screen.getByRole('button', { name: '끝나는 시각 30분 늦게' }));
    expect(end).toHaveDisplayValue('12:20');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith(expect.objectContaining({ startTime: '10:15', endTime: '12:20' }));
  });

  it('시각 칸에 잘못 적으면 알려 주고 원래 값으로 돌린다', async () => {
    await renderWithProviders(<NewEventScreen />);
    const start = await screen.findByLabelText('시작 시각');
    await fireEvent.changeText(start, '25:00');
    await fireEvent(start, 'blur');
    expect(start).toHaveDisplayValue('09:00');
    expect(screen.getByText('시각은 13:30처럼 적어 주세요.')).toBeOnTheScreen();
  });

  it('날짜 지정: 달력에서 여러 날을 골라 같은 시각으로 저장한다', async () => {
    api.createEvent.mockResolvedValue(several);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle('회식');
    await fireEvent.press(screen.getByRole('tab', { name: '날짜 지정' }));
    await fireEvent.press(screen.getByRole('button', { name: /^날짜/ }));
    // 달력은 오늘(테스트 9/30)이 있는 달부터 열린다
    await fireEvent.press(await screen.findByRole('button', { name: '9월 29일 화요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '9월 22일 화요일' }));
    expect(screen.getByRole('button', { name: '9월 29일 화요일' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: '고르기 끝' }));
    expect(screen.getByRole('button', { name: /^날짜, 9\/22 · 9\/29/ })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: '회식', repeat: 'once', weekdays: [], date: '2026-09-22', dates: ['2026-09-22', '2026-09-29'], untilDate: null }),
    );
  });

  it('날짜 지정: "기간으로 고르기"는 처음과 끝을 누르면 그 사이 날짜를 모두 고른다 · 고른 날을 다시 누르면 뺀다', async () => {
    api.createEvent.mockResolvedValue(several);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle('집중 강의');
    await fireEvent.press(screen.getByRole('tab', { name: '날짜 지정' }));
    await fireEvent.press(screen.getByRole('button', { name: /^날짜/ }));
    await fireEvent.press(await screen.findByRole('button', { name: '기간으로 고르기' }));
    await fireEvent.press(screen.getByRole('button', { name: '9월 21일 월요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '9월 24일 목요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '9월 22일 화요일' })); // 기간 고르기가 끝나면 다시 하나씩 — 빼기
    await fireEvent.press(screen.getByRole('button', { name: '고르기 끝' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith(expect.objectContaining({ dates: ['2026-09-21', '2026-09-23', '2026-09-24'] }));
  });

  it('이어진 일정: 시작 날짜·시각 ~ 끝 날짜·시각으로 저장한다 · 끝이 시작보다 앞이면 알려 준다', async () => {
    api.createEvent.mockResolvedValue(span);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle('MT');
    await fireEvent.press(screen.getByRole('tab', { name: '이어진 일정' }));
    await fireEvent.press(screen.getByRole('button', { name: /^시작 날짜/ }));
    await fireEvent.press(await screen.findByRole('button', { name: '9월 29일 화요일' }));
    await fireEvent.press(screen.getByRole('button', { name: /^끝나는 날짜/ }));
    await fireEvent.press(await screen.findByRole('button', { name: '9월 28일 월요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('끝나는 날짜·시각이 시작보다 뒤여야 해요.')).toBeOnTheScreen();
    expect(api.createEvent).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: /^끝나는 날짜/ }));
    await fireEvent.press(await screen.findByRole('button', { name: '다음 달' }));
    await fireEvent.press(screen.getByRole('button', { name: '10월 1일 목요일' }));
    const start = screen.getByLabelText('시작 시각');
    await fireEvent.changeText(start, '14:00');
    await fireEvent(start, 'blur');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ repeat: 'once', weekdays: [], date: '2026-09-29', dates: ['2026-09-29'], untilDate: '2026-10-01', startTime: '14:00', endTime: '10:00' }),
    );
  });

  it('검증: 이름 없음·요일 없음·끝과 시작이 같으면 저장하지 않고 알려준다', async () => {
    await renderWithProviders(<NewEventScreen />);
    await screen.findByLabelText('일정 이름');
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('일정 이름을 적어 주세요.')).toBeOnTheScreen();
    await fillTitle();
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('반복할 요일을 하나 이상 골라 주세요.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: '월요일' }));
    for (let i = 0; i < 2; i++) await fireEvent.press(screen.getByRole('button', { name: '끝나는 시각 30분 이르게' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByText('끝나는 시각이 시작 시각과 같아요.')).toBeOnTheScreen();
    expect(api.createEvent).not.toHaveBeenCalled();
  });

  it('끝이 시작보다 이르면 다음 날까지로 알리고 그대로 저장한다 (사용자 결정 2026-10-18)', async () => {
    api.createEvent.mockResolvedValue(weekly);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle('밤 모임');
    await fireEvent.press(screen.getByRole('checkbox', { name: '금요일' }));
    // 09:00 → 22:00, 10:00 → 01:00
    for (let i = 0; i < 26; i++) await fireEvent.press(screen.getByRole('button', { name: '시작 시각 30분 늦게' }));
    for (let i = 0; i < 18; i++) await fireEvent.press(screen.getByRole('button', { name: '끝나는 시각 30분 이르게' }));
    expect(screen.getByLabelText('끝나는 시각')).toHaveDisplayValue('01:00');
    expect(screen.getByText('다음 날')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith(expect.objectContaining({ weekdays: [5], startTime: '22:00', endTime: '01:00' }));
  });

  it('서버가 거절하면 그 이유를 보여준다', async () => {
    api.createEvent.mockRejectedValue(new ApiError(400, 'VALIDATION_FAILED', '날짜를 골라 주세요.'));
    await renderWithProviders(<NewEventScreen />);
    await fillTitle();
    await fireEvent.press(screen.getByRole('checkbox', { name: '화요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(within(await screen.findByRole('alert')).getByText('날짜를 골라 주세요.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('개인 일정 수정 (사용자 결정 2026-10-23)', () => {
  it('저장된 값을 채워 열고, 종류까지 바꿔 저장한다', async () => {
    mockParams.current = { id: '1' };
    api.listEvents.mockResolvedValue(page([weekly, once]));
    api.updateEvent.mockResolvedValue({ ...weekly, repeat: 'once' });
    await renderWithProviders(<EditEventScreen />);
    expect(await screen.findByDisplayValue('운영체제 수업')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: '월요일' })).toBeChecked();
    expect(screen.getByLabelText('시작 시각')).toHaveDisplayValue('10:00');
    await fireEvent.changeText(screen.getByLabelText('일정 이름'), '보강 수업');
    await fireEvent.press(screen.getByRole('tab', { name: '날짜 지정' }));
    await fireEvent.press(screen.getByRole('button', { name: /^날짜/ }));
    await fireEvent.press(await screen.findByRole('button', { name: '9월 29일 화요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '고르기 끝' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.updateEvent).toHaveBeenCalledWith(1, {
      title: '보강 수업', repeat: 'once', weekdays: [], date: '2026-09-29', dates: ['2026-09-29'], untilDate: null, startTime: '10:00', endTime: '12:00', startDate: null, endDate: null,
    });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('이어진 일정은 이어진 일정으로 열린다', async () => {
    mockParams.current = { id: '4' };
    api.listEvents.mockResolvedValue(page([span]));
    await renderWithProviders(<EditEventScreen />);
    expect(await screen.findByDisplayValue('MT')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: '이어진 일정' })).toBeSelected();
    expect(screen.getByRole('button', { name: /^끝나는 날짜, 10월 26일/ })).toBeOnTheScreen();
  });

  it('없는 일정이면 알려 준다', async () => {
    mockParams.current = { id: '99' };
    api.listEvents.mockResolvedValue(page([weekly]));
    await renderWithProviders(<EditEventScreen />);
    expect(await screen.findByText('일정을 찾을 수 없어요.')).toBeOnTheScreen();
  });
});
