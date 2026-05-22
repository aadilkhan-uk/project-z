import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has("tl_access_token");

  // Already connected — send them where they were going
  if (hasToken) {
    const { next } = await searchParams;
    redirect(next ?? "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[480px] w-[480px] rounded-full bg-[#ede9fe] opacity-50 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 shadow-lg shadow-violet-200">
          <span className="text-2xl font-bold text-white">Z</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-[#1e1b2e]">
            Connect your bank
          </h1>
          <p className="max-w-sm text-violet-400 text-base font-medium">
            Link your UK bank account to get started. Your credentials are
            never shared with us.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <a
            href="/api/auth/truelayer"
            className="rounded-xl bg-violet-500 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-600 active:scale-95"
          >
            Connect bank account
          </a>
          <p className="text-xs text-zinc-400">
            Powered by TrueLayer · FCA regulated · PSD2 compliant
          </p>
        </div>
      </div>
    </div>
  );
}
