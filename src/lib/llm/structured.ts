import type Anthropic from "@anthropic-ai/sdk";
import { anthropicClient } from "./client";
import { observeGeneration } from "@/lib/observability";

/**
 * The structured-output boundary. Passing `output_config.format` constrains the
 * Messages response to a JSON document of the given schema — the API guarantees
 * it is valid JSON of that exact shape, so the text block parses with a plain
 * `JSON.parse`: no object extraction, no control-char escaping, no missing-field
 * guards, and no enum value the schema did not allow. This is what replaces the
 * fragile free-text path (`parseJsonObject`) call by call.
 */

/** Wrap a JSON Schema as the API's output-format directive. */
export function jsonSchemaFormat(
  schema: Record<string, unknown>,
): Anthropic.Messages.JSONOutputFormat {
  return { type: "json_schema", schema };
}

/**
 * Parse the text of a structured response into `T`. Safe because the schema
 * guaranteed valid JSON; shared with streaming callers that buffer their own
 * text (analyse) and with the pause_turn resume loop (valuate).
 */
export function parseStructuredContent<T>(
  content: Anthropic.Messages.ContentBlock[],
): T {
  const text = content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new Error("Structured response carried no text content");
  return JSON.parse(text) as T;
}

/**
 * A single non-streaming structured request: the common case for format and
 * refine. Callers pass the usual create params (model, max_tokens, messages,
 * and — for valuate — tools/effort) plus the schema; the format directive is
 * merged into `output_config`.
 */
export async function createStructured<T>(
  params: Omit<
    Anthropic.Messages.MessageCreateParamsNonStreaming,
    "output_config" | "stream"
  > & { output_config?: Anthropic.Messages.OutputConfig },
  schema: Record<string, unknown>,
  observationName?: string,
  onTraceId?: (traceId: string) => void,
): Promise<T> {
  const client = anthropicClient();
  const doCreate = () =>
    client.messages.create({
      ...params,
      output_config: { ...params.output_config, format: jsonSchemaFormat(schema) },
    });

  // Trace the call as a Langfuse generation when an operation name is given
  // (and keys are set); otherwise it is a plain create.
  const message = observationName
    ? await observeGeneration(
        {
          name: observationName,
          model: String(params.model),
          input: params.messages,
          modelParameters: { max_tokens: params.max_tokens },
          onTraceId,
        },
        doCreate,
        (m) => ({
          output: textOfContent(m.content),
          usage: { input: m.usage?.input_tokens, output: m.usage?.output_tokens },
        })
      )
    : await doCreate();

  if (message.stop_reason === "refusal") {
    throw new Error("Model declined the request");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Structured response hit max_tokens before completing");
  }
  return parseStructuredContent<T>(message.content);
}

/** Concatenate the text blocks of a message — used for the traced output. */
function textOfContent(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
