package com.weave.global.config

import org.springframework.context.annotation.Bean
import org.springframework.core.annotation.Order
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher

/**
 * 기본 거부 + 무상태 토큰 인증 (§3.1-4, §4-7).
 * - @EnableMethodSecurity가 없으면 @PreAuthorize가 에러 없이 무시된다 — 지우지 않는다.
 * - 인가는 @PreAuthorize로만. 여기엔 로그인 없이 열어야 하는 "공개 목록"만 둔다.
 * - 앱 API는 Bearer 헤더로만 인증하므로 CSRF 보호를 끈다.
 * - PC 웹 로그인(사용자 결정 2026-10-17)은 리프레시 토큰을 쿠키로 주고받으므로, 그 경로(WEB_AUTH)만 따로 체인을 두고 CSRF를 켠다
 *   (XSRF-TOKEN 쿠키 + X-XSRF-TOKEN 헤더). 다른 API에 쿠키 인증을 추가하면 거기도 CSRF를 켠다.
 * - 액세스 토큰은 서버가 발급한 JWT(JwtConfig). 토큰의 sub가 사용자 id다.
 */
@Configuration
@EnableMethodSecurity
class SecurityConfig {

    /** 웹 인증(쿠키) 전용 — 이 경로에만 CSRF. 응답에 XSRF-TOKEN 쿠키를 심는 것도 여기서만 한다(앱 API 응답엔 쿠키를 붙이지 않는다) */
    @Bean
    @Order(1)
    fun webAuthFilterChain(http: HttpSecurity): SecurityFilterChain {
        val matcher = PathPatternRequestMatcher.withDefaults()
        http
            .securityMatcher(matcher.matcher(WEB_AUTH))
            .csrf {
                it.spa()
                it.requireCsrfProtectionMatcher(matcher.matcher(HttpMethod.POST, WEB_AUTH))
            }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { it.anyRequest().permitAll() }
        return http.build()
    }

    @Bean
    @Order(2)
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            // 로그인 방식을 모두 끄면 기본 응답이 403이 된다 — 토큰 없음은 401로 알려 앱이 토큰 갱신을 시도하게 한다
            .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
            .oauth2ResourceServer { it.jwt { } }
            .authorizeHttpRequests {
                it.requestMatchers(*PUBLIC_PATHS).permitAll()
                it.anyRequest().authenticated()
            }
        return http.build()
    }

    companion object {
        /** 웹 로그인·갱신·로그아웃·CSRF 토큰 — 쿠키를 쓰는 경로 */
        const val WEB_AUTH = "/api/v1/auth/web/**"

        private val PUBLIC_PATHS = arrayOf(
            "/actuator/health",
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs/**",
            "/error",
            // 토큰이 없을 때 쓰는 인증 API (로그아웃은 토큰 필요)
            "/api/v1/auth/signup",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            // 개발용 로그인 — 컨트롤러가 @Profile("local")에만 있어서 다른 프로필에선 404
            "/api/v1/dev/**",
        )
    }
}
