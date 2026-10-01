package com.weave.project.dto

data class UpdateTaskResponse(
    val task: TaskResponse,
    /** 진행중 프로젝트의 작업이 모두 끝났으면 true — 앱이 "프로젝트가 완료되었습니까?"를 묻는다(사용자 결정 H) */
    val projectAllDone: Boolean,
)
