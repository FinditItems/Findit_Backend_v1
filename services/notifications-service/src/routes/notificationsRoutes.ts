import { Router } from "express";
import {
  createNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationsController";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/notify", requireAuth, createNotification);
router.get("/notifications/me", requireAuth, getMyNotifications);
router.patch("/notifications/read-all", requireAuth, markAllNotificationsRead);
router.patch("/notifications/:id/read", requireAuth, markNotificationRead);

export default router;
