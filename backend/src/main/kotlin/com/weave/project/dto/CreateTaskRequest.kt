package com.weave.project.dto

import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** 등록할 작업 — key는 같은 요청 안에서 선행 작업을 가리키는 용도 */
data class CreateTaskRequest(
    @field:NotBlank
    @field:Size(max = 50)
    val key: String,

    @field:NotBlank(message = "작업 이름을 입력해 주세요.")
    @field:Size(max = 200)
    val title: String,

    @field:Size(max = 2000)
    val description: String = "",

    @field:DecimalMin(value = "0.5", message = "소요 시간은 0.5시간 이상이어야 해요.")
    @field:DecimalMax(value = "200")
    val estimatedHours: Double,

    @field:Size(max = 50)
    val dependsOnKey: String? = null,

    val prerequisite: Boolean = false,
)
