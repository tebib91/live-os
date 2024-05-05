/*
Copyright (c) 2024 - present liveos.io
*/
import express from 'express';
import { checkToken } from '../config/safeRoutes';
import { getContainers } from '../controllers/docker.controller';

const router = express.Router();
// Route: <HOST>:PORT/api/containers/

router.get('/utilization', checkToken, getContainers);

export default router;
