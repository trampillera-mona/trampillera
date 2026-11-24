const QWEN_WORKSPACE_HOST = /^[a-z0-9-]+\.(?:ap-southeast-1|eu-central-1|us-east-1|cn-beijing|cn-hongkong|ap-northeast-1)\.maas\.aliyuncs\.com$/i;
const QWEN_LEGACY_HOSTS = new Set([
  "dashscope-intl.aliyuncs.com",
  "dashscope.aliyuncs.com",
  "cn-hongkong.dashscope.aliyuncs.com"
]);

const textValue = (value, max = 120) => typeof value === "string" ? value.trim().slice(0,max) : "";

export function resolveAIProviderConfig(env = process.env) {
  const provider = textValue(env.AI_PROVIDER || "qwen",32).toLowerCase() || "qwen";
  let apiKey = "";
  let endpoint = "";
  let model = "";
  let protocol = "chat_completions";

  if (provider === "qwen") {
    apiKey = textValue(env.QWEN_API_KEY,4096);
    endpoint = textValue(env.QWEN_API_URL,1000);
    model = textValue(env.QWEN_MODEL || "qwen4-max");
  } else if (provider === "openai") {
    apiKey = textValue(env.OPENAI_API_KEY,4096);
    endpoint = textValue(env.OPENAI_API_URL || "https://api.openai.com/v1/responses",1000);
    model = textValue(env.OPENAI_MODEL || "gpt-4.1-mini");
  } else {
    return { provider, model:"", configured:false, reason:"unsupported_provider" };
  }

  if (!apiKey || !endpoint) return { provider, model, configured:false, reason:"missing_credentials_or_endpoint" };

  let parsed;
  try { parsed = new URL(endpoint); } catch {
    return { provider, model, configured:false, reason:"invalid_endpoint" };
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port) {
    return { provider, model, configured:false, reason:"invalid_endpoint" };
  }

  if (provider === "qwen") {
    const workspaceHost = QWEN_WORKSPACE_HOST.test(parsed.hostname);
    const legacyHost = QWEN_LEGACY_HOSTS.has(parsed.hostname.toLowerCase());
    if ((!workspaceHost && !legacyHost) || parsed.pathname !== "/compatible-mode/v1/chat/completions") {
      return { provider, model, configured:false, reason:"invalid_endpoint" };
    }
    protocol = "chat_completions";
  } else {
    if (!["/v1/responses","/v1/chat/completions"].includes(parsed.pathname)) {
      return { provider, model, configured:false, reason:"invalid_endpoint" };
    }
    protocol = parsed.pathname === "/v1/responses" ? "responses" : "chat_completions";
  }

  return { provider, apiKey, endpoint:parsed.toString(), model, protocol, configured:true };
}

export function getAIProviderStatus(config = resolveAIProviderConfig()) {
  return config.configured
    ? `${config.provider} · configured · ${config.model}`
    : `${config.provider} · not configured`;
}

export function buildAIRequestBody(config, message) {
  if (config.protocol === "responses") return { model:config.model, input:message };
  return { model:config.model, messages:[{role:"user",content:message}], stream:false };
}

export function extractAIReply(data, protocol) {
  if (!data || typeof data !== "object") return "";
  if (protocol === "responses") {
    if (typeof data.output_text === "string") return data.output_text.trim();
    return (data.output || []).flatMap(item => item.content || [])
      .filter(item => item.type === "output_text").map(item => item.text || "").join("\n").trim();
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map(part => typeof part === "string" ? part : (part.text || "")).join("\n").trim();
  return "";
}

export function extractAIUsage(data) {
  const safeCount = value => {
    const count = Number(value ?? 0);
    return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  };
  return {
    inputTokens:safeCount(data?.usage?.input_tokens ?? data?.usage?.prompt_tokens),
    outputTokens:safeCount(data?.usage?.output_tokens ?? data?.usage?.completion_tokens)
  };
}
