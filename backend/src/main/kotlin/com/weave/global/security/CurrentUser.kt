package com.weave.global.security

import org.springframework.security.oauth2.jwt.Jwt

/** 액세스 토큰의 sub = 사용자 id */
fun Jwt.userId(): Long = requireNotNull(subject) { "토큰에 sub가 없다" }.toLong()
