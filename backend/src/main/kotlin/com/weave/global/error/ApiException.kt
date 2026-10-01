package com.weave.global.error

import org.springframework.http.HttpStatus

/** 서비스에서 던지는 예상된 오류 — 상태 코드와 앱이 분기할 수 있는 code, 사용자에게 보여줄 message */
class ApiException(val status: HttpStatus, val code: String, override val message: String) : RuntimeException(message)
