// Components
import Avatar from "@/components/atoms/avatar";

// Types
import type { AvatarInfoProps } from "@/types/interfaces";

export default function AvatarInfo({
  src,
  title,
  subtitle,
  size = "default",
}: AvatarInfoProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={title} src={src} size={size} />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{title}</span>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
