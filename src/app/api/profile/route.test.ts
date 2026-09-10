import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => (await import("@/test/auth-mock")).authMock());

const getProfile = vi.fn();
const setEnabledPlatforms = vi.fn();
const setPreferredPlatform = vi.fn();
const setSellerNotes = vi.fn();
vi.mock("@/lib/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/profile")>()),
  getProfile,
  setEnabledPlatforms,
  setPreferredPlatform,
  setSellerNotes,
}));

const deleteUser = vi.fn();
vi.mock("@/lib/supabase", () => ({
  serviceClient: () => ({ auth: { admin: { deleteUser } } }),
}));

const { authState, resetAuthState } = await import("@/test/auth-mock");
const { GET, PATCH, DELETE } = await import("./route");

const profile = {
  enabledPlatforms: ["vinted", "depop"],
  preferredPlatform: "depop",
  sellerNotes: [],
  allowance: { used: 4, limit: 20, resetsAt: "2026-09-01T00:00:00.000Z" },
};

function get() {
  return new Request("http://localhost/api/profile");
}

function patch(body: unknown, raw?: string) {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  resetAuthState();
  deleteUser.mockReset();
  deleteUser.mockResolvedValue({ data: {}, error: null });
  getProfile.mockReset();
  setEnabledPlatforms.mockReset();
  setPreferredPlatform.mockReset();
  getProfile.mockResolvedValue(profile);
  setEnabledPlatforms.mockImplementation(async (_t, _u, platforms, preferred) => ({
    ...profile,
    enabledPlatforms: platforms,
    preferredPlatform: platforms.includes(preferred ?? profile.preferredPlatform)
      ? (preferred ?? profile.preferredPlatform)
      : platforms[0],
  }));
  setPreferredPlatform.mockImplementation(async (_t, _u, preferred) => ({
    ...profile,
    preferredPlatform: preferred,
  }));
  setSellerNotes.mockReset();
  setSellerNotes.mockImplementation(async (_t, _u, notes) => ({ ...profile, sellerNotes: notes }));
});

describe("GET /api/profile", () => {
  it("returns the caller's platforms and Allowance", async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      enabled_platforms: ["vinted", "depop"],
      preferred_platform: "depop",
      seller_notes: [],
      allowance: { used: 4, limit: 20, resets_at: "2026-09-01T00:00:00.000Z" },
    });
  });

  it("reads the profile of the authenticated caller", async () => {
    await GET(get());
    expect(getProfile).toHaveBeenCalledWith("test-access-token");
  });

  it("401s without a bearer token", async () => {
    authState.userId = null;
    expect((await GET(get())).status).toBe(401);
  });

  it("500s when the profile cannot be read", async () => {
    getProfile.mockRejectedValue(new Error("permission denied"));
    expect((await GET(get())).status).toBe(500);
  });
});

describe("PATCH /api/profile", () => {
  it("updates the platform set and returns the whole profile", async () => {
    const res = await PATCH(patch({ enabled_platforms: ["vinted"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      enabled_platforms: ["vinted"],
      preferred_platform: "vinted",
    });
  });

  it("writes as the authenticated caller, for their own row", async () => {
    await PATCH(patch({ enabled_platforms: ["vinted"] }));
    expect(setEnabledPlatforms).toHaveBeenCalledWith(
      "test-access-token", "test-user-id", ["vinted"], undefined
    );
  });

  it("updates the preferred platform alone", async () => {
    const res = await PATCH(patch({ preferred_platform: "vinted" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ preferred_platform: "vinted" });
    expect(setPreferredPlatform).toHaveBeenCalledWith("test-access-token", "test-user-id", "vinted");
  });

  it("updates the seller notes alone, deduplicated and in canonical order", async () => {
    const res = await PATCH(patch({ seller_notes: ["bundles", "smoke_free", "bundles"] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ seller_notes: ["smoke_free", "bundles"] });
    expect(setSellerNotes).toHaveBeenCalledWith("test-access-token", "test-user-id", ["smoke_free", "bundles"]);
  });

  it("400s on an unknown seller note", async () => {
    const res = await PATCH(patch({ seller_notes: ["smoke_free", "washed"] }));
    expect(res.status).toBe(400);
    expect(setSellerNotes).not.toHaveBeenCalled();
  });

  it("400s on a preferred platform that is not enabled", async () => {
    const res = await PATCH(patch({ preferred_platform: "ebay" }));
    expect(res.status).toBe(400);
    expect(setPreferredPlatform).not.toHaveBeenCalled();
  });

  it("accepts both fields in one request — disabling the preferred one and naming its replacement", async () => {
    const res = await PATCH(patch({ enabled_platforms: ["vinted", "ebay"], preferred_platform: "ebay" }));
    expect(res.status).toBe(200);
    expect(setEnabledPlatforms).toHaveBeenCalledWith(
      "test-access-token", "test-user-id", ["vinted", "ebay"], "ebay"
    );
  });

  it("400s when neither field is sent", async () => {
    expect((await PATCH(patch({}))).status).toBe(400);
  });

  it("401s without a bearer token", async () => {
    authState.userId = null;
    const res = await PATCH(patch({ enabled_platforms: ["vinted"] }));
    expect(res.status).toBe(401);
    expect(setEnabledPlatforms).not.toHaveBeenCalled();
  });

  it("400s on unparsable JSON", async () => {
    expect((await PATCH(patch(null, "{"))).status).toBe(400);
  });

  it("400s on an empty platform set", async () => {
    const res = await PATCH(patch({ enabled_platforms: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/At least one platform/);
  });

  it("400s on an unknown platform", async () => {
    const res = await PATCH(patch({ enabled_platforms: ["grailed"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown platform/);
  });

  it("400s when the field is missing entirely", async () => {
    expect((await PATCH(patch({}))).status).toBe(400);
  });

  it("does not write when validation fails", async () => {
    await PATCH(patch({ enabled_platforms: [] }));
    expect(setEnabledPlatforms).not.toHaveBeenCalled();
  });

  it("500s when the write is refused", async () => {
    setEnabledPlatforms.mockRejectedValue(new Error("permission denied"));
    expect((await PATCH(patch({ enabled_platforms: ["vinted"] }))).status).toBe(500);
  });
});

describe("DELETE /api/profile", () => {
  function del() {
    return new Request("http://localhost/api/profile", { method: "DELETE" });
  }

  it("deletes the caller's own auth user, by the id from the verified token", async () => {
    const res = await DELETE(del());
    expect(res.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith("test-user-id");
  });

  it("401s without a bearer token, and deletes nothing", async () => {
    authState.userId = null;
    expect((await DELETE(del())).status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("500s when the auth admin call fails", async () => {
    deleteUser.mockResolvedValue({ data: null, error: { message: "nope" } });
    expect((await DELETE(del())).status).toBe(500);
  });
});
