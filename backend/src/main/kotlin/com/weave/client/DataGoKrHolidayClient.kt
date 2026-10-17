package com.weave.client

import com.weave.global.config.WeaveProperties
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/**
 * 공공데이터포털 "한국천문연구원_특일 정보" — 공휴일 조회(getRestDeInfo). 키는 .env의 HOLIDAY_API_KEY(디코딩된 키).
 * 한 해 공휴일은 20개 안팎이라 한 번(numOfRows=100)에 받는다.
 */
@Component
class DataGoKrHolidayClient(private val properties: WeaveProperties, builder: RestClient.Builder) : HolidayClient {
    /** 서버에서는 기본 빌더 — 테스트는 가짜 서버(MockRestServiceServer)를 묶은 빌더를 넘긴다 */
    @Autowired
    constructor(properties: WeaveProperties) : this(properties, RestClient.builder())

    private val rest = builder.baseUrl("https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService").build()

    override fun fetch(year: Int): List<HolidayItem> {
        val key = properties.holiday.apiKey
        check(key.isNotBlank()) { "HOLIDAY_API_KEY가 없다" }
        val xml = rest.get()
            .uri { it.path("/getRestDeInfo").queryParam("solYear", year).queryParam("numOfRows", 100).queryParam("pageNo", 1).queryParam("ServiceKey", key).build() }
            .retrieve()
            // 문자열로 받지 않는다 — 응답 헤더에 charset이 없어 ISO-8859-1로 읽혀 한글 이름이 깨졌다(2026-10-17)
            .body(ByteArray::class.java)
            ?: ByteArray(0)
        return HolidayXml.parse(xml)
    }
}
