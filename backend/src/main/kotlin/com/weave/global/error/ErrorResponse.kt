package com.weave.global.error

import com.fasterxml.jackson.annotation.JsonInclude

/** 모든 오류 응답의 모양. 내부 정보(스택 트레이스·SQL·경로)는 담지 않는다(§3-13). */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ErrorResponse(
    val code: String,
    val message: String,
    /** 입력 검증 실패 시 필드별 첫 오류 */
    val fieldErrors: Map<String, String>? = null,
)
