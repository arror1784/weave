package com.weave.auth.service

import com.weave.auth.dto.TokenResponse
import com.weave.user.domain.User
import com.weave.user.repository.UserRepository
import org.springframework.context.annotation.Profile
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** local 프로필 전용: 이메일만으로 로그인(없으면 만든다) */
@Profile("local")
@Service
class DevAuthService(
    private val userRepository: UserRepository,
    private val tokenService: TokenService,
    private val passwordEncoder: PasswordEncoder,
) {
    @Transactional
    fun login(email: String): TokenResponse {
        val normalized = AuthService.normalize(email)
        val user = userRepository.findByEmail(normalized)
            ?: userRepository.save(User(normalized, passwordEncoder.encode(UUID.randomUUID().toString())!!))
        return tokenService.issue(user)
    }
}
