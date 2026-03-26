import { Router } from "express";
import { health } from "../controllers/healthController";
import authRoutes from "./authRoutes";
import postsRoutes from "./postsRoutes";

const router = Router();

router.get("/", health);
router.get("/health", health);
router.use("/auth", authRoutes);
router.use("/posts", postsRoutes);

export default router;
