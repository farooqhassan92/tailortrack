import { NextResponse } from "next/server";

import { getCurrentOrganization } from "@/lib/organization";

export async function GET() {
  const organization = await getCurrentOrganization();

  return NextResponse.json({
    city: organization.city,
    name: organization.name,
    phone: organization.phone
  });
}
