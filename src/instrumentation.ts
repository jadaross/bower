import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

/**
 * Langfuse LLM observability (#37). OpenTelemetry-based: the processor ships
 * spans to Langfuse, reading LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY /
 * LANGFUSE_BASE_URL from the environment. With no keys set the whole thing is
 * a no-op — the processor is null, `register()` starts nothing, and
 * `src/lib/observability.ts` short-circuits every call. So this is safe to ship
 * before the keys exist; add them and it lights up with no code change.
 *
 * Next.js calls the exported `register()` once at server start.
 */
function makeProcessor(): LangfuseSpanProcessor | null {
  if (!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY)) {
    return null;
  }
  // The processor reads the three env vars itself; passing nothing keeps the
  // credential out of our code.
  return new LangfuseSpanProcessor();
}

export const langfuseSpanProcessor = makeProcessor();

export function register(): void {
  if (!langfuseSpanProcessor) return;
  const sdk = new NodeSDK({ spanProcessors: [langfuseSpanProcessor] });
  sdk.start();
}
