package com.weave.holiday

import com.weave.client.HolidayItem
import com.weave.client.HolidayXml
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDate

class HolidayXmlTest : FunSpec({
    test("공휴일 응답(XML)에서 쉬는 날(isHoliday=Y)만 날짜·이름으로 읽는다") {
        val xml = """<?xml version="1.0" encoding="UTF-8"?>
            <response><header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
            <body><items>
              <item><dateKind>01</dateKind><dateName>개천절</dateName><isHoliday>Y</isHoliday><locdate>20261003</locdate><seq>1</seq></item>
              <item><dateKind>01</dateKind><dateName>대체공휴일(개천절)</dateName><isHoliday>Y</isHoliday><locdate>20261005</locdate><seq>1</seq></item>
              <item><dateKind>02</dateKind><dateName>어떤 기념일</dateName><isHoliday>N</isHoliday><locdate>20261007</locdate><seq>1</seq></item>
            </items><numOfRows>100</numOfRows><pageNo>1</pageNo><totalCount>3</totalCount></body></response>"""
        HolidayXml.parse(xml) shouldBe listOf(
            HolidayItem(LocalDate.parse("2026-10-03"), "개천절"),
            HolidayItem(LocalDate.parse("2026-10-05"), "대체공휴일(개천절)"),
        )
    }

    test("공휴일이 없는 응답(빈 items)은 빈 목록") {
        HolidayXml.parse("""<response><header><resultCode>00</resultCode></header><body><items/><totalCount>0</totalCount></body></response>""") shouldBe emptyList()
    }

    test("오류 응답(resultCode가 00이 아님)이면 예외 — 잘못된 키 등") {
        shouldThrow<IllegalStateException> {
            HolidayXml.parse("""<response><header><resultCode>30</resultCode><resultMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMsg></header></response>""")
        }
    }

    test("외부 개체(XXE)를 읽지 않는다") {
        val evil = """<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><response><header><resultCode>00</resultCode></header><body><items><item><dateName>&x;</dateName><isHoliday>Y</isHoliday><locdate>20261003</locdate></item></items></body></response>"""
        shouldThrow<Exception> { HolidayXml.parse(evil) }
    }
})
