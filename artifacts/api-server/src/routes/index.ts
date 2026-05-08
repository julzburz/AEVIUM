import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import dashboardRouter from "./dashboard";
import booksRouter from "./books";
import chaptersRouter from "./chapters";
import scenesRouter from "./scenes";
import charactersRouter from "./characters";
import locationsRouter from "./locations";
import worldRulesRouter from "./worldRules";
import memoryRouter from "./memory";
import timelineRouter from "./timeline";
import styleGuideRouter from "./styleGuide";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(dashboardRouter);
router.use(booksRouter);
router.use(chaptersRouter);
router.use(scenesRouter);
router.use(charactersRouter);
router.use(locationsRouter);
router.use(worldRulesRouter);
router.use(memoryRouter);
router.use(timelineRouter);
router.use(styleGuideRouter);

export default router;
