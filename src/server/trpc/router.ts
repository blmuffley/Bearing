import { router } from './init';
import { assessmentsRouter } from './routers/assessments';
import { findingsRouter } from './routers/findings';

export { publicProcedure, protectedProcedure } from './init';

export const appRouter = router({
  assessments: assessmentsRouter,
  findings: findingsRouter,
});

export type AppRouter = typeof appRouter;
