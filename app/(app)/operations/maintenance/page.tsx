import type { Metadata } from "next";
import { MaintenanceView } from "@/components/maintenance/maintenance-view";
import { getVehicles } from "@/lib/queries";
import { getMaintenanceFees, getMechanics } from "@/lib/maintenance-data";
import { monthKey } from "@/lib/maintenance";

export const metadata: Metadata = { title: "Maintenance" };
export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const [vehicles, fees, mechanics] = await Promise.all([
    getVehicles(),
    getMaintenanceFees(),
    getMechanics(),
  ]);

  return (
    <MaintenanceView
      vehicles={vehicles}
      fees={fees}
      mechanics={mechanics}
      currentMonth={monthKey(new Date())}
    />
  );
}
