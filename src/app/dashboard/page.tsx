export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[480px] w-[480px] rounded-full bg-[#ede9fe] opacity-50 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 shadow-lg shadow-violet-200">
          <span className="text-2xl font-bold text-white">Z</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1e1b2e]">
          Bank connected!
        </h1>
        <p className="text-violet-400 text-base font-medium">
          Your account has been linked successfully.
        </p>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-600">
          Transactions coming soon
        </span>
      </div>
    </div>
  );
}
