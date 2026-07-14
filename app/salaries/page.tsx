import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { ChartNoAxesCombined } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-indigo-500 to-blue-500"
        description="Calculate tailor salaries from completed stitching orders and item rates."
        eyebrow="Payouts"
        features={["Completed order totals", "Item-rate calculations", "Tailor payout summaries"]}
        icon={ChartNoAxesCombined}
        title="Salaries"
      />
    </AppShell>
  );
}
