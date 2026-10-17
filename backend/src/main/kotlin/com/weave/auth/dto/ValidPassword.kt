package com.weave.auth.dto

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/**
 * 비밀번호 규칙 — 앱(mobile/src/lib/validation.ts)과 같다: 8~64자, 영문·숫자·특수문자 각 1개 이상, 공백 없음.
 * 사용자 확정(2026-10-18). 앱 검증은 편의용, 진짜 검증은 여기서(§3-7).
 */
@Target(AnnotationTarget.FIELD)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [PasswordValidator::class])
annotation class ValidPassword(
    val message: String = "",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class PasswordValidator : ConstraintValidator<ValidPassword, String> {
    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        val error = passwordError(value ?: "") ?: return true
        context.disableDefaultConstraintViolation()
        context.buildConstraintViolationWithTemplate(error).addConstraintViolation()
        return false
    }

    companion object {
        fun passwordError(pw: String): String? = when {
            pw.length < 8 -> "비밀번호는 8자 이상이어야 해요."
            pw.length > 64 -> "비밀번호는 64자 이하로 입력해 주세요."
            pw.any { it.isWhitespace() } -> "비밀번호에 공백을 넣을 수 없어요."
            !(pw.any { it in 'a'..'z' || it in 'A'..'Z' } && pw.any { it.isDigit() } && pw.any { !it.isLetterOrDigit() }) -> "영문·숫자·특수문자를 모두 넣어 주세요."
            else -> null
        }
    }
}
