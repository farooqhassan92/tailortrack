"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getSignedInUserProfile } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

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
  const name = readString(formData, "name");
  const phone = readString(formData, "phone") || null;
  const city = readString(formData, "city") || null;
  const address = readString(formData, "address") || null;

  if (!name) {
    redirect(businessProfilePath("missing-name"));
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

  const slug = await uniqueOrganizationSlug(name);

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
        address,
        city,
        name,
        phone,
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
