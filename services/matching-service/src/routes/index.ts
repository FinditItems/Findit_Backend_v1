import { Router } from "express";
import { health } from "../controllers/healthController";
import matchingRoutes from "./matchingRoutes";

const router = Router();

router.get("/health", health);
router.use(matchingRoutes);

export default router;