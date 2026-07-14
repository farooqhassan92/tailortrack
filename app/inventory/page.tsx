import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { Boxes } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-teal-500 to-emerald-500"
        description="Manage readymade items, unstitched fabric, stock levels, and inventory movements."
        eyebrow="Stock control"
        features={["Low-stock alerts", "Fabric and readymade tracking", "Inventory movement history"]}
        icon={Boxes}
        title="Inventory"
      />
    </AppShell>
  );
}
