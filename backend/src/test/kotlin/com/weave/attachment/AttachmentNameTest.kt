package com.weave.attachment

import com.weave.attachment.service.AttachmentService
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe

class AttachmentNameTest : FunSpec({
    test("앱(Expo)이 퍼센트 인코딩해 보낸 한글 파일명을 원래 이름으로 되돌리고, 자모가 분해된(NFD) 한글은 합친다(NFC)") {
        // 폰이 준 '모집 포스터.png'(NFD)를 Expo가 encodeURIComponent로 보낸 그대로
        val sent = "%E1%84%86%E1%85%A9%E1%84%8C%E1%85%B5%E1%86%B8%20%E1%84%91%E1%85%A9%E1%84%89%E1%85%B3%E1%84%90%E1%85%A5.png"
        AttachmentService.displayName(sent) shouldBe "모집 포스터.png"
    }

    test("인코딩되지 않은 이름은 그대로 — '%'나 '+'가 들어간 이름도 깨지지 않는다") {
        AttachmentService.displayName("100%.pdf") shouldBe "100%.pdf"
        AttachmentService.displayName("a+b 보고서.pdf") shouldBe "a+b 보고서.pdf"
        AttachmentService.displayName("dir/보고서.pdf") shouldBe "보고서.pdf"
    }
})
