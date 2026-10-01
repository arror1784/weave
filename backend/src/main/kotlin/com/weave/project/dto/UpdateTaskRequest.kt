package com.weave.project.dto

/** 등록한 작업은 완료 여부만 바꾼다(사용자 결정 B) */
data class UpdateTaskRequest(val done: Boolean)
