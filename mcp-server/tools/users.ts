import { prisma } from "../lib/prisma";

/**
 * get_user_info — returns profile and usage stats for a user.
 */
export async function getUserInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { documents: true, conversations: true },
      },
    },
  });

  if (!user) throw new Error(`User not found: ${userId}`);

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl ?? null,
    stats: {
      documents: user._count.documents,
      conversations: user._count.conversations,
      loginCount: user.loginCount,
    },
    activity: {
      firstLoginAt: user.firstLoginAt?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      timezone: user.timezone ?? null,
    },
    joinedAt: user.createdAt.toISOString(),
  };
}
