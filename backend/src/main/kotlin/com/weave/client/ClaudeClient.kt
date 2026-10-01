package com.weave.client

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.JsonValue
import com.anthropic.models.messages.JsonOutputFormat
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.OutputConfig
import com.weave.global.config.WeaveProperties
import com.weave.global.error.ApiException
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

/**
 * Claude API(공식 Java SDK) — 앱은 AI API를 직접 부르지 않고 항상 여기를 거친다(§3-11).
 * 모델은 사용자 결정대로 Claude Sonnet 5.5, 키는 .env의 ANTHROPIC_API_KEY.
 */
@Component
class ClaudeClient(private val properties: WeaveProperties) : AiClient {

    private val client: AnthropicClient? by lazy {
        properties.anthropic.apiKey.takeIf { it.isNotBlank() }?.let { AnthropicOkHttpClient.builder().apiKey(it).build() }
    }

    override fun complete(system: String, turns: List<AiTurn>, schema: Map<String, Any>): String {
        val api = client ?: throw ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI_UNAVAILABLE", "AI 설정이 없어요.")
        val params = MessageCreateParams.builder()
            .model(properties.anthropic.model)
            .maxTokens(MAX_TOKENS)
            .system(system)
            .outputConfig(
                OutputConfig.builder()
                    .format(
                        JsonOutputFormat.builder()
                            .schema(JsonOutputFormat.Schema.builder().putAllAdditionalProperties(schema.mapValues { JsonValue.from(it.value) }).build())
                            .build(),
                    )
                    .build(),
            )
            .apply { turns.forEach { if (it.role == "assistant") addAssistantMessage(it.text) else addUserMessage(it.text) } }
            .build()
        val message = api.messages().create(params)
        return message.content().mapNotNull { block -> block.text().orElse(null)?.text() }.joinToString("")
    }

    companion object {
        private const val MAX_TOKENS = 8000L
    }
}
