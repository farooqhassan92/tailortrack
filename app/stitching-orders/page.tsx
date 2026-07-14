import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { ClipboardList } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-rose-500 to-pink-500"
        description="Create custom stitching orders, assign tailors, and track order status."
        eyebrow="Production queue"
        features={["Custom order intake", "Tailor assignment", "Ready and delivered status"]}
        icon={ClipboardList}
        title="Stitching Orders"
      />
    </AppShell>
  );
}
