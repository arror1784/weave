package com.weave.auth.service

import com.weave.auth.dto.LoginRequest
import com.weave.auth.dto.SignupRequest
import com.weave.auth.dto.TokenResponse
import com.weave.auth.repository.RefreshTokenRepository
import com.weave.global.error.ApiException
import com.weave.user.domain.User
import com.weave.user.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val tokenService: TokenService,
    private val passwordEncoder: PasswordEncoder,
    private val clock: Clock,
) {
    @Transactional
    fun signup(request: SignupRequest): TokenResponse {
        val email = normalize(request.email)
        if (userRepository.existsByEmail(email)) throw ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "이미 가입한 이메일이에요.")
        val user = userRepository.save(User(email, passwordEncoder.encode(request.password)!!))
        return tokenService.issue(user)
    }

    @Transactional
    fun login(request: LoginRequest): TokenResponse {
        val user = userRepository.findByEmail(normalize(request.email))
        // 이메일이 없는지 비밀번호가 틀렸는지 구분해 알려주지 않는다
        if (user == null || !passwordEncoder.matches(request.password, user.passwordHash)) throw invalidCredentials()
        return tokenService.issue(user)
    }

    /**
     * 리프레시 토큰 교체. 이미 교체·폐기된 토큰이 다시 오면 탈취로 보고 그 사용자의 토큰을 전부 폐기한다.
     * 폐기는 오류를 던진 뒤에도 남아야 하므로 noRollbackFor로 커밋한다.
     */
    @Transactional(noRollbackFor = [ApiException::class])
    fun refresh(rawToken: String): TokenResponse {
        val now = clock.instant()
        val token = refreshTokenRepository.findByTokenHash(TokenService.hash(rawToken)) ?: throw invalidRefresh()
        if (token.revokedAt != null) {
            refreshTokenRepository.revokeAllByUserId(token.userId, now)
            throw ApiException(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_REUSED", "다시 로그인해 주세요.")
        }
        if (!token.isActive(now)) throw invalidRefresh()
        val user = userRepository.findById(token.userId).orElseThrow { invalidRefresh() }
        token.revoke(now)
        return tokenService.issue(user)
    }

    /** 로그아웃: 그 리프레시 토큰을 폐기한다. 다른 사람 토큰이면 조용히 무시한다. */
    @Transactional
    fun logout(userId: Long, rawToken: String) {
        val token = refreshTokenRepository.findByTokenHash(TokenService.hash(rawToken)) ?: return
        if (token.userId == userId) token.revoke(clock.instant())
    }

    private fun invalidCredentials() = ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 맞지 않아요.")

    private fun invalidRefresh() = ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "다시 로그인해 주세요.")

    companion object {
        fun normalize(email: String) = email.trim().lowercase()
    }
}
