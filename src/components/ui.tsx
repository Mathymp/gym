import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-lime text-ink shadow-[0_10px_24px_rgba(29,78,216,0.28)] hover:bg-lime-deep",
        surface: "border border-line bg-surface text-foreground shadow-sm hover:bg-raised",
        ghost: "bg-transparent text-foreground hover:bg-raised",
        danger: "border border-danger/30 bg-surface text-danger",
      },
      size: {
        md: "h-11 px-4 text-sm",
        lg: "h-14 px-5 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <input
        id={id}
        className={cn(
          "h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none placeholder:text-faint",
          className,
        )}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm text-danger">{error}</span> : null}
      {hint && !error ? <span className="mt-2 block text-sm text-faint">{hint}</span> : null}
    </label>
  );
}

export function AreaField({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <textarea id={id} className="min-h-24 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base outline-none" {...props} />
    </label>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-[#122033]/40" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-lg overflow-auto rounded-t-[28px] bg-surface px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(18,32,51,0.16)]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="h-11 px-2 text-sm text-muted" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  unit,
  step,
  onChange,
  min = 0,
  max = 500,
}: {
  label: string;
  value: number | null;
  unit: string;
  step: number;
  min?: number;
  max?: number;
  onChange: (value: number | null) => void;
}) {
  const change = (delta: number) => {
    const base = value ?? 0;
    const next = Math.round((base + delta) * 100) / 100;
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <div className="flex min-w-0 flex-1 items-center rounded-2xl bg-raised">
      <button type="button" className="h-12 w-11 shrink-0 text-xl" aria-label={`Bajar ${label}`} onClick={() => change(-step)}>
        −
      </button>
      <label className="flex min-w-0 flex-1 flex-col items-center">
        <span className="sr-only">{label}</span>
        <input
          inputMode="decimal"
          className="w-full min-w-0 bg-transparent text-center text-lg tabular outline-none"
          value={value ?? ""}
          placeholder="0"
          onChange={(event) => {
            const raw = event.target.value.replace(",", ".");
            if (raw === "") onChange(null);
            else if (/^\d*\.?\d*$/.test(raw)) onChange(Number(raw));
          }}
        />
        <span className="text-[11px] text-faint">{unit}</span>
      </label>
      <button type="button" className="h-12 w-11 shrink-0 text-xl" aria-label={`Subir ${label}`} onClick={() => change(step)}>
        +
      </button>
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto flex w-full max-w-lg flex-col gap-8 px-4 pt-6 md:max-w-3xl md:px-8", className)}>{children}</div>;
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-xs tracking-[0.16em] text-muted uppercase">{children}</p>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border-t border-line py-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border-t border-line py-6">
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <button className="mt-3 h-11 text-sm font-semibold text-lime" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
