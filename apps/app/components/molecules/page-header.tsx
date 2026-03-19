// Components
import Breadcrumb from "@/components/atoms/breadcrumb";

// Types
import type { PageHeaderProps } from "@/types/interfaces";

export default function PageHeader({
  title,
  description,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} />
      )}
    </div>
  );
}
