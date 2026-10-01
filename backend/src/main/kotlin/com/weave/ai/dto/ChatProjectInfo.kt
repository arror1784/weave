package com.weave.ai.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate

/** 등록 1단계(기본 정보)에서 받은 내용 */
data class ChatProjectInfo(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,

    @field:Size(max = 2000)
    val description: String = "",

    val deadline: LocalDate? = null,
)
