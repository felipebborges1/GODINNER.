import Link from "next/link";

const variants = {
  solid: "bg-stone-950 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white",
  accent: "bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-400 dark:text-stone-950 dark:hover:bg-orange-300",
  soft: "bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700",
} as const;

type ButtonProps = {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
};

const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950 disabled:cursor-not-allowed disabled:opacity-50";

export function Button({ children, variant = "solid", className = "", href, type = "button", disabled, onClick, "aria-label": ariaLabel }: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${className}`;
  if (href) return <Link href={href} className={classes} aria-label={ariaLabel} onClick={onClick}>{children}</Link>;
  return <button type={type} className={classes} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>{children}</button>;
}
