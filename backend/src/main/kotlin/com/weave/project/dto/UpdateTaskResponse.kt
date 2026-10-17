package com.weave.project.dto

data class UpdateTaskResponse(
    val task: TaskResponse,
    /** 진행중 프로젝트의 작업이 모두 끝났으면 true — 앱이 "프로젝트가 완료되었습니까?"를 묻는다(사용자 결정 H) */
    val projectAllDone: Boolean,
    /** 완료한 프로젝트의 작업 체크를 풀어 프로젝트가 진행중으로 돌아갔으면 true(사용자 결정 2026-10-18) */
    val projectReopened: Boolean = false,
)
