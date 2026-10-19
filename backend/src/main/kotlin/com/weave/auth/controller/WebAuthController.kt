package com.weave.auth.controller

import com.weave.auth.dto.LoginRequest
import com.weave.auth.dto.WebTokenResponse
import com.weave.auth.service.AuthService
import com.weave.global.config.WeaveProperties
import com.weave.global.error.ApiException
import com.weave.global.ratelimit.RateLimitPolicy
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Duration

/**
 * PC 웹 로그인(사용자 결정 2026-10-17) — 리프레시 토큰은 HttpOnly·Secure·SameSite=Strict 쿠키로만 주고받고,
 * 액세스 토큰은 본문으로 준다(웹은 메모리에만 둔다). CSRF는 SecurityConfig.webAuthFilterChain이 막는다.
 * 앱은 지금처럼 AuthController(본문으로 두 토큰)를 쓴다.
 */
@RestController
@RequestMapping("/api/v1/auth/web")
class WebAuthController(private val authService: AuthService, private val properties: WeaveProperties, private val rateLimit: RateLimitPolicy) {

    /** 웹이 처음 열릴 때 부른다 — 응답에 XSRF-TOKEN 쿠키가 심긴다 */
    @GetMapping("/csrf")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("permitAll()")
    fun csrf() = Unit

    @PostMapping("/login")
    @PreAuthorize("permitAll()")
    fun login(@Valid @RequestBody request: LoginRequest, http: HttpServletRequest, response: HttpServletResponse): WebTokenResponse {
        rateLimit.login(http.remoteAddr, request.email)
        val tokens = authService.login(request, client = CLIENT)
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken, properties.jwt.refreshTokenTtl))
        return WebTokenResponse.of(tokens)
    }

    @PostMapping("/refresh")
    @PreAuthorize("permitAll()")
    fun refresh(@CookieValue(COOKIE, required = false) refreshToken: String?, http: HttpServletRequest, response: HttpServletResponse): WebTokenResponse {
        rateLimit.refresh(http.remoteAddr)
        if (refreshToken.isNullOrBlank()) throw ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "다시 로그인해 주세요.")
        val tokens = authService.refresh(refreshToken)
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken, properties.jwt.refreshTokenTtl))
        return WebTokenResponse.of(tokens)
    }

    /** 액세스 토큰이 만료돼도 로그아웃할 수 있게 쿠키만으로 처리한다 */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("permitAll()")
    fun logout(@CookieValue(COOKIE, required = false) refreshToken: String?, response: HttpServletResponse) {
        if (!refreshToken.isNullOrBlank()) authService.logoutByToken(refreshToken, client = CLIENT)
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO))
    }

    private fun refreshCookie(value: String, maxAge: Duration) =
        ResponseCookie.from(COOKIE, value)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/api/v1/auth/web")
            .maxAge(maxAge)
            .build()
            .toString()

    companion object {
        const val COOKIE = "weave_refresh"
        private const val CLIENT = "web"
    }
}
