import { describe, expect, it } from "vitest";
import { extractJsonObject, parseAnalysisResult, parseJsonObject } from "./analyse-parse";
import { analysisResult , analysisResultWire} from "@/test/fixtures";

describe("extractJsonObject", () => {
  it("returns a bare JSON object unchanged", () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it("strips surrounding prose", () => {
    expect(extractJsonObject('Sure! Here you go:\n{"a":1}\nHope that helps.')).toBe('{"a":1}');
  });

  it("strips markdown fences", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("keeps nested braces intact", () => {
    const json = '{"a":{"b":[1,2]},"c":"}"}';
    expect(JSON.parse(extractJsonObject(json))).toEqual(JSON.parse(json));
  });

  it("throws when there is no object at all", () => {
    expect(() => extractJsonObject("no json here")).toThrow(/No JSON object/);
  });
});

describe("parseAnalysisResult", () => {
  it("parses a complete result", () => {
    expect(parseAnalysisResult(JSON.stringify(analysisResult))).toEqual(analysisResultWire);
  });

  it("parses a result wrapped in prose", () => {
    const wrapped = `Here is the analysis:\n${JSON.stringify(analysisResult)}`;
    expect(parseAnalysisResult(wrapped).listing.brand).toBe("Carhartt");
  });

  it("throws on malformed JSON", () => {
    expect(() => parseAnalysisResult('{"listing": ')).toThrow();
  });

  it("throws when listing is missing", () => {
    const { listing: _omitted, ...rest } = analysisResult;
    expect(() => parseAnalysisResult(JSON.stringify(rest))).toThrow(/missing required/);
  });

  it("throws when tag_data is missing", () => {
    const { tag_data: _omitted, ...rest } = analysisResult;
    expect(() => parseAnalysisResult(JSON.stringify(rest))).toThrow(/missing required/);
  });
});

describe("normalizeAnalysisResult", () => {
  const listing = { brand: "Carhartt" } as never;
  const tag_data = { brand: "Carhartt" } as never;

  it("fills a well-formed photo_analysis when the model omits it", () => {
    const out = parseAnalysisResult(JSON.stringify({ listing, tag_data }));
    expect(out.photo_analysis).toEqual({
      scores: [],
      missing_shots: [],
      suggestions: [],
      has_tag_photo: false,
      ready_to_list: true,
    });
  });

  it("keeps a photo_analysis the model did provide", () => {
    const photo_analysis = { scores: [], missing_shots: [], suggestions: [], has_tag_photo: true, ready_to_list: false };
    const out = parseAnalysisResult(JSON.stringify({ listing, tag_data, photo_analysis }));
    expect(out.photo_analysis).toEqual(photo_analysis);
  });

  it("still throws when listing or tag_data is missing", () => {
    expect(() => parseAnalysisResult(JSON.stringify({ listing }))).toThrow();
    expect(() => parseAnalysisResult(JSON.stringify({ tag_data }))).toThrow();
  });
});

describe("escapeControlCharsInStrings (raw newlines in model output)", () => {
  const listing = { brand: "Carhartt" };
  const tag_data = { brand: "Carhartt" };

  it("parses a description that contains a real newline", () => {
    // A literal newline inside the string — what the model emits and what
    // JSON.parse would otherwise reject.
    const raw = `{"listing":${JSON.stringify(listing).slice(0, -1)},"description":"line one\nline two"},"tag_data":${JSON.stringify(tag_data)}}`;
    const out = parseAnalysisResult(raw);
    expect(out.listing).toBeDefined();
  });

  it("does not mangle already-escaped content", () => {
    const good = JSON.stringify({ listing, tag_data, extra: "a\nb\tc" });
    expect(() => parseAnalysisResult(good)).not.toThrow();
  });
});

describe("parseJsonObject", () => {
  it("parses an object carrying a raw newline inside a string value", () => {
    // Models routinely emit multi-line descriptions with real newlines, which
    // is invalid JSON — this is the exact input that used to drop the stream.
    const raw = '{"title":"Jacket","description":"Line one\nLine two"}';
    const parsed = parseJsonObject(raw) as { description: string };
    expect(parsed.description).toBe("Line one\nLine two");
  });

  it("parses a fenced object with a raw tab inside a string", () => {
    const raw = '```json\n{"a":"x\ty"}\n```';
    expect((parseJsonObject(raw) as { a: string }).a).toBe("x\ty");
  });
});
