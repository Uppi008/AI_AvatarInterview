import { cn } from "@/utils/cn";

interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface PillGroupProps<T extends string> {
  label: string;
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function PillGroup<T extends string>({ label, options, value, onChange, className }: PillGroupProps<T>) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}:</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors",
            value === option.value
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
