package com.weave.global.ratelimit

import java.time.Duration

/** 요청 횟수 한도를 넘었다 — retryAfter 뒤에 다시 시도할 수 있다(429 + Retry-After) */
class RateLimitExceededException(val retryAfter: Duration) : RuntimeException("rate limited")
