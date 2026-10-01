package com.weave.attachment.dto

import com.fasterxml.jackson.annotation.JsonInclude
import com.weave.attachment.domain.Attachment

@JsonInclude(JsonInclude.Include.NON_NULL)
data class AttachmentResponse(
    val id: Long,
    val kind: String,
    val name: String,
    /** 링크 주소 (kind = link) */
    val url: String? = null,
    val contentType: String? = null,
    val size: Long? = null,
) {
    companion object {
        fun of(a: Attachment) = AttachmentResponse(a.id!!, a.kind, a.name, a.url, a.contentType, a.sizeBytes)
    }
}
