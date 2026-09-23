import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { parseStructuredContent } from "./structured";

const text = (t: string) => ({ type: "text", text: t, citations: null }) as Anthropic.Messages.TextBlock;
const search = { type: "server_tool_use", id: "s", name: "web_search", input: {} } as unknown as Anthropic.Messages.ContentBlock;

describe("parseStructuredContent", () => {
  it("parses one document", () => {
    expect(parseStructuredContent([text('{"low":1}')])).toEqual({ low: 1 });
  });

  it("joins a document that citations split across blocks", () => {
    expect(parseStructuredContent([text('{"low":'), text("1}")])).toEqual({ low: 1 });
  });

  it("takes the last document when the model answered, searched again and answered again", () => {
    const content = [text('{"low":1}'), search, text('{"low":'), text("2}")];
    expect(parseStructuredContent(content)).toEqual({ low: 2 });
  });

  it("still throws on text that is not JSON", () => {
    expect(() => parseStructuredContent([text("not json")])).toThrow(SyntaxError);
  });

  it("throws when there is no text", () => {
    expect(() => parseStructuredContent([search])).toThrow(/no text content/);
  });
});
