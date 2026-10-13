/**
 * Regression test: every DeepSeek V4.1 Flash id must reach the wire as
 * `deepseek-flash`, the only flash name the DeepSeek API accepts.
 *
 * Background (api-docs.deepseek.com, 2026-09-10 release):
 *   `deepseek-flash` is the canonical id for V4.1 Flash. `deepseek-v4-flash`
 *   and `deepseek-v4-flash-vision-exp` are retired ids that DeepSeek only
 *   "temporarily" routes to V4.1 Flash. `deepseek-v4.1-flash` was never an API
 *   name: sending it verbatim fails with HTTP 400 "The supported API model
 *   names are deepseek-flash, deepseek-v4-pro" (issue #3994).
 *
 * Once remapped, the translator resolves caps by `deepseek-flash`, so its
 * DeepSeek-scoped limits must match the live /models payload
 * (context_window 1048576, max_output_tokens 393216, image input).
 */

import { describe, it, expect } from "vitest";
import { getModelUpstreamId } from "../../open-sse/config/providerModels.js";
import { getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";
import { prepareClaudeRequest } from "../../open-sse/translator/formats/claude.js";
import deepseek from "../../open-sse/providers/registry/deepseek.js";

const FLASH_ALIASES = ["deepseek-v4.1-flash", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"];
const FLASH_IDS = ["deepseek-flash", ...FLASH_ALIASES];

describe("DeepSeek flash upstream id", () => {
  it("lists deepseek-flash as a registry model sent verbatim", () => {
    const entry = deepseek.models.find((m) => m.id === "deepseek-flash");
    expect(entry).toBeDefined();
    expect(getModelUpstreamId("deepseek", "deepseek-flash")).toBe("deepseek-flash");
  });

  for (const id of FLASH_ALIASES) {
    it(`${id} is sent upstream as deepseek-flash`, () => {
      expect(getModelUpstreamId("deepseek", id)).toBe("deepseek-flash");
    });
  }

  it("keeps the thinking suffix when remapping", () => {
    expect(getModelUpstreamId("deepseek", "deepseek-v4.1-flash(max)")).toBe("deepseek-flash(max)");
  });

  it("leaves deepseek-v4-pro untouched", () => {
    expect(getModelUpstreamId("deepseek", "deepseek-v4-pro")).toBe("deepseek-v4-pro");
  });
});

describe("DeepSeek flash capabilities", () => {
  for (const provider of ["deepseek", "ds"]) {
    for (const id of FLASH_IDS) {
      it(`${provider}/${id} reports V4.1 Flash limits and vision`, () => {
        const caps = getCapabilitiesForModel(provider, id);
        expect(caps.vision).toBe(true);
        expect(caps.reasoning).toBe(true);
        expect(caps.thinkingFormat).toBe("deepseek");
        expect(caps.contextWindow).toBe(1048576);
        expect(caps.maxOutput).toBe(393216);
      });
    }
  }

  it("does not change deepseek-flash caps for other providers", () => {
    expect(getCapabilitiesForModel("opencode-go", "deepseek-flash")).toEqual(
      getCapabilitiesForModel(null, "deepseek-flash"),
    );
  });

  it("does not clamp Claude-format max_tokens below the real output ceiling", () => {
    const body = {
      model: "deepseek-flash",
      max_tokens: 128000,
      messages: [{ role: "user", content: "hi" }],
    };
    prepareClaudeRequest(body, "deepseek");
    expect(body.max_tokens).toBe(128000);
  });
});
