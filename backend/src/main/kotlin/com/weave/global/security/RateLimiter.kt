package com.weave.global.security

import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * 요청 횟수 제한(§3-14) — 고정 창 방식, 서버 메모리에 둔다(서버가 1대인 지금 기준).
 * 서버를 여러 대로 늘리면 Redis 같은 공유 저장소로 옮긴다.
 */
@Component
class RateLimiter(private val clock: Clock) {
    private data class Window(val start: Instant, val count: Int)

    private val windows = ConcurrentHashMap<String, Window>()

    /** key로 window 동안 limit번을 넘으면 429 */
    fun check(key: String, limit: Int, window: Duration) {
        val now = clock.instant()
        val updated = windows.compute(key) { _, w ->
            if (w == null || !now.isBefore(w.start.plus(window))) Window(now, 1) else w.copy(count = w.count + 1)
        }!!
        if (updated.count > limit) throw ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.")
    }
}
