package com.weave.activity.service

import com.weave.activity.domain.ActivityType
import com.weave.activity.dto.AppEventsRequest
import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.Clock
import java.time.Duration

/** 앱이 보낸 사용 기록(앱 열기·화면 보기·위젯 갱신)을 남긴다 */
@Service
class ActivityService(
    private val activityRecorder: ActivityRecorder,
    private val objectMapper: ObjectMapper,
    private val clock: Clock,
) {
    @Transactional
    fun recordAppEvents(userId: Long, request: AppEventsRequest) {
        val now = clock.instant()
        val events = request.events.map { e ->
            val type = ActivityType.entries.firstOrNull { it.name == e.type && it.app }
                ?: throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "앱에서 보낼 수 없는 기록 종류예요.")
            if (objectMapper.writeValueAsString(e.detail).length > MAX_DETAIL) throw ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "기록 내용이 너무 길어요.")
            // 앱 시계는 믿을 수 없다 — 미래거나 7일보다 오래되면 서버 시각
            val at = e.occurredAt?.takeIf { !it.isAfter(now.plus(Duration.ofMinutes(5))) && it.isAfter(now.minus(Duration.ofDays(7))) } ?: now
            Triple(type, at, e.detail)
        }
        events.forEach { (type, at, detail) -> activityRecorder.record(userId, type, detail = detail, source = ActivityRecorder.APP, occurredAt = at) }
    }

    companion object {
        const val MAX_DETAIL = 2000
    }
}
