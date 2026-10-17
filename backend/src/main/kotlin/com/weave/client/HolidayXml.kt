package com.weave.client

import org.w3c.dom.Element
import java.io.ByteArrayInputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory

/** 공공데이터포털 특일 정보(공휴일) 응답 XML 읽기 — 쉬는 날(isHoliday=Y)만. 외부 개체(XXE)·DOCTYPE은 막는다 */
object HolidayXml {
    private val DATE = DateTimeFormatter.BASIC_ISO_DATE

    fun parse(xml: String): List<HolidayItem> {
        val factory = DocumentBuilderFactory.newInstance().apply {
            setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
            setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)
            isExpandEntityReferences = false
            isXIncludeAware = false
        }
        val doc = factory.newDocumentBuilder().parse(ByteArrayInputStream(xml.toByteArray(Charsets.UTF_8)))
        val code = doc.getElementsByTagName("resultCode").item(0)?.textContent?.trim()
        check(code == "00") { "공휴일 API 오류: $code ${doc.getElementsByTagName("resultMsg").item(0)?.textContent?.trim().orEmpty()}" }
        val items = doc.getElementsByTagName("item")
        return (0 until items.length).map { items.item(it) as Element }
            .filter { it.text("isHoliday") == "Y" }
            .map { HolidayItem(LocalDate.parse(it.text("locdate"), DATE), it.text("dateName")) }
    }

    private fun Element.text(tag: String) = getElementsByTagName(tag).item(0)?.textContent?.trim().orEmpty()
}
