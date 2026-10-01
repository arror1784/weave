package com.weave.project.dto

import java.time.LocalDate

/** 프로젝트 목록 카드 */
data class ProjectSummaryResponse(
    val id: Long,
    val name: String,
    val description: String,
    val deadline: LocalDate?,
    val status: String,
    val color: String,
    val doneCount: Int,
    val totalCount: Int,
    val overdueCount: Int,
    /** 밀린 작업 중 가장 오래된 것 */
    val firstOverdueTitle: String?,
    /** 다음에 할 작업 (예정일 순) */
    val nextTaskTitle: String?,
)
