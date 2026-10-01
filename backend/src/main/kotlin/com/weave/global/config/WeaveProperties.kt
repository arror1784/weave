package com.weave.global.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** application.yml의 weave.* 설정. 비밀값은 .env에서 주입한다(§3-1). */
@ConfigurationProperties("weave")
data class WeaveProperties(
    val jwt: Jwt,
    val rateLimit: RateLimit = RateLimit(),
    val storage: Storage = Storage(),
    val anthropic: Anthropic = Anthropic(),
) {
    data class Jwt(
        /** HS256 서명 키 — 32바이트 이상 */
        val secret: String,
        val accessTokenTtl: Duration = Duration.ofMinutes(15),
        /** 사용자 결정: 로그인 30일 유지 (리프레시 토큰은 쓸 때마다 교체) */
        val refreshTokenTtl: Duration = Duration.ofDays(30),
    )

    data class RateLimit(
        val loginPerEmail: Int = 10,
        val loginPerIp: Int = 50,
        val loginWindow: Duration = Duration.ofMinutes(5),
        val signupPerIp: Int = 10,
        val signupWindow: Duration = Duration.ofHours(1),
        val refreshPerIp: Int = 60,
        val refreshWindow: Duration = Duration.ofMinutes(1),
        /** AI 호출 비용 보호 — 사용자당 */
        val aiPerUser: Int = 30,
        val aiWindow: Duration = Duration.ofHours(1),
    )

    data class Storage(
        /** 첨부 파일 저장 폴더 (사용자 결정: 로컬 디스크) */
        val root: String = "uploads",
    )

    data class Anthropic(
        val apiKey: String = "",
        /** 사용자 결정: Claude Sonnet 5.5 */
        val model: String = "claude-sonnet-5-5",
    )
}
