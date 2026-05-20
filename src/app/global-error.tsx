"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">Something went wrong</p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-xs text-slate-500 font-mono">{error.message}</p>
            )}
            <button
              onClick={reset}
              className="text-sm text-blue-700 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
