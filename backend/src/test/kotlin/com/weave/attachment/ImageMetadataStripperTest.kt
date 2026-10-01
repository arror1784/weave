package com.weave.attachment

import com.weave.attachment.service.ImageMetadataStripper
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import javax.imageio.ImageIO

class ImageMetadataStripperTest : FunSpec({
    fun containsText(bytes: ByteArray, text: String) = String(bytes, Charsets.ISO_8859_1).contains(text)

    test("JPEG의 EXIF(APP1) 세그먼트를 지우고, 그림은 그대로 읽힌다") {
        val original = TestImages.jpegWithExif()
        containsText(original, "Exif") shouldBe true
        val stripped = ImageMetadataStripper.stripJpeg(original)
        containsText(stripped, "Exif") shouldBe false
        containsText(stripped, "GPS") shouldBe false
        ImageIO.read(stripped.inputStream()) shouldNotBe null
    }

    test("PNG의 텍스트 청크(tEXt 등)를 지우고, 그림은 그대로 읽힌다") {
        val original = TestImages.pngWithText()
        containsText(original, "Location") shouldBe true
        val stripped = ImageMetadataStripper.stripPng(original)
        containsText(stripped, "Location") shouldBe false
        ImageIO.read(stripped.inputStream()) shouldNotBe null
    }
})
