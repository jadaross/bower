import { redirect } from "next/navigation";
import { dashboardConfigured, isAdmin } from "@/lib/dashboard/auth";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const configured = dashboardConfigured();
  return (
    <main className="signin">
      <form action={signIn}>
        <div className="wordmark">bower<b>.</b><small>dashboard</small></div>
        {configured ? (
          <>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
            {error && <p className="err">That is not it.</p>}
            <button type="submit">Open</button>
          </>
        ) : (
          <p className="why">
            No <code>DASHBOARD_PASSWORD</code> is set for this deployment, so there is nothing to sign in to. Add one in Vercel (or <code>.env.local</code>) and reload.
          </p>
        )}
      </form>
    </main>
  );
}
