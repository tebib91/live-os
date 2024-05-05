/*
Copyright (c) 2024 - present liveos.io
*/
import express from 'express';
import { checkToken } from '../config/safeRoutes';
import { getUtilization } from '../controllers/system.controller';

const router = express.Router();
// Route: <HOST>:PORT/api/containers/

router.get('/utilization', checkToken, getUtilization);

export default router;
