import { withAuth } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase";
import {
  getProfile,
  InvalidPlatformSet,
  InvalidPreferredPlatform,
  setEnabledPlatforms,
  setPreferredPlatform,
  setSellerNotes,
  validatePlatformSet,
  validatePreferredPlatform,
} from "@/lib/profile";
import type { Profile } from "@/lib/profile";
import { InvalidSellerNotes, validateSellerNotes } from "@/lib/seller-notes";

export const runtime = "nodejs";

function body(profile: Profile) {
  return {
    enabled_platforms: profile.enabledPlatforms,
    preferred_platform: profile.preferredPlatform,
    seller_notes: profile.sellerNotes,
    allowance: {
      used: profile.allowance.used,
      limit: profile.allowance.limit,
      resets_at: profile.allowance.resetsAt,
    },
  };
}

/**
 * The caller's Enabled Platforms, Preferred Platform, and Allowance. Read as
 * the caller, so RLS scopes it to their own row.
 */
export const GET = withAuth(async (_request, user) => {
  try {
    return Response.json(body(await getProfile(user.token)));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});

interface PatchBody {
  enabled_platforms?: unknown;
  preferred_platform?: unknown;
  seller_notes?: unknown;
}

/**
 * Either field may be sent alone or together. Sending both is how a client
 * disables the preferred platform and names its replacement in one request.
 */
export const PATCH = withAuth(async (request, user) => {
  let patch: PatchBody;
  try {
    patch = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    patch.enabled_platforms === undefined &&
    patch.preferred_platform === undefined &&
    patch.seller_notes === undefined
  ) {
    return Response.json(
      { error: "enabled_platforms, preferred_platform or seller_notes is required" },
      { status: 400 }
    );
  }

  try {
    let profile: Profile;

    if (patch.seller_notes !== undefined) {
      profile = await setSellerNotes(user.token, user.id, validateSellerNotes(patch.seller_notes));
    } else if (patch.enabled_platforms !== undefined) {
      const platforms = validatePlatformSet(patch.enabled_platforms);
      const preferred =
        patch.preferred_platform !== undefined
          ? validatePreferredPlatform(patch.preferred_platform, platforms)
          : undefined;
      profile = await setEnabledPlatforms(user.token, user.id, platforms, preferred);
    } else {
      const current = await getProfile(user.token);
      const preferred = validatePreferredPlatform(patch.preferred_platform, current.enabledPlatforms);
      profile = await setPreferredPlatform(user.token, user.id, preferred);
    }

    return Response.json(body(profile));
  } catch (err) {
    if (
      err instanceof InvalidPlatformSet ||
      err instanceof InvalidPreferredPlatform ||
      err instanceof InvalidSellerNotes
    ) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
});

/**
 * Deletes the caller's account. Required by App Review for any app with
 * account creation (5.1.1). The auth user goes through the service role —
 * nothing else can delete from auth.users — and the profile row follows by
 * cascade. Only ever the authenticated caller's own id: it comes from the
 * verified token, never from the request.
 */
export const DELETE = withAuth(async (_request, user) => {
  const { error } = await serviceClient().auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: `Could not delete account: ${error.message}` }, { status: 500 });
  }
  return new Response(null, { status: 204 });
});
