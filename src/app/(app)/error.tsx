"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full text-center space-y-3">
        <p className="text-sm font-semibold text-slate-800">Something went wrong</p>
        {process.env.NODE_ENV === "development" && (
          <p className="text-xs text-slate-500 font-mono">{error.message}</p>
        )}
        <button
          onClick={reset}
          className="text-sm text-brand-700 hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
