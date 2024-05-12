import "dotenv/config";

import compression from "compression";
import cors from "cors";
/*

Copyright (c) 2024 - present liveos.io

*/
import express from "express";
import passport from "passport";

import initPassport from "../config/passport";
import usersRoutes from "../routes/users";
import containersRoutes from "../routes/containers";
import systemRoutes from "../routes/system";
import appStoreRoutes from "../routes/appstore";
import sessionRoutes from "../routes/session.route";
import { connect } from "./database";

// Instantiate express
const server = express();
server.use(compression());

// Passport Config
initPassport(passport);
server.use(passport.initialize());

// Connect to sqlite
if (process.env.NODE_ENV !== "test") {
  connect();
}

server.use(cors());
server.use(express.json());

// Initialize routes middleware
server.use("/api/users", usersRoutes);
server.use("/api/containers", containersRoutes);
server.use("/api/sessions", sessionRoutes);
server.use("/api/system", systemRoutes);
server.use("/api/apps", appStoreRoutes);

export default server;
