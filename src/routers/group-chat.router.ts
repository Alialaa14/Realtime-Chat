import { Router } from "express";
import { isAuthenticated } from "../Middlewares/isAuthenticated.ts";
import { upload } from "../utils/multer.ts";
import {
  createGroupChat,
  editGroupChat,
  addAdminsToGroup,
  removeAdminFromGroup,
  getGroupChats,
} from "../Controllers/chat-group.controllers.ts";
import { isAdmin } from "../Middlewares/isAuthorizedToGroup.ts";

const router = Router();

router
  .route("/")
  .post(isAuthenticated, upload.single("picture"), createGroupChat)
  .patch(isAuthenticated, isAdmin(), upload.single("picture"), editGroupChat)
  .get(isAuthenticated, getGroupChats);

router
  .route("/admin")
  .post(isAuthenticated, isAdmin(), addAdminsToGroup)
  .delete(isAuthenticated, isAdmin(), removeAdminFromGroup);
export default router;
