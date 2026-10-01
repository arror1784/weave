package com.weave.global.error

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.servlet.resource.NoResourceFoundException

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(ApiException::class)
    fun handleApi(e: ApiException): ResponseEntity<ErrorResponse> = respond(e.status, e.code, e.message)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
        val fields = linkedMapOf<String, String>()
        e.bindingResult.fieldErrors.forEach { fields.putIfAbsent(it.field, it.defaultMessage ?: "올바르지 않은 값이에요.") }
        return ResponseEntity.badRequest().body(ErrorResponse("VALIDATION_FAILED", "입력값을 확인해 주세요.", fields))
    }

    @ExceptionHandler(HttpMessageNotReadableException::class, MethodArgumentTypeMismatchException::class)
    fun handleUnreadable(): ResponseEntity<ErrorResponse> = respond(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청 형식이 올바르지 않아요.")

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleTooLarge(): ResponseEntity<ErrorResponse> = respond(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "파일은 10MB까지 올릴 수 있어요.")

    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNotFound(): ResponseEntity<ErrorResponse> = respond(HttpStatus.NOT_FOUND, "NOT_FOUND", "찾을 수 없어요.")

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethod(): ResponseEntity<ErrorResponse> = respond(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "지원하지 않는 요청이에요.")

    /** @PreAuthorize 거부는 403으로 — 아래 Exception 처리기에 삼켜지지 않게 따로 둔다 */
    @ExceptionHandler(AccessDeniedException::class)
    fun handleDenied(): ResponseEntity<ErrorResponse> = respond(HttpStatus.FORBIDDEN, "FORBIDDEN", "권한이 없어요.")

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> {
        // 원인은 서버 로그에만 남긴다 (요청 바디·개인정보는 남기지 않는다, §3-16)
        log.error("Unhandled error: {}", e.javaClass.name, e)
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "잠시 후 다시 시도해 주세요.")
    }

    private fun respond(status: HttpStatus, code: String, message: String) = ResponseEntity.status(status).body(ErrorResponse(code, message))
}
