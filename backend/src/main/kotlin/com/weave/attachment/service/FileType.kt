package com.weave.attachment.service

/**
 * 받을 수 있는 파일 형식 — 넓은 허용 목록(사용자 결정 2026-10-02, 목록은 Claude 임시안):
 * PDF · 이미지(jpg·png·heic·gif·webp) · Office(docx·pptx·xlsx, 옛 doc·ppt·xls) · 한글(hwp·hwpx)
 * · 글자(txt·md·csv·json·yaml·코드 등) · zip · 음성(mp3·m4a·wav).
 * 실행 파일·스크립트·html·svg는 받지 않는다. 영상은 위치 정보를 지울 방법이 없어 받지 않는다(§3-9).
 * 확장자와 파일 앞부분(시그니처)이 모두 맞아야 받는다(§3-9) — 앱이 보낸 MIME은 믿지 않는다.
 */
enum class FileType(val extensions: Set<String>, val contentType: String, val image: Boolean = false) {
    PDF(setOf("pdf"), "application/pdf"),
    JPEG(setOf("jpg", "jpeg"), "image/jpeg", image = true),
    PNG(setOf("png"), "image/png", image = true),
    HEIC(setOf("heic", "heif"), "image/heic", image = true),
    GIF(setOf("gif"), "image/gif", image = true),
    WEBP(setOf("webp"), "image/webp", image = true),
    DOCX(setOf("docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    PPTX(setOf("pptx"), "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    XLSX(setOf("xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    DOC(setOf("doc"), "application/msword"),
    PPT(setOf("ppt"), "application/vnd.ms-powerpoint"),
    XLS(setOf("xls"), "application/vnd.ms-excel"),
    HWPX(setOf("hwpx"), "application/hwp+zip"),
    HWP(setOf("hwp"), "application/x-hwp"),

    /** 글자 파일 — 내려줄 때는 모두 text/plain(브라우저가 실행하지 않게). 저장 확장자는 txt */
    TXT(
        setOf(
            "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml", "toml", "ini", "log", "tex", "sql",
            "py", "java", "kt", "kts", "c", "h", "cpp", "hpp", "cc", "cs", "go", "rs", "swift", "rb", "php",
            "js", "jsx", "ts", "tsx", "css", "scss", "dart", "r", "m", "ipynb",
        ),
        "text/plain",
    ),
    ZIP(setOf("zip"), "application/zip"),
    MP3(setOf("mp3"), "audio/mpeg"),
    M4A(setOf("m4a"), "audio/mp4"),
    WAV(setOf("wav"), "audio/wav"),
    ;

    fun matches(bytes: ByteArray): Boolean = when (this) {
        PDF -> startsWith(bytes, "%PDF-".toByteArray())
        JPEG -> startsWith(bytes, byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte()))
        PNG -> startsWith(bytes, byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))
        HEIC -> ftyp(bytes) in setOf("heic", "heix", "hevc", "heim", "heis", "mif1", "msf1")
        GIF -> startsWith(bytes, "GIF87a".toByteArray()) || startsWith(bytes, "GIF89a".toByteArray())
        WEBP -> riff(bytes) == "WEBP"
        // Office Open XML·HWPX·zip은 ZIP 컨테이너
        DOCX, PPTX, XLSX, HWPX, ZIP -> startsWith(bytes, byteArrayOf(0x50, 0x4B, 0x03, 0x04))
        // HWP 5.0·옛 Office는 OLE 복합 문서
        HWP, DOC, PPT, XLS -> startsWith(bytes, byteArrayOf(0xD0.toByte(), 0xCF.toByte(), 0x11, 0xE0.toByte(), 0xA1.toByte(), 0xB1.toByte(), 0x1A, 0xE1.toByte()))
        // 텍스트: 앞부분에 NUL 바이트가 없어야 한다
        TXT -> bytes.asSequence().take(8192).none { it == 0.toByte() }
        // MP3: ID3 태그 또는 MPEG 프레임 동기(11비트 1)
        MP3 -> startsWith(bytes, "ID3".toByteArray()) || (bytes.size >= 2 && bytes[0] == 0xFF.toByte() && (bytes[1].toInt() and 0xE0) == 0xE0)
        M4A -> ftyp(bytes) in setOf("M4A ", "M4B ", "mp42", "isom")
        WAV -> riff(bytes) == "WAVE"
    }

    companion object {
        fun ofExtension(ext: String): FileType? = entries.firstOrNull { ext.lowercase() in it.extensions }

        private fun startsWith(bytes: ByteArray, prefix: ByteArray) = bytes.size >= prefix.size && prefix.indices.all { bytes[it] == prefix[it] }

        /** ISO 미디어(HEIC·m4a)의 ftyp 상자 브랜드 */
        private fun ftyp(bytes: ByteArray): String? =
            if (bytes.size >= 12 && String(bytes, 4, 4, Charsets.US_ASCII) == "ftyp") String(bytes, 8, 4, Charsets.US_ASCII) else null

        /** RIFF 컨테이너(WebP·WAV)의 형식 */
        private fun riff(bytes: ByteArray): String? =
            if (bytes.size >= 12 && String(bytes, 0, 4, Charsets.US_ASCII) == "RIFF") String(bytes, 8, 4, Charsets.US_ASCII) else null
    }
}
