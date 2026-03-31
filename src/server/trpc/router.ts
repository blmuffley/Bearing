import { router } from './init';
import { assessmentsRouter } from './routers/assessments';
import { findingsRouter } from './routers/findings';
import { pathfinderRouter } from './routers/pathfinder';
import { sowRouter } from './routers/sow';
import { benchmarksRouter } from './routers/benchmarks';

export { publicProcedure, protectedProcedure } from './init';

export const appRouter = router({
  assessments: assessmentsRouter,
  findings: findingsRouter,
  pathfinder: pathfinderRouter,
  sow: sowRouter,
  benchmarks: benchmarksRouter,
});

export type AppRouter = typeof appRouter;
