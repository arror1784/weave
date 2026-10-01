package com.weave.global.config

import com.nimbusds.jose.jwk.source.ImmutableSecret
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import javax.crypto.spec.SecretKeySpec

/** 서버가 직접 발급·검증하는 액세스 토큰(HS256). 서명 키는 .env의 JWT_SECRET. */
@Configuration
class JwtConfig(properties: WeaveProperties) {
    private val key = SecretKeySpec(properties.jwt.secret.toByteArray().also {
        require(it.size >= 32) { "JWT_SECRET은 32바이트 이상이어야 한다" }
    }, "HmacSHA256")

    @Bean
    fun jwtEncoder(): JwtEncoder = NimbusJwtEncoder(ImmutableSecret(key))

    @Bean
    fun jwtDecoder(): JwtDecoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()
}
