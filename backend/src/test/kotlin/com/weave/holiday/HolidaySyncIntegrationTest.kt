package com.weave.holiday

import com.weave.TestcontainersConfiguration
import com.weave.client.HolidayClient
import com.weave.client.HolidayItem
import com.weave.holiday.domain.Holiday
import com.weave.holiday.repository.HolidayRepository
import com.weave.holiday.service.HolidaySync
import io.kotest.core.extensions.ApplyExtension
import io.kotest.core.spec.style.FunSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.TestPropertySource
import java.time.LocalDate

/** 실제 공공데이터 API 대신 — 해마다 돌려줄 공휴일을 테스트가 정한다 */
object FakeHolidays {
    val byYear = mutableMapOf<Int, List<HolidayItem>>()
}

@TestConfiguration(proxyBeanMethods = false)
class FakeHolidayClientConfiguration {
    @Bean
    @Primary
    fun fakeHolidayClient(): HolidayClient = object : HolidayClient {
        override fun fetch(year: Int): List<HolidayItem> = FakeHolidays.byYear[year].orEmpty()
    }
}

@SpringBootTest
@ActiveProfiles("test")
// 키가 있어야 정기 동기화(monthly)가 돈다 — 가짜 클라이언트라 실제 API는 부르지 않는다
@TestPropertySource(properties = ["weave.holiday.api-key=fake-key"])
@Import(TestcontainersConfiguration::class, FakeHolidayClientConfiguration::class)
@ApplyExtension(SpringExtension::class)
class HolidaySyncIntegrationTest(private val sync: HolidaySync, private val repository: HolidayRepository) : FunSpec({
    val year = LocalDate.of(2031, 1, 1) to LocalDate.of(2031, 12, 31)
    fun saved() = repository.findByDateBetween(year.first, year.second).sortedBy { it.date }.map { it.date.toString() to it.name }

    test("한 해 공휴일을 받아 저장하고, 다시 받아도 늘지 않고 이름만 맞춘다") {
        FakeHolidays.byYear[2031] = listOf(HolidayItem(LocalDate.of(2031, 1, 1), "1월1일"), HolidayItem(LocalDate.of(2031, 3, 1), "삼일절"))
        sync.syncYear(2031) shouldBe 2
        FakeHolidays.byYear[2031] = listOf(HolidayItem(LocalDate.of(2031, 1, 1), "새해"), HolidayItem(LocalDate.of(2031, 3, 1), "삼일절"))
        sync.syncYear(2031) shouldBe 2
        saved() shouldBe listOf("2031-01-01" to "새해", "2031-03-01" to "삼일절")
    }

    test("API에서 빠진 날(취소된 임시공휴일 등)은 지운다") {
        FakeHolidays.byYear[2031] = listOf(HolidayItem(LocalDate.of(2031, 1, 1), "새해"))
        repository.save(Holiday(LocalDate.of(2031, 5, 5), "취소될 날"))
        sync.syncYear(2031)
        saved() shouldBe listOf("2031-01-01" to "새해")
    }

    test("정기 동기화(매달·서버 시작)도 이미 있는 날의 이름을 바로잡는다 — 깨진 이름이 남았던 버그(2026-10-17)") {
        val thisYear = LocalDate.now().year
        val day = LocalDate.of(thisYear, 12, 30)
        repository.save(Holiday(day, "íê¸ë"))
        FakeHolidays.byYear[thisYear] = listOf(HolidayItem(day, "한글날"))
        sync.monthly()
        repository.findByDateBetween(day, day).single().name shouldBe "한글날"
        FakeHolidays.byYear.remove(thisYear)
        sync.monthly()
    }
})
