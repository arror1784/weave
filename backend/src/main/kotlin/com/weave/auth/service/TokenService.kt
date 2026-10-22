package com.weave.auth.service

import com.weave.auth.domain.RefreshToken
import com.weave.auth.dto.TokenResponse
import com.weave.auth.repository.RefreshTokenRepository
import com.weave.global.config.WeaveProperties
import com.weave.global.time.TodayProvider
import com.weave.user.domain.User
import com.weave.user.dto.UserResponse
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.util.Base64

/** 액세스 토큰(JWT 15분)과 리프레시 토큰(임의 문자열 30일, 해시만 저장)을 만든다 */
@Service
class TokenService(
    private val jwtEncoder: JwtEncoder,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val properties: WeaveProperties,
    private val clock: Clock,
    private val todayProvider: TodayProvider,
) {
    private val random = SecureRandom()

    /** 호출하는 쪽의 트랜잭션 안에서 리프레시 토큰을 저장한다 */
    fun issue(user: User, remember: Boolean = true): TokenResponse {
        val now = clock.instant()
        val ttl = properties.jwt.accessTokenTtl
        val claims = JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject(user.id.toString())
            .issuedAt(now)
            .expiresAt(now.plus(ttl))
            .build()
        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        val accessToken = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue

        val raw = ByteArray(32).also(random::nextBytes).let { Base64.getUrlEncoder().withoutPadding().encodeToString(it) }
        refreshTokenRepository.save(RefreshToken(user.id!!, hash(raw), now.plus(properties.jwt.refreshTokenTtl), remember))
        return TokenResponse(accessToken, raw, ttl.seconds, UserResponse.of(user, todayProvider.today()), remember)
    }

    companion object {
        const val ISSUER = "weave"

        fun hash(raw: String): String =
            MessageDigest.getInstance("SHA-256").digest(raw.toByteArray()).joinToString("") { "%02x".format(it) }
    }
}
