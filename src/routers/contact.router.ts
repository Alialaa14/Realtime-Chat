import { isAuthenticated } from "../Middlewares/isAuthenticated.ts";
import { Router } from "express";
import {
  createContact,
  deleteContact,
  editContact,
} from "../Controllers/contact.controllers.ts";

const router = Router();

router
  .route("/")
  .post(isAuthenticated, createContact)
  .patch(isAuthenticated, editContact)
  .delete(isAuthenticated, deleteContact);

export default router;
