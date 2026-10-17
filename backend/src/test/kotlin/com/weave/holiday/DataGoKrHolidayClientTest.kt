package com.weave.holiday

import com.weave.client.DataGoKrHolidayClient
import com.weave.client.HolidayItem
import com.weave.global.config.WeaveProperties
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import java.time.LocalDate

class DataGoKrHolidayClientTest : FunSpec({
    test("응답 헤더에 문자 인코딩이 없어도 XML(UTF-8)대로 읽어 한글 이름이 깨지지 않는다 — 실제 API가 그렇게 보냈다(2026-10-17)") {
        val builder = RestClient.builder()
        val server = MockRestServiceServer.bindTo(builder).build()
        val xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header><body><items><item><dateKind>01</dateKind><dateName>한글날</dateName><isHoliday>Y</isHoliday><locdate>20261009</locdate><seq>1</seq></item></items></body></response>"""
        server.expect(method(HttpMethod.GET))
            .andExpect(queryParam("solYear", "2026"))
            .andRespond(withSuccess(xml.toByteArray(Charsets.UTF_8), MediaType.parseMediaType("text/xml")))
        val client = DataGoKrHolidayClient(WeaveProperties(WeaveProperties.Jwt("x"), holiday = WeaveProperties.Holiday("key")), builder)
        client.fetch(2026) shouldBe listOf(HolidayItem(LocalDate.parse("2026-10-09"), "한글날"))
        server.verify()
    }
})
