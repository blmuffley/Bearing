import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource.',
    });
  }

  const { data: profile } = await ctx.supabase
    .from('users')
    .select('org_id')
    .eq('id', ctx.user.id)
    .single();

  if (!profile?.org_id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User is not associated with an organization.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      orgId: profile.org_id as string,
    },
  });
});
