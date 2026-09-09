import { after } from "next/server";
import {
  propagateAttributes,
  startActiveObservation,
  startObservation,
} from "@langfuse/tracing";
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
 * `withTrace` uses Langfuse's `propagateAttributes`, so userId / tags / route
 * are set as first-class trace fields (for per-user cost attribution and
 * per-feature filtering) on every observation created within it. `withAuth`
 * wraps the whole request; the streaming analyse call, which runs after the
 * handler returns, re-propagates its own context.
 */

export interface TraceContext {
  userId: string;
  route: string;
}

export function observabilityEnabled(): boolean {
  return !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

/** The per-feature tag, derived from the route ("/api/analyse" → "analyse"). */
function featureOf(route: string): string {
  return route.replace(/^\/api\//, "") || route;
}

/**
 * Run `fn` with the request's userId/route propagated onto every span it
 * creates. No-op passthrough when observability is off or no context is given,
 * so `fn` runs exactly once and its result/errors pass through untouched.
 */
export function withTrace<T>(trace: TraceContext | undefined, fn: () => T): T {
  if (!observabilityEnabled() || !trace) return fn();
  return propagateAttributes(
    { userId: trace.userId, tags: [featureOf(trace.route)], metadata: { route: trace.route } },
    fn
  );
}

/** Back-compat name used by `withAuth`. */
export function runWithRequestContext<T>(ctx: TraceContext, fn: () => T): T {
  return withTrace(ctx, fn);
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

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface GenerationMeta {
  /** Operation name, e.g. "analyse" / "format". Static, not per-execution. */
  name: string;
  model: string;
  input: unknown;
  modelParameters?: Record<string, string | number>;
  /** Context for callers outside an active `withTrace` scope (streaming analyse). */
  trace?: TraceContext;
}

interface GenerationResult {
  output: unknown;
  usage?: { input?: number; output?: number };
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
 * Run `fn` inside an active parent span so the LLM generations it triggers nest
 * underneath it — used for multi-step requests like valuate, which fans out one
 * search per platform. Fail-safe: if tracing setup fails before `fn` runs, `fn`
 * still runs; once `fn` has started, its result and errors pass through
 * untouched (never double-run, never swallowed).
 */
export async function observeParent<T>(
  name: string,
  input: unknown,
  fn: () => Promise<T>
): Promise<T> {
  if (!observabilityEnabled()) return fn();
  let started = false;
  try {
    return await startActiveObservation(
      name,
      async (span) => {
        started = true;
        try {
          span.update({ input });
        } catch {
          /* ignore */
        }
        try {
          const result = await fn();
          try {
            span.update({ output: result });
            span.end();
          } catch {
            /* ignore */
          }
          return result;
        } catch (err) {
          try {
            span.update({ level: "ERROR", statusMessage: errorMessage(err) });
            span.end();
          } catch {
            /* ignore */
          }
          throw err;
        }
      },
      { asType: "span" }
    );
  } catch (err) {
    if (started) throw err;
    return fn();
  }
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

  return withTrace(meta.trace, async () => {
    let generation;
    try {
      generation = startObservation(
        meta.name,
        { model: meta.model, input: meta.input, modelParameters: meta.modelParameters },
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
        generation.update({ level: "ERROR", statusMessage: errorMessage(err) });
        generation.end();
      } catch {
        /* ignore */
      }
      throw err;
    }
  });
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
    generation = withTrace(meta.trace, () =>
      startObservation(
        meta.name,
        { model: meta.model, input: meta.input, modelParameters: meta.modelParameters },
        { asType: "generation" }
      )
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
        generation.update({ level: "ERROR", statusMessage: errorMessage(err) });
        generation.end();
      } catch {
        /* ignore */
      }
    },
  };
}
