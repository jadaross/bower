import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { startObservation } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";

/**
 * Langfuse LLM observability (#37), fail-safe and opt-in.
 *
 * Two invariants:
 *  1. **No-op without keys.** Every function short-circuits when the Langfuse
 *     keys are absent, so the test suite and any key-less deploy behave exactly
 *     as before.
 *  2. **Tracing never breaks the request.** Every Langfuse call is wrapped so a
 *     tracing failure is swallowed — the LLM call and the HTTP response are
 *     never affected by observability.
 *
 * Request context (userId + route) is stashed in AsyncLocalStorage by
 * `withAuth` and read here, so the non-streaming call sites need no threading.
 * The streaming analyse call runs after `withAuth` returns, so it passes its
 * context explicitly.
 */

export interface TraceContext {
  userId: string;
  route: string;
}

const requestContext = new AsyncLocalStorage<TraceContext>();

export function observabilityEnabled(): boolean {
  return !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

/** Run `fn` with the request's trace context available to nested LLM calls. */
export function runWithRequestContext<T>(ctx: TraceContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}

/**
 * Register a flush of buffered spans to run after the response is sent, so the
 * serverless function does not freeze with spans still in the buffer. Only
 * engages when keys are present, which keeps it clear of test/non-Next
 * contexts where `after()` would throw.
 */
export function scheduleFlush(): void {
  if (!observabilityEnabled()) return;
  try {
    after(() => flushObservability());
  } catch {
    void flushObservability();
  }
}

async function flushObservability(): Promise<void> {
  if (!langfuseSpanProcessor) return;
  try {
    await langfuseSpanProcessor.forceFlush();
  } catch {
    // Losing a trace must never surface to the user.
  }
}

interface GenerationMeta {
  /** Operation name, e.g. "analyse" / "format". */
  name: string;
  model: string;
  input: unknown;
  modelParameters?: Record<string, string | number>;
  /** Explicit context for callers outside the AsyncLocalStorage scope (analyse). */
  trace?: TraceContext;
}

interface GenerationResult {
  output: unknown;
  usage?: { input?: number; output?: number };
}

function metadataFor(meta: GenerationMeta): Record<string, unknown> | undefined {
  const ctx = meta.trace ?? requestContext.getStore();
  return ctx ? { userId: ctx.userId, route: ctx.route } : undefined;
}

function usageDetails(
  usage: GenerationResult["usage"]
): Record<string, number> | undefined {
  if (!usage) return undefined;
  const details: Record<string, number> = {};
  if (typeof usage.input === "number") details.input = usage.input;
  if (typeof usage.output === "number") details.output = usage.output;
  return Object.keys(details).length ? details : undefined;
}

/**
 * Wrap a non-streaming model call in a Langfuse generation. Records model,
 * input, output, token usage and latency. Returns exactly what `run` returns;
 * any tracing error is swallowed.
 */
export async function observeGeneration<T>(
  meta: GenerationMeta,
  run: () => Promise<T>,
  extract: (result: T) => GenerationResult
): Promise<T> {
  if (!observabilityEnabled()) return run();

  let generation;
  try {
    generation = startObservation(
      meta.name,
      { model: meta.model, input: meta.input, modelParameters: meta.modelParameters, metadata: metadataFor(meta) },
      { asType: "generation" }
    );
  } catch {
    return run();
  }

  try {
    const result = await run();
    try {
      const { output, usage } = extract(result);
      generation.update({ output, usageDetails: usageDetails(usage) });
      generation.end();
    } catch {
      try { generation.end(); } catch { /* ignore */ }
    }
    return result;
  } catch (err) {
    try {
      generation.update({
        level: "ERROR",
        statusMessage: err instanceof Error ? err.message : String(err),
      });
      generation.end();
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/** A handle for streaming generations, whose output arrives incrementally. */
export interface GenerationHandle {
  finish(result: GenerationResult): void;
  fail(err: unknown): void;
}

/**
 * Begin a generation whose output is streamed. The caller accumulates the
 * output and calls `finish` once the stream completes (or `fail` on error).
 * Returns null when observability is off, so callers use `handle?.finish(...)`.
 */
export function beginGeneration(meta: GenerationMeta): GenerationHandle | null {
  if (!observabilityEnabled()) return null;

  let generation;
  try {
    generation = startObservation(
      meta.name,
      { model: meta.model, input: meta.input, modelParameters: meta.modelParameters, metadata: metadataFor(meta) },
      { asType: "generation" }
    );
  } catch {
    return null;
  }

  return {
    finish({ output, usage }) {
      try {
        generation.update({ output, usageDetails: usageDetails(usage) });
        generation.end();
      } catch {
        /* ignore */
      }
    },
    fail(err) {
      try {
        generation.update({
          level: "ERROR",
          statusMessage: err instanceof Error ? err.message : String(err),
        });
        generation.end();
      } catch {
        /* ignore */
      }
    },
  };
}
