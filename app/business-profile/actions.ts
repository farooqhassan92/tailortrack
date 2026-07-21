"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { parseBusinessProfileForm } from "@/lib/business-profile-validation";
import { getSignedInUserProfile } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function businessProfilePath(status: string): Route {
  return `/business-profile?status=${status}` as Route;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "shop";
}

async function uniqueOrganizationSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function createBusinessProfile(formData: FormData) {
  const profile = await getSignedInUserProfile();
  const profileInput = parseBusinessProfileForm(formData);

  if (!profileInput.success) {
    redirect(businessProfilePath(profileInput.status));
  }

  const existingUser = await prisma.user.findUnique({
    include: {
      organizationMemberships: {
        where: {
          organization: {
            profileCompletedAt: {
              not: null
            }
          }
        },
        take: 1
      }
    },
    where: {
      email: profile.email
    }
  });

  if (existingUser?.organizationMemberships.length) {
    redirect("/dashboard");
  }

  const slug = await uniqueOrganizationSlug(profileInput.data.name);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      create: {
        email: profile.email,
        name: profile.name
      },
      update: {
        name: profile.name
      },
      where: {
        email: profile.email
      }
    });

    const organization = await tx.organization.create({
      data: {
        address: profileInput.data.address,
        city: profileInput.data.city,
        invoiceFooter: profileInput.data.invoiceFooter,
        name: profileInput.data.name,
        phone: profileInput.data.phone,
        profileCompletedAt: new Date(),
        slug
      }
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        role: "ADMIN",
        userId: user.id
      }
    });
  });

  redirect("/dashboard");
}
