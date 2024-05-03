/*

Copyright (c) 2019 - present AppSeed.us

*/
import { NextFunction, Request, Response } from "express";

import ActiveSession from "../models/activeSession";
import { connection } from "../server/database";

// eslint-disable-next-line import/prefer-default-export
export const checkToken = (req: Request, res: Response, next: NextFunction) => {
  const token = String(req.headers.authorization || req.body.token);
  const activeSessionRepository = connection!.getRepository(ActiveSession);

  return activeSessionRepository
    .find({ token })
    .then((session) => {
      if (session.length === 1) {
        return next(); // Call next() inside the resolved promise
      }
      return res.json({ success: false, msg: "User is not logged on" });
    })
    .catch((error) => {
      console.error(error); // Handle errors appropriately
      return res.status(500).json({ message: "Internal Server Error" });
    });
};
