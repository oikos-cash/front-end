// Components
import { ProgressBarProps } from "@/types/interfaces";

// Utils
import { cn } from "@/utils/object";

export default function ProgressBar({
  value,
  max,
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
