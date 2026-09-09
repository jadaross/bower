import { describe, expect, it, vi } from "vitest";
import { beginGeneration, observabilityEnabled, observeGeneration } from "./observability";

// The test environment sets no LANGFUSE keys, so observability is disabled —
// which is exactly the contract to lock: with no keys, tracing is a complete
// no-op and can never alter the call it wraps.
describe("observability — no-op without keys", () => {
  it("reports disabled when the keys are absent", () => {
    expect(observabilityEnabled()).toBe(false);
  });

  it("observeGeneration runs the fn, returns its result, and skips tracing", async () => {
    const run = vi.fn().mockResolvedValue("the-result");
    const extract = vi.fn();
    const out = await observeGeneration({ name: "x", model: "m", input: {} }, run, extract);
    expect(out).toBe("the-result");
    expect(run).toHaveBeenCalledOnce();
    expect(extract).not.toHaveBeenCalled();
  });

  it("observeGeneration still propagates the fn's error untouched", async () => {
    const boom = new Error("upstream failed");
    await expect(
      observeGeneration({ name: "x", model: "m", input: {} }, () => Promise.reject(boom), () => ({ output: "" }))
    ).rejects.toBe(boom);
  });

  it("beginGeneration returns null when disabled", () => {
    expect(beginGeneration({ name: "x", model: "m", input: {} })).toBeNull();
  });
});
