package com.weave.global.time

import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 서버의 '오늘' — 한국 시간 기준이고, 하루의 마무리는 자정이 아니라 다음날 아침 6시다(사용자 결정 2026-10-01:
 * 새벽에 자주 작업해서 오늘 작업을 다음날 새벽에 할 수도 있다). 날짜 계산은 이것으로만 한다.
 */
@Component
class TodayProvider(private val clock: Clock) {
    fun today(): LocalDate = LocalDateTime.now(clock).minusHours(DAY_STARTS_AT_HOUR).toLocalDate()

    companion object {
        const val DAY_STARTS_AT_HOUR = 6L
    }
}
