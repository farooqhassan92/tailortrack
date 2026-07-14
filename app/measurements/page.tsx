import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { Ruler } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-amber-500 to-orange-500"
        description="Save customer stitching measurements and style preferences."
        eyebrow="Fit library"
        features={["Reusable measurement cards", "Style preferences", "Customer fit history"]}
        icon={Ruler}
        title="Measurements"
      />
    </AppShell>
  );
}
