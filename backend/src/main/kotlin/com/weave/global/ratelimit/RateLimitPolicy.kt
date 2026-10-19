package com.weave.global.ratelimit

import com.weave.global.config.WeaveProperties
import org.springframework.stereotype.Component
import java.time.Duration

/** 어디에 얼마나 — 사용자 결정 2026-10-19. 숫자는 application.yml weave.rate-limit (테스트 프로필은 끈다) */
@Component
class RateLimitPolicy(private val limiter: RateLimiter, properties: WeaveProperties) {
    private val p = properties.rateLimit

    /** 로그인(앱·웹 함께): 접속 IP당, 그리고 이메일당 — 여러 IP로 한 계정을 노리는 것까지 막는다 */
    fun login(ip: String, email: String) {
        if (!p.enabled) return
        limiter.hit("login-ip", ip, p.loginPerIpPerMinute, Duration.ofMinutes(1))
        limiter.hit("login-email", email.trim().lowercase(), p.loginPerEmailPer15Minutes, Duration.ofMinutes(15))
    }

    fun signup(ip: String) {
        if (p.enabled) limiter.hit("signup-ip", ip, p.signupPerIpPerHour, Duration.ofHours(1))
    }

    fun refresh(ip: String) {
        if (p.enabled) limiter.hit("refresh-ip", ip, p.refreshPerIpPerMinute, Duration.ofMinutes(1))
    }

    /** AI 챗봇: 사용자당 한 시간·하루 — 호출마다 비용이 든다 */
    fun chat(userId: Long) {
        if (!p.enabled) return
        limiter.hit("chat-hour", userId.toString(), p.chatPerUserPerHour, Duration.ofHours(1))
        limiter.hit("chat-day", userId.toString(), p.chatPerUserPerDay, Duration.ofDays(1))
    }
}
