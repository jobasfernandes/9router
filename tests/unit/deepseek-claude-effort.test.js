/**
 * Regression test: Claude Code's effort must reach DeepSeek's Anthropic
 * endpoint in `output_config.effort`.
 *
 * Background (probed live against https://api.deepseek.com/anthropic):
 *   the endpoint validates `output_config.effort` (an unknown value is a 422)
 *   but silently ignores a top-level `reasoning_effort` (an unknown value is a
 *   200). The "deepseek" thinking format writes `reasoning_effort` and strips
 *   `output_config`, so every Claude Code request ran at DeepSeek's default
 *   effort no matter what CLAUDE_CODE_EFFORT_LEVEL asked for.
 */

import { describe, it, expect } from "vitest";
import { prepareClaudeRequest } from "../../open-sse/translator/formats/claude.js";
import { translateRequest } from "../../open-sse/translator/index.js";
import { FORMATS } from "../../open-sse/translator/formats.js";
import "../translator/registerAll.js";

// Shape captured from Claude Code 2.1.296 with CLAUDE_CODE_EFFORT_LEVEL=max.
function claudeCodeBody(overrides = {}) {
  return {
    model: "deepseek-flash",
    max_tokens: 32000,
    stream: true,
    thinking: { type: "adaptive", display: "omitted" },
    output_config: { effort: "max" },
    messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    ...overrides,
  };
}

describe("DeepSeek Anthropic endpoint effort", () => {
  it("moves reasoning_effort into output_config.effort", () => {
    const body = prepareClaudeRequest({
      model: "deepseek-flash",
      max_tokens: 1024,
      thinking: { type: "enabled" },
      reasoning_effort: "max",
      messages: [{ role: "user", content: "hi" }],
    }, "deepseek");
    expect(body.output_config).toEqual({ effort: "max" });
    expect(body).not.toHaveProperty("reasoning_effort");
  });

  it("forwards Claude Code's max effort end to end", () => {
    const out = translateRequest(FORMATS.CLAUDE, FORMATS.CLAUDE, "deepseek-flash", claudeCodeBody(), true, null, "deepseek");
    expect(out.thinking).toEqual({ type: "enabled" });
    expect(out.output_config).toEqual({ effort: "max" });
    expect(out).not.toHaveProperty("reasoning_effort");
  });

  it("keeps disabled thinking free of an effort", () => {
    const out = translateRequest(FORMATS.CLAUDE, FORMATS.CLAUDE, "deepseek-flash", claudeCodeBody({ thinking: { type: "disabled" }, output_config: undefined }), true, null, "deepseek");
    expect(out.thinking).toEqual({ type: "disabled" });
    expect(out.output_config?.effort).toBeUndefined();
    expect(out).not.toHaveProperty("reasoning_effort");
  });

  it("leaves DeepSeek's OpenAI endpoint on reasoning_effort", () => {
    const out = translateRequest(FORMATS.OPENAI, FORMATS.OPENAI, "deepseek-flash", {
      model: "deepseek-flash",
      reasoning_effort: "max",
      messages: [{ role: "user", content: "hi" }],
    }, true, null, "deepseek");
    expect(out.reasoning_effort).toBe("max");
    expect(out).not.toHaveProperty("output_config");
  });
});
