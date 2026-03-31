import Link from "next/link";

export default function SupportAdminPage() {
  return (
    <div className="min-h-screen bg-[#09090b] px-6 py-20 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Restricted
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Support admin is disabled in public deployments</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          This route previously exposed support feedback and knowledge-base editing without any real
          authentication. The public UI is now disabled by default.
        </p>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          If you need an internal support admin surface, enable it server-side with
          <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-zinc-200">FAIVR_ENABLE_SUPPORT_ADMIN=true</code>
          and a strong
          <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-zinc-200">FAIVR_SUPPORT_ADMIN_TOKEN</code>,
          then build a private operator workflow around those guarded APIs.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Back to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
