package com.weave.auth.controller

import com.weave.auth.dto.LoginRequest
import com.weave.auth.dto.RefreshRequest
import com.weave.auth.dto.SignupRequest
import com.weave.auth.dto.TokenResponse
import com.weave.auth.service.AuthService
import com.weave.global.config.WeaveProperties
import com.weave.global.security.RateLimiter
import com.weave.global.security.userId
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService,
    private val rateLimiter: RateLimiter,
    properties: WeaveProperties,
) {
    private val limits = properties.rateLimit

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("permitAll()")
    fun signup(@Valid @RequestBody request: SignupRequest, http: HttpServletRequest): TokenResponse {
        rateLimiter.check("signup:ip:${http.remoteAddr}", limits.signupPerIp, limits.signupWindow)
        return authService.signup(request)
    }

    @PostMapping("/login")
    @PreAuthorize("permitAll()")
    fun login(@Valid @RequestBody request: LoginRequest, http: HttpServletRequest): TokenResponse {
        rateLimiter.check("login:ip:${http.remoteAddr}", limits.loginPerIp, limits.loginWindow)
        rateLimiter.check("login:email:${AuthService.normalize(request.email)}", limits.loginPerEmail, limits.loginWindow)
        return authService.login(request)
    }

    @PostMapping("/refresh")
    @PreAuthorize("permitAll()")
    fun refresh(@Valid @RequestBody request: RefreshRequest, http: HttpServletRequest): TokenResponse {
        rateLimiter.check("refresh:ip:${http.remoteAddr}", limits.refreshPerIp, limits.refreshWindow)
        return authService.refresh(request.refreshToken)
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    fun logout(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: RefreshRequest) {
        authService.logout(jwt.userId(), request.refreshToken)
    }
}
