import { Router } from "express";
import { matchPost } from "../controllers/matchingController";

const router = Router();

router.post("/match", matchPost);

export default router;