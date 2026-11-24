import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAIProviderConfig,
  getAIProviderStatus,
  buildAIRequestBody,
  extractAIReply,
  extractAIUsage
} from "../app/ai-provider.js";

const qwenUrl = "https://ws-123.eu-central-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions";

test("Qwen is the default provider and remains unconfigured without credentials", () => {
  const config = resolveAIProviderConfig({});
  assert.equal(config.provider,"qwen");
  assert.equal(config.configured,false);
  assert.equal(config.reason,"missing_credentials_or_endpoint");
  assert.equal(getAIProviderStatus(config),"qwen · not configured");
});

test("Qwen workspace endpoint resolves to the Chat Completions adapter", () => {
  const config = resolveAIProviderConfig({QWEN_API_KEY:"test-secret",QWEN_API_URL:qwenUrl});
  assert.equal(config.provider,"qwen");
  assert.equal(config.configured,true);
  assert.equal(config.protocol,"chat_completions");
  assert.equal(config.model,"qwen4-max");
  assert.equal(config.endpoint,qwenUrl);
  assert.equal(getAIProviderStatus(config),"qwen · configured · qwen4-max");
});

test("Qwen legacy DashScope endpoint remains accepted", () => {
  const config = resolveAIProviderConfig({
    QWEN_API_KEY:"test-secret",
    QWEN_API_URL:"https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
  });
  assert.equal(config.configured,true);
});

test("Qwen rejects HTTP, untrusted hosts, credentials, query strings and wrong paths", () => {
  const invalid = [
    "http://ws-123.eu-central-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
    "https://attacker.example/compatible-mode/v1/chat/completions",
    "https://user:pass@ws-123.eu-central-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions",
    qwenUrl + "?debug=true",
    "https://ws-123.eu-central-1.maas.aliyuncs.com/v1/responses"
  ];
  for (const endpoint of invalid) {
    const config = resolveAIProviderConfig({QWEN_API_KEY:"test-secret",QWEN_API_URL:endpoint});
    assert.equal(config.configured,false,endpoint);
    assert.equal(config.reason,"invalid_endpoint",endpoint);
  }
});

test("OpenAI defaults to Responses API and accepts Chat Completions", () => {
  const responses = resolveAIProviderConfig({AI_PROVIDER:"openai",OPENAI_API_KEY:"test-secret"});
  assert.equal(responses.configured,true);
  assert.equal(responses.protocol,"responses");
  assert.equal(responses.endpoint,"https://api.openai.com/v1/responses");

  const chat = resolveAIProviderConfig({
    AI_PROVIDER:"openai",
    OPENAI_API_KEY:"test-secret",
    OPENAI_API_URL:"https://api.openai.com/v1/chat/completions"
  });
  assert.equal(chat.configured,true);
  assert.equal(chat.protocol,"chat_completions");
});

test("OpenAI rejects unsupported endpoint paths and non-HTTPS URLs", () => {
  for (const endpoint of ["http://api.openai.com/v1/responses","https://api.openai.com/v1/embeddings"]) {
    const config = resolveAIProviderConfig({AI_PROVIDER:"openai",OPENAI_API_KEY:"test-secret",OPENAI_API_URL:endpoint});
    assert.equal(config.configured,false);
    assert.equal(config.reason,"invalid_endpoint");
  }
});

test("unsupported provider names fail closed", () => {
  const config = resolveAIProviderConfig({AI_PROVIDER:"unknown"});
  assert.equal(config.configured,false);
  assert.equal(config.reason,"unsupported_provider");
});

test("request body is normalized for Responses and Chat Completions", () => {
  assert.deepEqual(buildAIRequestBody({protocol:"responses",model:"gpt-test"},"hello"),{model:"gpt-test",input:"hello"});
  assert.deepEqual(buildAIRequestBody({protocol:"chat_completions",model:"qwen-test"},"hello"),{
    model:"qwen-test",
    messages:[{role:"user",content:"hello"}],
    stream:false
  });
});

test("response parser normalizes Qwen Chat Completions and OpenAI Responses", () => {
  assert.equal(extractAIReply({choices:[{message:{content:"Qwen answer"}}]},"chat_completions"),"Qwen answer");
  assert.equal(extractAIReply({output:[{content:[{type:"output_text",text:"OpenAI answer"}]}]},"responses"),"OpenAI answer");
  assert.equal(extractAIReply({output_text:"Convenience output"},"responses"),"Convenience output");
  assert.equal(extractAIReply({choices:[{message:{content:[{type:"text",text:"Part A"},{type:"text",text:"Part B"}]}}]},"chat_completions"),"Part A\nPart B");
});

test("usage parser handles provider field names and rejects invalid counts", () => {
  assert.deepEqual(extractAIUsage({usage:{prompt_tokens:14,completion_tokens:8}}),{inputTokens:14,outputTokens:8});
  assert.deepEqual(extractAIUsage({usage:{input_tokens:"12.8",output_tokens:-1}}),{inputTokens:12,outputTokens:0});
  assert.deepEqual(extractAIUsage({}),{inputTokens:0,outputTokens:0});
});
