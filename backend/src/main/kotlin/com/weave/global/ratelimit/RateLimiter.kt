package com.weave.global.ratelimit

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * 요청 횟수 제한(§3-14, 사용자 결정 2026-10-19) — (종류, 키)마다 고정 시간 창 안의 횟수를 센다.
 * 서버 메모리에 둔다: 서버가 1대(Lightsail)라 충분하고, 재시작하면 처음부터 센다. 서버를 늘리면 공유 저장소로 옮긴다.
 */
@Component
class RateLimiter(private val clock: Clock) {
    private class Window(val start: Instant, val length: Duration, var count: Int)

    private val windows = ConcurrentHashMap<String, Window>()

    /** 한 번 센다 — 이번이 한도를 넘으면 RateLimitExceededException(남은 시간) */
    fun hit(bucket: String, key: String, limit: Int, window: Duration) {
        val now = clock.instant()
        var exceeded: Duration? = null
        windows.compute("$bucket:$key") { _, w ->
            val current = if (w == null || !now.isBefore(w.start.plus(w.length))) Window(now, window, 0) else w
            if (current.count >= limit) exceeded = Duration.between(now, current.start.plus(current.length)) else current.count++
            current
        }
        exceeded?.let { throw RateLimitExceededException(it) }
    }

    /** 끝난 시간 창을 지운다 — 메모리가 계속 늘지 않게 10분마다 */
    @Scheduled(fixedDelay = 600_000)
    fun cleanUp() {
        val now = clock.instant()
        windows.entries.removeIf { !now.isBefore(it.value.start.plus(it.value.length)) }
    }

    fun size(): Int = windows.size
}
