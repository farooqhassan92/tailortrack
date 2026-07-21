import { AppShellClient } from "@/components/layout/app-shell-client";
import { getCurrentOrganization } from "@/lib/organization";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const organization = await getCurrentOrganization();
  const businessProfile = {
    city: organization.city,
    name: organization.name,
    phone: organization.phone
  };

  return (
    <AppShellClient businessProfile={businessProfile}>
      {children}
    </AppShellClient>
  );
}
