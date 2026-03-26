import { Router } from "express";
import claimsRoutes from "./claimsRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ message: "claims-service is running" });
});

router.use("/claims", claimsRoutes);

export default router;