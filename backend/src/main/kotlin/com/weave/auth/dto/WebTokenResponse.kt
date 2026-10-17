package com.weave.auth.dto

import com.weave.user.dto.UserResponse

/** 웹 로그인·갱신 응답 — 리프레시 토큰은 본문에 넣지 않고 HttpOnly 쿠키로만 준다(스크립트가 읽지 못하게) */
data class WebTokenResponse(
    val accessToken: String,
    /** 액세스 토큰 유효 시간(초) */
    val expiresIn: Long,
    val user: UserResponse,
) {
    companion object {
        fun of(tokens: TokenResponse) = WebTokenResponse(tokens.accessToken, tokens.expiresIn, tokens.user)
    }
}
