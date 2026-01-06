import { Check, Shield, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeVariant = "verified" | "traditional" | "digital" | "trust";

interface VerificationBadgeProps {
  variant?: BadgeVariant;
  label?: string;
  className?: string;
}

const badgeConfig = {
  verified: {
    icon: Check,
    label: "Human Verified",
    className: "verified-badge",
  },
  traditional: {
    icon: Paintbrush,
    label: "Traditional Artist",
    className: "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground",
  },
  digital: {
    icon: Paintbrush,
    label: "Digital Artist",
    className: "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground",
  },
  trust: {
    icon: Shield,
    label: "Trusted",
    className: "trust-badge",
  },
};

export function VerificationBadge({
  variant = "verified",
  label,
  className,
}: VerificationBadgeProps) {
  const config = badgeConfig[variant];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <span className={cn(config.className, className)}>
      <Icon className="h-3 w-3" />
      {displayLabel}
    </span>
  );
}
