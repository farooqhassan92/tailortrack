import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-violet-500 to-fuchsia-500"
        description="Store customer profiles, contact details, order history, and balances."
        eyebrow="Client records"
        features={["Customer profiles", "Order and payment history", "Outstanding balance tracking"]}
        icon={Users}
        title="Customers"
      />
    </AppShell>
  );
}
