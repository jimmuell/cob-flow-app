import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full text-center space-y-3">
        <p className="text-sm font-semibold text-slate-800">404 — Page not found</p>
        <p className="text-xs text-slate-500">
          The page you are looking for does not exist.
        </p>
        <Link href="/dashboard" className="text-sm text-brand-700 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
