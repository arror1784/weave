plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.spring.boot)
}

group = "com.weave"
version = "0.0.1-SNAPSHOT"

kotlin {
    jvmToolchain(25)
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

dependencies {
    // Boot BOM이 버전을 관리한다 — developmentOnly는 implementation을 상속하지 않으므로 따로 건다
    val springBootBom = platform(org.springframework.boot.gradle.plugin.SpringBootPlugin.BOM_COORDINATES)
    implementation(springBootBom)
    developmentOnly(springBootBom)

    implementation(libs.spring.boot.starter.webmvc)
    implementation(libs.spring.boot.starter.security)
    // 자체 발급 JWT(HS256) 검증 — Bearer 헤더 인증
    implementation(libs.spring.boot.starter.security.oauth2.resource.server)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.flyway)
    implementation(libs.flyway.database.postgresql)
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.jackson.module.kotlin)
    implementation(libs.kotlin.reflect)
    implementation(libs.springdoc.openapi.webmvc.ui)
    // Claude API 공식 SDK (client/ClaudeClient에서만 사용)
    implementation(libs.anthropic.java)
    // 업로드 사진의 위치정보(GPS) 확인 — HEIC처럼 직접 지우기 어려운 형식에 사용
    implementation(libs.metadata.extractor)
    // 첨부를 AI에게 보낼 때 글자 뽑기 — Office(docx·pptx·xlsx, 옛 doc·ppt는 scratchpad), 한글(hwp·hwpx)
    implementation(libs.poi.ooxml)
    implementation(libs.poi.scratchpad)
    implementation(libs.hwplib)
    implementation(libs.hwpxlib)
    runtimeOnly(libs.postgresql)
    developmentOnly(libs.spring.boot.docker.compose)

    testImplementation(libs.spring.boot.starter.webmvc.test)
    testImplementation(libs.spring.boot.starter.security.test)
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
    testImplementation(libs.kotest.runner.junit5)
    testImplementation(libs.kotest.assertions.core)
    testImplementation(libs.kotest.extensions.spring)
    testImplementation(libs.mockk)
    testImplementation(libs.springmockk)
}

// 모든 엔티티를 open으로 — Hibernate 지연 로딩 프록시가 동작하도록
allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// AI 시스템 프롬프트의 원본은 사용자가 쓴 docs/ 문서 하나 — 빌드할 때 서버 리소스로 복사한다(코드에 따로 두지 않는다)
// 원본이 없으면 빌드를 멈춘다 — from()은 없는 파일을 조용히 건너뛰어 서버가 시작할 때에야 실패했다(문서 이름을 바꿨을 때, 2026-10-17)
val breakdownPrompt = rootProject.file("../docs/Weave-AI 작업 분할 시스템 프롬프트.md")
tasks.processResources {
    inputs.file(breakdownPrompt)
    from(breakdownPrompt) {
        into("prompts")
        rename { "project-breakdown.md" }
    }
}

// 배포 이미지(backend/Dockerfile)는 실행 가능한 jar 하나만 쓴다 — plain jar를 만들지 않아 COPY가 헷갈리지 않게
tasks.jar {
    enabled = false
}
