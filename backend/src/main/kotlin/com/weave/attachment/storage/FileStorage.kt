package com.weave.attachment.storage

import com.weave.global.config.WeaveProperties
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path

/**
 * 첨부 파일 저장소 — 지금은 서버 로컬 디스크(사용자 결정). S3 등으로 바꿀 땐 이 클래스만 바꾼다.
 * 파일 이름은 서버가 만든 key만 쓴다(§3-9) — 사용자가 보낸 이름은 경로에 쓰지 않는다.
 */
@Component
class FileStorage(properties: WeaveProperties) {
    private val root: Path = Path.of(properties.storage.root).toAbsolutePath().normalize()

    fun save(key: String, bytes: ByteArray) {
        Files.createDirectories(root)
        Files.write(resolve(key), bytes)
    }

    fun read(key: String): ByteArray = Files.readAllBytes(resolve(key))

    fun delete(key: String) {
        Files.deleteIfExists(resolve(key))
    }

    private fun resolve(key: String): Path {
        require(key.matches(Regex("[A-Za-z0-9-]+\\.[a-z0-9]+"))) { "잘못된 저장 key" }
        return root.resolve(key)
    }
}
