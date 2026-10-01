package com.weave.global.time

import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class TodayProviderTest : FunSpec({
    val seoul = ZoneId.of("Asia/Seoul")
    fun at(time: String) = TodayProvider(Clock.fixed(ZonedDateTime.parse("2026-10-02T$time+09:00[Asia/Seoul]").toInstant(), seoul))

    test("하루의 마무리는 다음날 아침 6시 — 새벽 5시 59분까지는 전날이 '오늘'이다 (사용자 결정)") {
        at("05:59").today() shouldBe LocalDate.parse("2026-10-01")
        at("06:00").today() shouldBe LocalDate.parse("2026-10-02")
        at("23:59").today() shouldBe LocalDate.parse("2026-10-02")
    }
})
