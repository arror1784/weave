package com.weave.client

import java.time.LocalDate

data class HolidayItem(val date: LocalDate, val name: String)

/** 공휴일 목록 — 외부 API(공공데이터포털) */
interface HolidayClient {
    fun fetch(year: Int): List<HolidayItem>
}
