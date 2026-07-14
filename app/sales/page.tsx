import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { CreditCard } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-sky-500 to-cyan-500"
        description="Create sales, invoices, payments, and track daily shop revenue."
        eyebrow="Billing"
        features={["Invoice creation", "Payment collection", "Daily revenue reports"]}
        icon={CreditCard}
        title="Sales"
      />
    </AppShell>
  );
}
