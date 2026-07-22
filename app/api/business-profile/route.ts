import { getCurrentOrganization } from "@/lib/organization";
import { noStoreJson } from "@/lib/security";

export async function GET() {
  const organization = await getCurrentOrganization();

  return noStoreJson({
    city: organization.city,
    name: organization.name,
    phone: organization.phone
  });
}
