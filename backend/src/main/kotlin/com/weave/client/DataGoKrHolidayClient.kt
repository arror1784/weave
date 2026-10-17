package com.weave.client

import com.weave.global.config.WeaveProperties
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * 공공데이터포털 "한국천문연구원_특일 정보" — 공휴일 조회(getRestDeInfo). 키는 .env의 HOLIDAY_API_KEY(디코딩된 키).
 * 한 해 공휴일은 20개 안팎이라 한 번(numOfRows=100)에 받는다.
 */
@Component
class DataGoKrHolidayClient(private val properties: WeaveProperties) : HolidayClient {
    private val rest = RestClient.create("https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService")

    override fun fetch(year: Int): List<HolidayItem> {
        val key = properties.holiday.apiKey
        check(key.isNotBlank()) { "HOLIDAY_API_KEY가 없다" }
        val xml = rest.get()
            .uri { it.path("/getRestDeInfo").queryParam("solYear", year).queryParam("numOfRows", 100).queryParam("pageNo", 1).queryParam("ServiceKey", key).build() }
            .retrieve()
            .body(String::class.java)
            .orEmpty()
        return HolidayXml.parse(xml)
    }
}
