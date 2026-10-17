package com.weave.event.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.service.ActivityRecorder
import com.weave.event.domain.PersonalEvent
import com.weave.event.dto.CreatePersonalEventRequest
import com.weave.event.dto.PersonalEventResponse
import com.weave.event.repository.PersonalEventRepository
import com.weave.global.error.ApiException
import com.weave.global.web.PageResponse
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalTime

/**
 * 개인 일정 — 추가·삭제(수정 없음, 사용자 결정 2026-10-17). 추가·삭제로는 다시 배치하지 않는다 — 다음 등록·다시 배치 때 반영.
 */
@Service
class PersonalEventService(
    private val repository: PersonalEventRepository,
    private val activityRecorder: ActivityRecorder,
) {
    @Transactional(readOnly = true)
    fun list(userId: Long, page: Int, size: Int): PageResponse<PersonalEventResponse> {
        val result = repository.findByUserIdOrderById(userId, PageRequest.of(page, size))
        return PageResponse.of(result, result.content.map(PersonalEventResponse::of))
    }

    @Transactional
    fun create(userId: Long, request: CreatePersonalEventRequest): PersonalEventResponse {
        val start = LocalTime.parse(request.startTime)
        val end = LocalTime.parse(request.endTime)
        if (!end.isAfter(start)) badRequest("끝나는 시각이 시작 시각보다 뒤여야 해요.")
        val weekly = request.repeat == PersonalEvent.WEEKLY
        if (weekly && (request.weekdays.isEmpty() || request.weekdays.any { it !in 1..7 })) badRequest("반복할 요일을 하나 이상 골라 주세요.")
        if (!weekly && request.date == null) badRequest("날짜를 골라 주세요.")
        if (weekly && request.startDate != null && request.endDate != null && request.endDate.isBefore(request.startDate)) badRequest("기간 끝이 시작보다 앞일 수 없어요.")
        val event = repository.save(
            PersonalEvent(
                userId, request.title.trim(), request.repeat,
                if (weekly) PersonalEvent.weekdayText(request.weekdays) else "",
                if (weekly) null else request.date, start, end,
                if (weekly) request.startDate else null, if (weekly) request.endDate else null,
            ),
        )
        activityRecorder.record(userId, ActivityType.EVENT_ADDED, detail = mapOf("title" to event.title, "repeat" to event.repeat, "weekdays" to event.weekdays, "date" to event.date?.toString(), "startTime" to request.startTime, "endTime" to request.endTime))
        return PersonalEventResponse.of(event)
    }

    /** 남의 일정이거나 없으면 404(있는지조차 알려주지 않는다, IDOR §3-6) */
    @Transactional
    fun delete(userId: Long, id: Long) {
        val event = repository.findByIdAndUserId(id, userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "일정을 찾을 수 없어요.")
        activityRecorder.record(userId, ActivityType.EVENT_DELETED, detail = mapOf("title" to event.title))
        repository.delete(event)
    }

    private fun badRequest(message: String): Nothing = throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message)
}
