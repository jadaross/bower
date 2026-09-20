import { after } from "next/server";
import {
  propagateAttributes,
  startActiveObservation,
  startObservation,
} from "@langfuse/tracing";
import { LangfuseClient } from "@langfuse/client";
import { trace } from "@opentelemetry/api";

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
 *
 * Nothing in here imports `src/instrumentation.ts`. It used to, to reach the
 * span processor for `forceFlush` — and Turbopack bundles that module once
 * for the instrumentation entry and again for the route handlers, so the
 * routes held a second, never-registered processor and every flush here
 * emptied an empty queue. Spans only left when the batch timer fired while
 * the function instance happened to stay warm: about one analyse in four
 * reached Langfuse. The flush now goes through the OpenTelemetry API's global
 * provider (`registeredProvider`), which lives on `globalThis` and so is the
 * same object from every bundle.
 */

export interface TraceContext {
  userId: string;
  route: string;
  /** Groups one item's journey (analyse → format → refine → valuate) in Langfuse. */
  sessionId?: string;
}

export function observabilityEnabled(): boolean {
  return !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

let _scoreClient: LangfuseClient | null = null;
function scoreClient(): LangfuseClient | null {
  if (!observabilityEnabled()) return null;
  if (!_scoreClient) {
    try {
      _scoreClient = new LangfuseClient();
    } catch {
      return null;
    }
  }
  return _scoreClient;
}

export type ScoreDataType = "NUMERIC" | "BOOLEAN" | "CATEGORICAL";

export interface ScoreInput {
  traceId: string;
  /** Named by source, not meaning, e.g. `copied` / `manual-edit` / `thumbs`. */
  name: string;
  value: number;
  dataType?: ScoreDataType;
  comment?: string;
}

/**
 * Queue a Langfuse score on a trace. Fail-safe and a no-op without keys; the
 * queued score is sent by the request-end flush (`scheduleFlush`), so a scoring
 * failure can never affect the request.
 */
export function recordScore(input: ScoreInput): void {
  const client = scoreClient();
  if (!client) return;
  try {
    client.score.create({
      traceId: input.traceId,
      name: input.name,
      value: input.value,
      ...(input.dataType ? { dataType: input.dataType } : {}),
      ...(input.comment ? { comment: input.comment } : {}),
    });
  } catch {
    // Feedback is best-effort.
  }
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
    {
      userId: trace.userId,
      tags: [featureOf(trace.route)],
      metadata: { route: trace.route },
      ...(trace.sessionId ? { sessionId: trace.sessionId } : {}),
    },
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

/**
 * The tracer provider `register()` installed, found through the API's global
 * rather than by importing the module that built it (see the header). The
 * global is a proxy whose delegate is the NodeSDK's provider; flushing the
 * provider flushes every span processor it was given.
 */
function registeredProvider(): { forceFlush: () => Promise<void> } | null {
  const provider = trace.getTracerProvider() as { getDelegate?: () => unknown };
  const delegate = (typeof provider.getDelegate === "function" ? provider.getDelegate() : provider) as {
    forceFlush?: unknown;
  } | null;
  return typeof delegate?.forceFlush === "function" ? (delegate as { forceFlush: () => Promise<void> }) : null;
}

export async function flushObservability(): Promise<void> {
  if (!observabilityEnabled()) return;
  try {
    await registeredProvider()?.forceFlush();
  } catch (err) {
    // Losing a trace must never surface to the user, but it must not vanish
    // without a trace of its own either — see logTracingFailure.
    logTracingFailure("flushObservability forceFlush — buffered spans were dropped", err);
  }
  try {
    await _scoreClient?.flush();
  } catch (err) {
    logTracingFailure("flushObservability score flush — buffered scores were dropped", err);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The invariant here is "tracing never breaks the request," not "tracing
 * failures are invisible." A swallowed failure that leaves no trace of itself
 * is undiagnosable (see the bower dashboard incident where an analyse call's
 * generation never reached Langfuse and nothing said why) — so every catch
 * that would otherwise lose a generation logs first. Never throws itself.
 */
function logTracingFailure(where: string, err: unknown): void {
  try {
    console.error(`[observability] ${where}: ${errorMessage(err)}`);
  } catch {
    /* logging must never be the thing that breaks a request */
  }
}

interface GenerationMeta {
  /** Operation name, e.g. "analyse" / "format". Static, not per-execution. */
  name: string;
  model: string;
  input: unknown;
  modelParameters?: Record<string, string | number>;
  /** Context for callers outside an active `withTrace` scope (streaming analyse). */
  trace?: TraceContext;
  /** Receives the Langfuse trace id, so a caller can later attach feedback scores. */
  onTraceId?: (traceId: string) => void;
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
    logTracingFailure(`observeParent("${name}") setup`, err);
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
      try { meta.onTraceId?.(generation.traceId); } catch { /* ignore */ }
    } catch (err) {
      logTracingFailure(`observeGeneration("${meta.name}") setup — this generation will not reach Langfuse`, err);
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
    try { meta.onTraceId?.(generation.traceId); } catch { /* ignore */ }
  } catch (err) {
    logTracingFailure(`beginGeneration("${meta.name}") setup — this generation will not reach Langfuse`, err);
    return null;
  }

  return {
    finish({ output, usage }) {
      try {
        generation.update({ output, usageDetails: usageDetails(usage) });
        generation.end();
      } catch (err) {
        logTracingFailure(`beginGeneration("${meta.name}").finish — output/usage lost, generation left unclosed`, err);
        try { generation.end(); } catch { /* ignore */ }
      }
    },
    fail(err) {
      try {
        generation.update({ level: "ERROR", statusMessage: errorMessage(err) });
        generation.end();
      } catch (endErr) {
        logTracingFailure(`beginGeneration("${meta.name}").fail`, endErr);
      }
    },
  };
}
