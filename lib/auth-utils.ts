import { prisma } from "@/lib/prisma";

export async function hasUsersRaw(): Promise<boolean> {
  const count = await prisma.user.count();
  return count > 0;
}
