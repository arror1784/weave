import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import * as eventsApi from '@/api/events';
import * as projectsApi from '@/api/projects';
import type { PersonalEvent } from '@/api/types';
import EventsScreen, { describeEvent } from '@/app/events/index';
import NewEventScreen from '@/app/events/new';
import { sampleSchedule } from '@/test-utils/fixtures';
import { renderWithProviders, TEST_TODAY } from '@/test-utils/render';
import { mockRouter, resetRouterMock } from '@/test-utils/router';

jest.mock('@/api/events');
jest.mock('@/api/projects');
const api = jest.mocked(eventsApi);
const projects = jest.mocked(projectsApi);

const weekly: PersonalEvent = { id: 1, title: '운영체제 수업', repeat: 'weekly', weekdays: [1, 3], date: null, startTime: '10:00', endTime: '12:00', startDate: null, endDate: null };
const once: PersonalEvent = { id: 2, title: '동아리 모임', repeat: 'once', weekdays: [], date: '2026-10-24', startTime: '18:00', endTime: '21:00', startDate: null, endDate: null };
const page = (items: PersonalEvent[]) => ({ items, page: 0, size: 100, totalElements: items.length, totalPages: 1 });

beforeEach(() => {
  resetRouterMock();
  jest.clearAllMocks();
  projects.getSchedule.mockResolvedValue(sampleSchedule(TEST_TODAY));
});

describe('개인 일정 목록 (사용자 결정 2026-10-17)', () => {
  it('반복은 요일·시각, 한 번은 날짜·시각으로 보여준다 — 다음 배치 때 반영된다고 알린다', async () => {
    api.listEvents.mockResolvedValue(page([weekly, once]));
    await renderWithProviders(<EventsScreen />);
    expect(await screen.findByText('운영체제 수업')).toBeOnTheScreen();
    expect(screen.getByText('매주 월·수 · 10:00~12:00')).toBeOnTheScreen();
    expect(screen.getByText('10월 24일 토요일 · 18:00~21:00')).toBeOnTheScreen();
    expect(describeEvent({ ...weekly, weekdays: [5], startTime: '22:00', endTime: '01:00' })).toBe('매주 금 · 22:00~다음 날 01:00');
    expect(screen.getByText(/다음 등록이나 "작업 다시 배치" 때 일정에 반영돼요/)).toBeOnTheScreen();
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
    expect(screen.getByLabelText('시작 시각, 10:00')).toBeOnTheScreen();
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByRole('button', { name: '끝나는 시각 30분 늦게' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith({ title: '운영체제 수업', repeat: 'weekly', weekdays: [1, 3], date: null, startTime: '10:00', endTime: '12:00', startDate: null, endDate: null });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('한 번: 날짜를 달력에서 고른다', async () => {
    api.createEvent.mockResolvedValue(once);
    await renderWithProviders(<NewEventScreen />);
    await fillTitle('동아리 모임');
    await fireEvent.press(screen.getByRole('tab', { name: '한 번' }));
    await fireEvent.press(screen.getByRole('button', { name: /^날짜/ }));
    // 달력은 오늘(테스트 9/30)이 있는 달부터 열린다
    await fireEvent.press(await screen.findByRole('button', { name: '9월 29일 화요일' }));
    await fireEvent.press(screen.getByRole('button', { name: '저장' }));
    expect(api.createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: '동아리 모임', repeat: 'once', date: '2026-09-29', weekdays: [] }));
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
    expect(screen.getByLabelText('끝나는 시각, 다음 날 01:00')).toBeOnTheScreen();
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
