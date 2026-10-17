package com.weave.holiday.service

import com.weave.client.HolidayClient
import com.weave.global.config.WeaveProperties
import com.weave.global.time.TodayProvider
import com.weave.holiday.domain.Holiday
import com.weave.holiday.repository.HolidayRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * 공휴일 목록을 공공데이터 API에서 받아 DB에 맞춘다(사용자 결정 2026-10-17). 임시공휴일·대체공휴일이 연중에 생길 수 있어
 * 서버가 뜰 때와 매달 1일 4시 30분에 올해·내년을 다시 받는다. 키(HOLIDAY_API_KEY)가 없으면 건너뛴다 — 그동안 공휴일은 없는 것으로 배치한다.
 * 받은 공휴일은 다음 배치(등록·다시 배치·설정 변경) 때부터 반영된다.
 */
@Service
class HolidaySync(
    private val client: HolidayClient,
    private val repository: HolidayRepository,
    private val properties: WeaveProperties,
    private val todayProvider: TodayProvider,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** 한 해를 API와 같게 맞춘다 — 반환: 그해 공휴일 수 */
    @Transactional
    fun syncYear(year: Int): Int {
        val fetched = client.fetch(year).associateBy { it.date }
        val existing = repository.findByDateBetween(LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31))
        existing.filter { it.date !in fetched }.forEach(repository::delete)
        val byDate = existing.associateBy { it.date }
        fetched.values.forEach { item ->
            val holiday = byDate[item.date]
            // 명시적으로 저장한다 — refresh()가 같은 클래스의 syncYear()를 부르면 @Transactional이 걸리지 않아
            // 바꾼 이름이 반영되지 않았다(깨진 공휴일 이름이 남은 버그, 2026-10-17)
            when {
                holiday == null -> repository.save(Holiday(item.date, item.name.take(100)))
                holiday.name != item.name.take(100) -> repository.save(holiday.also { it.name = item.name.take(100) })
            }
        }
        return fetched.size
    }

    @EventListener(ApplicationReadyEvent::class)
    fun onStartup() = refresh()

    @Scheduled(cron = "0 30 4 1 * *", zone = "Asia/Seoul")
    fun monthly() = refresh()

    private fun refresh() {
        if (properties.holiday.apiKey.isBlank()) {
            log.warn("HOLIDAY_API_KEY가 없어 공휴일을 받지 않는다 — 공휴일 없이 배치한다")
            return
        }
        val year = todayProvider.today().year
        for (y in listOf(year, year + 1)) {
            // 실패해도 서버는 계속 뜬다 — 다음 달에 다시 받는다
            runCatching { syncYear(y) }
                .onSuccess { log.info("공휴일 {}년 {}개를 맞췄다", y, it) }
                .onFailure { log.warn("공휴일 {}년을 받지 못했다: {}", y, it.message) }
        }
    }
}
