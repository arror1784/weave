package com.weave.activity.service

import com.weave.activity.domain.ActivityLog
import com.weave.activity.domain.ActivityType
import com.weave.activity.repository.ActivityLogRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.Clock
import java.time.Instant

/**
 * 사용 기록을 남긴다(사용자 결정 2026-10-07). 부르는 쪽 트랜잭션에 함께 들어가므로, 본 작업이 실패해 되돌려지면 기록도 남지 않는다.
 * detail은 JSON으로 저장한다 — 값이 null인 항목은 뺀다.
 */
@Service
class ActivityRecorder(
    private val repository: ActivityLogRepository,
    private val objectMapper: ObjectMapper,
    private val clock: Clock,
) {
    @Transactional
    fun record(
        userId: Long,
        type: ActivityType,
        projectId: Long? = null,
        taskId: Long? = null,
        detail: Map<String, Any?> = emptyMap(),
        source: String = SERVER,
        occurredAt: Instant? = null,
    ) {
        repository.save(
            ActivityLog(userId, occurredAt ?: clock.instant(), type.name, projectId, taskId, objectMapper.writeValueAsString(detail.filterValues { it != null }), source),
        )
    }

    companion object {
        const val SERVER = "server"
        const val APP = "app"
    }
}
