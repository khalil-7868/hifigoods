import { Badge } from "@/components/ui/badge";
import type { VehicleStatus } from "@/lib/database.types";

const config: Record<
  VehicleStatus,
  { label: string; variant: "profit" | "secondary" | "warning" | "expense" }
> = {
  active: { label: "Active", variant: "profit" },
  idle: { label: "Idle", variant: "secondary" },
  maintenance: { label: "Maintenance", variant: "warning" },
  retired: { label: "Retired", variant: "expense" },
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
