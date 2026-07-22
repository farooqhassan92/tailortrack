import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

function normalizeName(name: string | null | undefined, fallback: string) {
  return name?.trim() || fallback;
}

function primaryEmail(
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  userId: string
) {
  const primary = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  );

  return primary?.emailAddress || user.emailAddresses[0]?.emailAddress || `${userId}@clerk.local`;
}

function displayName(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  return (
    normalizeName(user.fullName, "") ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "TailorTrack Admin"
  );
}

export const getSignedInUserProfile = cache(async function getSignedInUserProfile() {
  const { userId } = await auth.protect();
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Signed-in Clerk user was not found.");
  }

  return {
    email: primaryEmail(clerkUser, userId),
    name: displayName(clerkUser)
  };
});

export const getCurrentOrganization = cache(async function getCurrentOrganization() {
  const profile = await getSignedInUserProfile();

  const user = await prisma.user.findUnique({
    include: {
      organizationMemberships: {
        include: {
          organization: true
        },
        where: {
          organization: {
            profileCompletedAt: {
              not: null
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        },
        take: 1
      }
    },
    where: {
      email: profile.email
    }
  });

  const membership = user?.organizationMemberships[0];

  if (!membership) {
    redirect("/business-profile");
  }

  if (user.name !== profile.name) {
    await prisma.user.update({
      data: {
        name: profile.name
      },
      where: {
        id: user.id
      }
    });
  }

  return membership.organization;
});

export const getCurrentOrganizationId = cache(async function getCurrentOrganizationId() {
  const organization = await getCurrentOrganization();
  return organization.id;
});
