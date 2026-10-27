export function FormaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1d4ed8" />
      <path fill="#ffffff" d="M11 9h3.6v14H11zm0 0h10v3.6H11zm0 6h7.4v3.6H11z" />
    </svg>
  );
}

export function FormaLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <FormaMark className="h-8 w-8 shrink-0" />
      <span className="text-sm font-semibold tracking-[0.22em] text-foreground">FORMA</span>
    </span>
  );
}
