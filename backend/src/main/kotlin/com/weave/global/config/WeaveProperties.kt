package com.weave.global.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** application.yml의 weave.* 설정. 비밀값은 .env에서 주입한다(§3-1). */
@ConfigurationProperties("weave")
data class WeaveProperties(
    val jwt: Jwt,
    val storage: Storage = Storage(),
    val anthropic: Anthropic = Anthropic(),
    val holiday: Holiday = Holiday(),
) {
    data class Holiday(
        /** 공공데이터포털 특일 정보 API 키(디코딩된 키) — 비어 있으면 공휴일을 받지 않는다 */
        val apiKey: String = "",
    )

    data class Jwt(
        /** HS256 서명 키 — 32바이트 이상 */
        val secret: String,
        val accessTokenTtl: Duration = Duration.ofMinutes(15),
        /** 사용자 결정: 로그인 30일 유지 (리프레시 토큰은 쓸 때마다 교체) */
        val refreshTokenTtl: Duration = Duration.ofDays(30),
    )

    data class Storage(
        /** 첨부 파일 저장 폴더 (사용자 결정: 로컬 디스크) */
        val root: String = "uploads",
    )

    data class Anthropic(
        val apiKey: String = "",
        /** 사용자 결정: Claude Sonnet 5.5 */
        val model: String = "claude-sonnet-5-5",
        /** 사용 기록의 비용 계산용 단가 (USD, 100만 토큰당) — 모델·가격이 바뀌면 application.yml에서 바꾼다 */
        val price: Price = Price(),
    )

    /** 기본값: Claude Sonnet 5.5 공식 단가(2026-09 기준) — 입력 $2 · 출력 $10 · 캐시 쓰기(5분) $2.5(입력의 1.25배) · 캐시 읽기 $0.2 */
    data class Price(
        val inputPerMtok: Double = 2.0,
        val outputPerMtok: Double = 10.0,
        val cacheWritePerMtok: Double = 2.5,
        val cacheReadPerMtok: Double = 0.2,
    ) {
        fun costUsd(input: Long, output: Long, cacheWrite: Long, cacheRead: Long): Double =
            Math.round((input * inputPerMtok + output * outputPerMtok + cacheWrite * cacheWritePerMtok + cacheRead * cacheReadPerMtok) / 1_000_000 * 1e8) / 1e8
    }
}
