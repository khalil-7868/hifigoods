import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Accent = "violet" | "emerald" | "rose" | "sky" | "amber";

const chip: Record<Accent, string> = {
  violet: "bg-primary/15 text-primary",
  emerald: "bg-profit/15 text-profit",
  rose: "bg-expense/15 text-expense",
  sky: "bg-info/15 text-info",
  amber: "bg-warning/15 text-warning",
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  accent = "violet",
  comingSoon = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: Accent;
  comingSoon?: boolean;
}) {
  return (
    <Card className="relative flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl",
            chip[accent],
          )}
          aria-hidden
        >
          <Icon className="size-5" />
        </div>
        {comingSoon && (
          <Badge variant="secondary" className="text-xs">
            Coming soon
          </Badge>
        )}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}
