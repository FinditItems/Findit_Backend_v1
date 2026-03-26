import { Router } from "express";
import {
  closePost,
  createPost,
  deletePost,
  getPostById,
  listPosts,
} from "../controllers/postsController";
import {
  optionalAuth,
  requireAuth,
  requireAuthOrInternal,
} from "../middlewares/auth";

const router = Router();

router.post("/", requireAuth, createPost);
router.get("/", optionalAuth, listPosts);
router.get("/:id", getPostById);
router.patch("/:id/close", requireAuthOrInternal, closePost);
router.delete("/:id", requireAuth, deletePost);

export default router;
