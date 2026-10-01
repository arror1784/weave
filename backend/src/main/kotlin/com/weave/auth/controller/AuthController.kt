package com.weave.auth.controller

import com.weave.auth.dto.LoginRequest
import com.weave.auth.dto.RefreshRequest
import com.weave.auth.dto.SignupRequest
import com.weave.auth.dto.TokenResponse
import com.weave.auth.service.AuthService
import com.weave.global.security.userId
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
// 요청 횟수 제한(§3-14)은 배포할 때 다시 넣는다(사용자 결정, 2026-10-01)
class AuthController(private val authService: AuthService) {

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("permitAll()")
    fun signup(@Valid @RequestBody request: SignupRequest): TokenResponse = authService.signup(request)

    @PostMapping("/login")
    @PreAuthorize("permitAll()")
    fun login(@Valid @RequestBody request: LoginRequest): TokenResponse = authService.login(request)

    @PostMapping("/refresh")
    @PreAuthorize("permitAll()")
    fun refresh(@Valid @RequestBody request: RefreshRequest): TokenResponse = authService.refresh(request.refreshToken)

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    fun logout(@AuthenticationPrincipal jwt: Jwt, @Valid @RequestBody request: RefreshRequest) {
        authService.logout(jwt.userId(), request.refreshToken)
    }
}
