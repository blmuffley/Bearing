import { router } from './init';
import { assessmentsRouter } from './routers/assessments';
import { findingsRouter } from './routers/findings';
import { sowRouter } from './routers/sow';

export { publicProcedure, protectedProcedure } from './init';

export const appRouter = router({
  assessments: assessmentsRouter,
  findings: findingsRouter,
  sow: sowRouter,
});

export type AppRouter = typeof appRouter;
