/*
Copyright (c) 2024 - present liveos.io
*/
import express from 'express';
import { checkToken } from '../config/safeRoutes';
import { getApps } from '../controllers/apps.controller';

const router = express.Router();
// Route: <HOST>:PORT/api/containers/

router.get('/all', checkToken, getApps);

export default router;
