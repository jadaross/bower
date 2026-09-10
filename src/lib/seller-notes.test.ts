import { describe, expect, it } from "vitest";
import { sellerNotesLine, sellerNotesPrompt, validateSellerNotes } from "./seller-notes";

describe("validateSellerNotes", () => {
  it("accepts the vocabulary, deduplicated, in canonical order", () => {
    expect(validateSellerNotes(["bundles", "smoke_free", "bundles"])).toEqual(["smoke_free", "bundles"]);
  });

  it("accepts an empty list", () => {
    expect(validateSellerNotes([])).toEqual([]);
  });

  it("rejects anything outside the vocabulary", () => {
    expect(() => validateSellerNotes(["washed"])).toThrow(/Unknown seller note/);
    expect(() => validateSellerNotes("smoke_free")).toThrow(/must be a list/);
  });
});

describe("sellerNotesLine", () => {
  it("is empty when nothing is on", () => {
    expect(sellerNotesLine([], "vinted")).toBe("");
  });

  it("folds smoke and pets into one sentence", () => {
    expect(sellerNotesLine(["smoke_free", "pet_free"], "vinted")).toBe("From a smoke-free, pet-free home.");
    expect(sellerNotesLine(["pet_free", "smoke_free"], "depop")).toBe("smoke and pet free home");
  });

  it("writes each platform in its own register", () => {
    expect(sellerNotesLine(["smoke_free", "bundles"], "vinted")).toBe("From a smoke-free home. Happy to bundle.");
    expect(sellerNotesLine(["posts_next_day", "bundles"], "depop")).toBe("ships next day, bundle for a discount");
    expect(sellerNotesLine(["posts_next_day"], "ebay")).toBe("Dispatched within 1 working day.");
  });
});

describe("sellerNotesPrompt", () => {
  it("tells the model to say nothing when nothing is on", () => {
    expect(sellerNotesPrompt([], "vinted")).toMatch(/Say nothing about the seller/);
  });

  it("hands the model the exact line to end with", () => {
    const p = sellerNotesPrompt(["smoke_free"], "vinted");
    expect(p).toContain('"From a smoke-free home."');
    expect(p).toMatch(/word for word/);
  });
});
