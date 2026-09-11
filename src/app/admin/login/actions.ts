"use server";

import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, setAdminCookie } from "@/lib/dashboard/auth";

export async function signIn(formData: FormData): Promise<void> {
  const candidate = String(formData.get("password") ?? "");
  if (!checkPassword(candidate)) redirect("/admin/login?error=1");
  await setAdminCookie();
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}
