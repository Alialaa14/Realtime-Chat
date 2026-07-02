import { Router } from "express";
import { isAuthenticated } from "../Middlewares/isAuthenticated.ts";
import { upload } from "../utils/multer.ts";
import {
  createGroupChat,
  editGroupChat,
  addAdminsToGroup,
  removeAdminFromGroup,
  getGroupChats,
  removeMembers,
  addMembers,
  getGroupChat,
  deleteGroupChat,
  exitGroupChat,
} from "../Controllers/chat-group.controllers.ts";
import { isAdmin } from "../Middlewares/isAuthorizedToGroup.ts";

const router = Router();

router
  .route("/")
  .post(isAuthenticated, upload.single("picture"), createGroupChat)
  .get(isAuthenticated, getGroupChats);

router
  .route("/:id")
  .patch(isAuthenticated, isAdmin(), upload.single("picture"), editGroupChat)
  .get(isAuthenticated, getGroupChat)
  .delete(isAuthenticated, deleteGroupChat);

router
  .route("/:id/members")
  .post(isAuthenticated, addMembers)
  .delete(isAuthenticated, removeMembers);

router
  .route("/:id/admins")
  .post(isAuthenticated, isAdmin(), addAdminsToGroup)
  .delete(isAuthenticated, isAdmin(), removeAdminFromGroup);

router.route("/:id/members/me").delete(isAuthenticated, exitGroupChat);

export default router;
