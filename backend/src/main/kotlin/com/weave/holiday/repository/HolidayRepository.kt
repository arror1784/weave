package com.weave.holiday.repository

import com.weave.holiday.domain.Holiday
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface HolidayRepository : JpaRepository<Holiday, Long> {
    fun findByDateBetween(from: LocalDate, to: LocalDate): List<Holiday>

    fun existsByDateBetween(from: LocalDate, to: LocalDate): Boolean
}
