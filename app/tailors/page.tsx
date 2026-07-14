import { AppShell } from "@/components/layout/app-shell";
import { ModulePreview } from "@/components/ui/module-preview";
import { Scissors } from "lucide-react";

export default function Page() {
  return (
    <AppShell>
      <ModulePreview
        accent="from-slate-700 to-slate-950"
        description="Manage tailor profiles, assigned work, completion records, and rates."
        eyebrow="Team workflow"
        features={["Tailor profiles", "Assigned work visibility", "Completion and rate records"]}
        icon={Scissors}
        title="Tailors"
      />
    </AppShell>
  );
}
