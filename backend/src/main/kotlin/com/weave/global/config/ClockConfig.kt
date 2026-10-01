package com.weave.global.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock
import java.time.ZoneId

/**
 * 서버 시계는 한국 시간 고정(사용자 결정). '오늘' 날짜는 TodayProvider로만 구한다(하루가 아침 6시에 바뀐다).
 */
@Configuration
class ClockConfig {
    @Bean
    fun clock(): Clock = Clock.system(SEOUL)

    companion object {
        val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
    }
}
