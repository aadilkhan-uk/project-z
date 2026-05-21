export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      {/* Soft purple radial glow behind the content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[480px] w-[480px] rounded-full bg-[#ede9fe] opacity-50 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 text-center">
        {/* Logo mark */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 shadow-lg shadow-violet-200">
          <span className="text-2xl font-bold text-white">Z</span>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight text-[#1e1b2e]">
            Project Z
          </h1>
          <p className="text-violet-400 text-lg font-medium">
            Accounting software — coming soon.
          </p>
        </div>

        {/* Subtle pill badge */}
        <span className="rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-600">
          In development
        </span>
      </div>
    </div>
  );
}
