package com.weave.event.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.event.domain.PersonalEvent
import com.weave.event.dto.CreatePersonalEventRequest
import com.weave.event.dto.PersonalEventResponse
import com.weave.event.repository.PersonalEventRepository
import com.weave.global.error.ApiException
import com.weave.global.time.TodayProvider
import com.weave.global.web.PageResponse
import com.weave.schedule.service.OverdueRoller
import com.weave.schedule.service.Replanner
import com.weave.user.service.UserService
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalTime

/**
 * 개인 일정 — 추가·수정·삭제(사용자 결정 2026-10-17, 수정은 2026-10-23).
 * 추가·수정·삭제하면 밀린 작업까지 바로 다시 배치한다(2026-10-23 — 설정에서 가용 시간을 바꿀 때와 같게, 지연 표시는 남는다).
 */
@Service
class PersonalEventService(
    private val repository: PersonalEventRepository,
    private val activityRecorder: ActivityRecorder,
    private val userService: UserService,
    private val overdueRoller: OverdueRoller,
    private val replanner: Replanner,
    private val todayProvider: TodayProvider,
) {
    @Transactional(readOnly = true)
    fun list(userId: Long, page: Int, size: Int): PageResponse<PersonalEventResponse> {
        val result = repository.findByUserIdOrderById(userId, PageRequest.of(page, size))
        return PageResponse.of(result, result.content.map(PersonalEventResponse::of))
    }

    @Transactional
    fun create(userId: Long, request: CreatePersonalEventRequest): PersonalEventResponse {
        val v = validate(request)
        val event = repository.save(
            PersonalEvent(
                userId, v.title, request.repeat, PersonalEvent.weekdayText(v.weekdays), v.dates.minOrNull(), v.start, v.end,
                v.startDate, v.endDate, PersonalEvent.dateText(v.dates), v.untilDate,
            ),
        )
        activityRecorder.record(userId, ActivityType.EVENT_ADDED, detail = detail(event))
        replan(userId, "event")
        return PersonalEventResponse.of(event)
    }

    /** 모든 칸을 바꾼다 — 종류까지. 남의 일정이거나 없으면 404 */
    @Transactional
    fun update(userId: Long, id: Long, request: CreatePersonalEventRequest): PersonalEventResponse {
        val event = find(userId, id)
        val v = validate(request)
        val before = detail(event)
        event.update(v.title, request.repeat, v.weekdays, v.dates, v.start, v.end, v.startDate, v.endDate, v.untilDate)
        repository.save(event)
        activityRecorder.record(userId, ActivityType.EVENT_UPDATED, detail = mapOf("from" to before, "to" to detail(event)))
        replan(userId, "event")
        return PersonalEventResponse.of(event)
    }

    /** 남의 일정이거나 없으면 404(있는지조차 알려주지 않는다, IDOR §3-6) */
    @Transactional
    fun delete(userId: Long, id: Long) {
        val event = find(userId, id)
        activityRecorder.record(userId, ActivityType.EVENT_DELETED, detail = mapOf("title" to event.title))
        repository.delete(event)
        repository.flush()
        replan(userId, "event")
    }

    private fun find(userId: Long, id: Long) =
        repository.findByIdAndUserId(id, userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "일정을 찾을 수 없어요.")

    private fun replan(userId: Long, by: String) {
        val user = userService.find(userId)
        overdueRoller.roll(userId)
        val placements = replanner.replan(user, todayProvider.today(), includeDelayed = true)
        activityRecorder.record(userId, ActivityType.SCHEDULE_REPLANNED, detail = mapOf("taskCount" to placements.size, "lateCount" to placements.values.count { it.late }, "by" to by))
    }

    private data class Valid(
        val title: String, val weekdays: List<Int>, val dates: List<LocalDate>, val start: LocalTime, val end: LocalTime,
        val startDate: LocalDate?, val endDate: LocalDate?, val untilDate: LocalDate?,
    )

    /** 종류별 확인 — 매주 반복 / 날짜 지정 / 이어진 일정(사용자 결정 2026-10-23). 쓰지 않는 칸은 비운다 */
    private fun validate(request: CreatePersonalEventRequest): Valid {
        val start = LocalTime.parse(request.startTime)
        val end = LocalTime.parse(request.endTime)
        val title = request.title.trim()
        if (request.repeat == PersonalEvent.WEEKLY) {
            // 끝이 시작보다 이르면 자정을 넘겨 다음 날까지(사용자 결정 2026-10-18) — 같으면 길이가 없다
            if (end == start) badRequest("끝나는 시각이 시작 시각과 같아요.")
            if (request.weekdays.isEmpty() || request.weekdays.any { it !in 1..7 }) badRequest("반복할 요일을 하나 이상 골라 주세요.")
            if (request.startDate != null && request.endDate != null && request.endDate.isBefore(request.startDate)) badRequest("기간 끝이 시작보다 앞일 수 없어요.")
            return Valid(title, request.weekdays, emptyList(), start, end, request.startDate, request.endDate, null)
        }
        val dates = request.dates.ifEmpty { listOfNotNull(request.date) }.distinct()
        if (dates.isEmpty()) badRequest("날짜를 골라 주세요.")
        if (request.untilDate == null) {
            if (end == start) badRequest("끝나는 시각이 시작 시각과 같아요.")
            if (dates.size > MAX_DATES) badRequest("날짜는 ${MAX_DATES}개까지 고를 수 있어요.")
            return Valid(title, emptyList(), dates, start, end, null, null, null)
        }
        // 이어진 일정: 시작 날짜 하나 + 끝 날짜
        if (dates.size != 1) badRequest("이어진 일정은 시작 날짜를 하나만 골라 주세요.")
        val from = dates.single().atTime(start)
        val until = request.untilDate.atTime(end)
        if (!until.isAfter(from)) badRequest("끝나는 날짜·시각이 시작보다 뒤여야 해요.")
        if (request.untilDate.isAfter(dates.single().plusDays(MAX_SPAN_DAYS))) badRequest("이어진 일정은 ${MAX_SPAN_DAYS}일까지 넣을 수 있어요.")
        return Valid(title, emptyList(), dates, start, end, null, null, request.untilDate)
    }

    private fun detail(e: PersonalEvent) = mapOf(
        "title" to e.title, "repeat" to e.repeat, "weekdays" to e.weekdays, "dates" to e.dates.map(LocalDate::toString), "untilDate" to e.untilDate?.toString(),
        "startTime" to e.startTime.format(PersonalEventResponse.HHMM), "endTime" to e.endTime.format(PersonalEventResponse.HHMM),
    )

    private fun badRequest(message: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message)

    companion object {
        /** 날짜 지정 일정의 날짜 수 상한 — event_dates 칸(1200자)에 들어가는 만큼 */
        const val MAX_DATES = 100

        /** 이어진 일정의 길이 상한 — 배치가 내다보는 기간(1년)과 같다 */
        const val MAX_SPAN_DAYS = 366L
    }
}
