package com.weave.global.config

import org.springframework.context.annotation.Bean
import org.springframework.http.HttpStatus
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint

/**
 * 기본 거부 + 무상태 토큰 인증 (§3.1-4, §4-7).
 * - @EnableMethodSecurity가 없으면 @PreAuthorize가 에러 없이 무시된다 — 지우지 않는다.
 * - 인가는 @PreAuthorize로만. 여기엔 로그인 없이 열어야 하는 "공개 목록"만 둔다.
 * - Bearer 헤더로만 인증하므로 CSRF 보호를 끈다. 쿠키 인증을 추가하면 다시 켠다.
 * - 액세스 토큰은 서버가 발급한 JWT(JwtConfig). 토큰의 sub가 사용자 id다.
 */
@Configuration
@EnableMethodSecurity
class SecurityConfig {

    @Bean
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
