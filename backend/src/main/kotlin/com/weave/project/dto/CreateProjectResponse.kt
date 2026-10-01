package com.weave.project.dto

data class CreateProjectResponse(
    val project: ProjectDetailResponse,
    /** 마감 안에 끝내기 빠듯한 작업 수 (임시 일정 알고리즘 규칙 6) */
    val lateCount: Int,
)
