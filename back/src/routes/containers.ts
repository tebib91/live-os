// import bcrypt from "bcrypt";
/*

Copyright (c) 2024 - present liveos.io

*/
import express from "express";
import { checkToken } from "../config/safeRoutes";
import {
  getContainers,
  startContainer,
  stopContainer,
} from "../controllers/docker.controller";
// import Joi from "joi";
// import jwt from "jsonwebtoken";

// import ActiveSession from "../models/activeSession";
// import User from "../models/user";
// import { connection } from "../server/database";

// eslint-disable-next-line new-cap
const router = express.Router();
// Route: <HOST>:PORT/api/containers/

router.get("/all", checkToken, getContainers);
router.post("/:id/start", checkToken, startContainer);
router.post("/:id/stop", checkToken, stopContainer);

export default router;
