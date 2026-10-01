package com.weave.attachment

import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.util.zip.CRC32
import javax.imageio.ImageIO

/** 테스트용 이미지: 메타데이터(EXIF·텍스트)를 일부러 넣은 JPEG·PNG */
object TestImages {
    private fun encode(format: String): ByteArray {
        val image = BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB)
        return ByteArrayOutputStream().also { ImageIO.write(image, format, it) }.toByteArray()
    }

    /** SOI 바로 뒤에 "Exif" APP1 세그먼트(가짜 GPS 문자열 포함)를 끼운 JPEG */
    fun jpegWithExif(): ByteArray {
        val jpeg = encode("jpg")
        val payload = "Exif\u0000\u0000GPS 37.5665,126.9780".toByteArray()
        val length = payload.size + 2
        val app1 = byteArrayOf(0xFF.toByte(), 0xE1.toByte(), (length shr 8).toByte(), (length and 0xFF).toByte()) + payload
        return jpeg.copyOfRange(0, 2) + app1 + jpeg.copyOfRange(2, jpeg.size)
    }

    /** IHDR 뒤에 tEXt 청크("Location" 텍스트)를 끼운 PNG */
    fun pngWithText(): ByteArray {
        val png = encode("png")
        val ihdrEnd = 8 + 4 + 4 + 13 + 4
        val type = "tEXt".toByteArray()
        val data = "Location\u000037.5665,126.9780".toByteArray()
        val crc = CRC32().apply { update(type); update(data) }.value
        val chunk = int(data.size) + type + data + int(crc.toInt())
        return png.copyOfRange(0, ihdrEnd) + chunk + png.copyOfRange(ihdrEnd, png.size)
    }

    private fun int(v: Int) = byteArrayOf((v shr 24).toByte(), (v shr 16).toByte(), (v shr 8).toByte(), v.toByte())
}
