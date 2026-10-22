import { request } from './client';
import { pageSchema, personalEventSchema, type PersonalEvent } from './types';

/** 개인 일정 추가 — 반복이면 weekdays(월 1 … 일 7)·기간, 한 번이면 date. 시각은 HH:mm */
export type NewPersonalEvent = Omit<PersonalEvent, 'id'>;

export const listEvents = (page = 0, size = 100) => request(`/api/v1/me/events?page=${page}&size=${size}`, pageSchema(personalEventSchema));

export const createEvent = (event: NewPersonalEvent) => request('/api/v1/me/events', personalEventSchema, { method: 'POST', body: event });

export const deleteEvent = (id: number) => request(`/api/v1/me/events/${id}`, null, { method: 'DELETE' });

/** 수정 — 추가와 같은 본문으로 모든 칸을 보낸다(종류까지, 사용자 결정 2026-10-23) */
export const updateEvent = (id: number, event: NewPersonalEvent) => request(`/api/v1/me/events/${id}`, personalEventSchema, { method: 'PATCH', body: event });
