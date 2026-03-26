import { Router } from "express";
import {
  submitClaim,
  getMyClaims,
  getReceivedClaims,
  getClaimById,
  approveClaim,
  rejectClaim,
  cancelClaim,
} from "../controllers/claimsController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/", authenticate, submitClaim);
router.get("/mine", authenticate, getMyClaims);
router.get("/received", authenticate, getReceivedClaims);
router.get("/:id", authenticate, getClaimById);
router.patch("/:id/approve", authenticate, approveClaim);
router.patch("/:id/reject", authenticate, rejectClaim);
router.patch("/:id/cancel", authenticate, cancelClaim);

export default router;