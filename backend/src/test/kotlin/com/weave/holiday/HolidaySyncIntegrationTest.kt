package com.weave.holiday

import com.weave.TestcontainersConfiguration
import com.weave.client.HolidayClient
import com.weave.client.HolidayItem
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
import java.time.LocalDate

/** 실제 공공데이터 API 대신 2031년 공휴일 두 개(이름은 부를 때마다 바뀔 수 있게) */
@TestConfiguration(proxyBeanMethods = false)
class FakeHolidayClientConfiguration {
    @Bean
    @Primary
    fun fakeHolidayClient(): HolidayClient = object : HolidayClient {
        var calls = 0
        override fun fetch(year: Int): List<HolidayItem> {
            calls++
            return if (year == 2031) listOf(HolidayItem(LocalDate.of(2031, 1, 1), "1월${calls}"), HolidayItem(LocalDate.of(2031, 3, 1), "삼일절")) else emptyList()
        }
    }
}

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class, FakeHolidayClientConfiguration::class)
@ApplyExtension(SpringExtension::class)
class HolidaySyncIntegrationTest(private val sync: HolidaySync, private val repository: HolidayRepository) : FunSpec({
    val year = LocalDate.of(2031, 1, 1) to LocalDate.of(2031, 12, 31)

    test("한 해 공휴일을 받아 저장하고, 다시 받아도 늘지 않고 이름만 맞춘다") {
        sync.syncYear(2031) shouldBe 2
        sync.syncYear(2031) shouldBe 2
        val saved = repository.findByDateBetween(year.first, year.second).sortedBy { it.date }
        saved.map { it.date.toString() } shouldBe listOf("2031-01-01", "2031-03-01")
        saved.first().name shouldBe "1월2"
    }

    test("API에서 빠진 날(취소된 임시공휴일 등)은 지운다") {
        sync.syncYear(2031)
        repository.save(com.weave.holiday.domain.Holiday(LocalDate.of(2031, 5, 5), "취소될 날"))
        sync.syncYear(2031)
        repository.findByDateBetween(year.first, year.second).map { it.date.toString() }.sorted() shouldBe listOf("2031-01-01", "2031-03-01")
    }
})
