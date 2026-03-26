import { Router } from "express";
import { health } from "../controllers/healthController";
import notificationsRoutes from "./notificationsRoutes";

const router = Router();

router.get("/health", health);
router.use(notificationsRoutes);

export default router;
