import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "deepseek",
  priority: 110,
  alias: "deepseek",
  aliases: [
    "ds",
  ],
  uiAlias: "ds",
  display: {
    name: "DeepSeek",
    icon: "bolt",
    color: "#4D6BFE",
    textIcon: "DS",
    website: "https://deepseek.com",
    notice: {
      apiKeyUrl: "https://platform.deepseek.com/api_keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.deepseek.com/chat/completions",
    validateUrl: "https://api.deepseek.com/models",
    reasoningInject: {
      scope: "all",
    },
    quirks: {
      // DeepSeek's Anthropic-compatible endpoint
      // (https://api.deepseek.com/anthropic/v1/messages) accepts ONLY the
      // built-in web_search_* tools and rejects client-defined `custom` tools
      // (MCP / Read / Bash / etc.) with HTTP 400
      //   "tools[0]: unknown variant `custom`, expected
      //    `web_search_20250305` or `web_search_20260209`".
      //
      // Declaring this whitelist makes prepareClaudeRequest() forward only
      // web_search_* tools and strip everything else before sending, so MCP /
      // function tools are dropped instead of failing the whole request.
      // DeepSeek's OpenAI-compatible transport is unaffected (targetFormat
      // there is "openai", not "claude", so prepareClaudeRequest is not run).
      claudeSupportedToolTypes: ["web_search_20250305", "web_search_20260209"],
      // The Anthropic-compatible endpoint reads effort only from
      // output_config.effort (an unknown value is a 422) and silently ignores
      // a top-level reasoning_effort (an unknown value is a 200), so without
      // this Claude Code's effort level never reaches the model.
      claudeEffortInOutputConfig: true,
    },
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.deepseek.com/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.deepseek.com/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "deepseek-flash", name: "DeepSeek V4.1 Flash" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-pro-max", name: "DeepSeek V4 Pro Max", upstreamModelId: "deepseek-v4-pro" },
    { id: "deepseek-v4-pro-none", name: "DeepSeek V4 Pro No Thinking", upstreamModelId: "deepseek-v4-pro" },
    // Legacy flash ids kept so existing combos/configs keep resolving. The API
    // rejects deepseek-v4.1-flash (HTTP 400, #3994) and only routes the retired
    // v4-flash ids to V4.1 Flash "temporarily", so all send the canonical id.
    { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash (legacy id)", upstreamModelId: "deepseek-flash" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash (legacy id)", upstreamModelId: "deepseek-flash" },
    { id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision (legacy id)", upstreamModelId: "deepseek-flash" },
    { id: "deepseek-chat", name: "DeepSeek V3.2 Chat" },
    { id: "deepseek-reasoner", name: "DeepSeek V3.2 Reasoner" },
  ],
  features: {
    usage: true,
    usageApikey: true,
  },
};
