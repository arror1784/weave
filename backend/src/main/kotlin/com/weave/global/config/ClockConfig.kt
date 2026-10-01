package com.weave.global.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock
import java.time.ZoneId

/**
 * 서버의 '오늘'은 한국 시간 고정(사용자 결정). 날짜 계산은 LocalDate.now(clock)으로만 해서 테스트에서 시계를 바꿀 수 있게 한다.
 */
@Configuration
class ClockConfig {
    @Bean
    fun clock(): Clock = Clock.system(SEOUL)

    companion object {
        val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
    }
}
