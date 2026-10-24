export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = 'size-6', label }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg
        className={`animate-spin text-current ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        />
      </svg>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </span>
  );
}
