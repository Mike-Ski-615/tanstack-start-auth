import { createServerFn } from "@tanstack/react-start";
import { userIdSchema } from "#schemas/auth";
import { db } from "#prisma/db";
import { withUser } from "#lib/auth/middleware";
import { PUBLIC_COLUMNS, type User } from "#lib/auth/current-user";
import { getActivityForUser, type ActivityDay, type ActivityStats } from "#lib/activity";

export type { User };

export const getUserFn = createServerFn({
  method: "GET",
})
  .middleware([withUser])
  .handler(async ({ context }): Promise<User | null> => {
    return context.user;
  });

export type UserProfile = {
  user: User;
  calendar: ActivityDay[];
  stats: ActivityStats;
};

export const getUserById = createServerFn({
  method: "GET",
})
  .middleware([withUser])
  .validator(userIdSchema)
  .handler(async ({ data, context }): Promise<UserProfile | null> => {
    if (!context.user) return null;

    const user = await db.orm.public.User.where({ id: data.userId })
      .select(...PUBLIC_COLUMNS)
      .first();

    if (!user) return null;

    const { calendar, stats } = await getActivityForUser(data.userId);

    return { user, calendar, stats };
  });
