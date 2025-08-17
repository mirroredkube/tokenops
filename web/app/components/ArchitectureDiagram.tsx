import { LayoutDashboard, Cloud, Layers, Settings2, ShieldCheck, Database, Key, Activity, Archive } from "lucide-react";

export function ArchitectureDiagram() {
  const Box = ({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon: React.ElementType }) => (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        {title}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">{subtitle}</div>
      )}
    </div>
  );

  const VArrow = () => (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v16" strokeLinecap="round" />
      <path d="M6 14l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="rounded-2xl border bg-white p-8 shadow-md dark:bg-neutral-950 dark:border-neutral-800">
      {/* Top-down layered layout */}
      <div className="flex flex-col items-center gap-6">
        {/* Layer 1 */}
        <div className="grid gap-4 md:grid-cols-2 w-full max-w-3xl">
          <Box title="SaaS Dashboard" subtitle="Next.js UI • RBAC" icon={LayoutDashboard} />
          <Box title="Public API" subtitle="REST/JSON • Webhooks" icon={Cloud} />
        </div>
        <VArrow />

        {/* Layer 2 */}
        <div className="grid gap-4 md:grid-cols-3 w-full max-w-3xl">
          <Box title="Ledger Adapter" subtitle="XRPL now • Hedera next" icon={Layers} />
          <Box title="Token Engine" subtitle="Issue • Revoke • Transfer • Reports" icon={Settings2} />
          <Box title="Compliance Module" subtitle="KYC • AML • Audit trail" icon={ShieldCheck} />
        </div>
        <VArrow />

        {/* Layer 3 */}
        <div className="grid gap-4 md:grid-cols-2 w-full max-w-3xl">
          <Box title="Ledgers" subtitle="XRPL • Hedera" icon={Database} />
          <Box title="Key Management" subtitle="HSM/KMS • Secrets rotation" icon={Key} />
          <Box title="Observability" subtitle="Metrics • Alerts • Traces" icon={Activity} />
          <Box title="Evidence Store" subtitle="Logs • Exports" icon={Archive} />
        </div>
      </div>

      {/* Labels under diagram */}
      <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-neutral-700 dark:text-neutral-300">
        <span className="rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">Policies</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">RBAC</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">Metadata</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">Workflows</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">Single Sign-on</span>
      </div>
    </div>
  );
}
