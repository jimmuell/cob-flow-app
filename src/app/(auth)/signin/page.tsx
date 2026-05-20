import { redirect } from "next/navigation";
import { signInAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { USERS } from "@/lib/mock/users";
import { ROLE_LABELS } from "@/lib/mock/role-labels";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Middleware matcher excludes /signin to prevent redirect loops,
  // so authenticated-user redirect is handled here instead.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">
            CF
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-lg leading-tight">COB Flow</div>
            <div className="text-xs text-slate-500 leading-tight">Wisconsin pilot · MVP</div>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h1 className="text-lg font-semibold text-slate-800 mb-1">Sign in to your account</h1>
          <p className="text-xs text-slate-500 mb-5">Decision-support for coordination of benefits.</p>

          <form action={signInAction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@cobflow.dev"
                autoComplete="email"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                <span className="text-xs text-slate-400 cursor-default">Forgot password?</span>
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {decodeURIComponent(error)}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md py-2.5 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>

        {/* Demo accounts panel */}
        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-700">Demo accounts</div>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">Prototype only</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">Click a user to sign in without typing credentials.</p>
          <div className="space-y-1">
            {USERS.map((u) => {
              const roleLabel = ROLE_LABELS[u.role];
              return (
                <form key={u.id} action={signInAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 truncate">{u.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{u.id}@cobflow.demo</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap ${roleLabel.color}`}>
                      {roleLabel.label}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">COB Flow · v0.8</p>
      </div>
    </div>
  );
}
