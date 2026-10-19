package com.weave.global.ratelimit

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId

/** 요청 횟수 제한(§3-14, 사용자 결정 2026-10-19) — 정해진 시간 창 안에서 횟수를 센다 */
class RateLimiterTest : FunSpec({
    class MovingClock(var now: Instant) : Clock() {
        override fun getZone(): ZoneId = ZoneId.of("Asia/Seoul")
        override fun withZone(zone: ZoneId?): Clock = this
        override fun instant(): Instant = now
    }

    test("한도까지는 통과하고 넘으면 남은 시간과 함께 거절한다") {
        val clock = MovingClock(Instant.parse("2026-10-19T00:00:00Z"))
        val limiter = RateLimiter(clock)
        repeat(3) { limiter.hit("login-ip", "1.2.3.4", 3, Duration.ofMinutes(1)) }
        clock.now = clock.now.plusSeconds(20)
        val e = shouldThrow<RateLimitExceededException> { limiter.hit("login-ip", "1.2.3.4", 3, Duration.ofMinutes(1)) }
        e.retryAfter shouldBe Duration.ofSeconds(40)
    }

    test("시간 창이 지나면 다시 센다") {
        val clock = MovingClock(Instant.parse("2026-10-19T00:00:00Z"))
        val limiter = RateLimiter(clock)
        repeat(2) { limiter.hit("signup-ip", "1.2.3.4", 2, Duration.ofHours(1)) }
        clock.now = clock.now.plus(Duration.ofHours(1))
        limiter.hit("signup-ip", "1.2.3.4", 2, Duration.ofHours(1))
    }

    test("종류(bucket)와 키가 다르면 따로 센다") {
        val limiter = RateLimiter(MovingClock(Instant.parse("2026-10-19T00:00:00Z")))
        limiter.hit("login-ip", "1.2.3.4", 1, Duration.ofMinutes(1))
        limiter.hit("login-ip", "5.6.7.8", 1, Duration.ofMinutes(1))
        limiter.hit("signup-ip", "1.2.3.4", 1, Duration.ofMinutes(1))
        shouldThrow<RateLimitExceededException> { limiter.hit("login-ip", "1.2.3.4", 1, Duration.ofMinutes(1)) }
    }

    test("지난 기록은 정리한다 — 메모리가 계속 늘지 않게") {
        val clock = MovingClock(Instant.parse("2026-10-19T00:00:00Z"))
        val limiter = RateLimiter(clock)
        limiter.hit("login-ip", "1.2.3.4", 5, Duration.ofMinutes(1))
        limiter.size() shouldBe 1
        clock.now = clock.now.plus(Duration.ofMinutes(2))
        limiter.cleanUp()
        limiter.size() shouldBe 0
    }
})
