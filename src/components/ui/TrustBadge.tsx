import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function TrustBadge({ icon: Icon, title, description, className }: TrustBadgeProps) {
  return (
    <div className={cn("trust-badge", className)}>
      <Icon className="h-5 w-5 text-primary" />
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{title}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
    </div>
  );
}
