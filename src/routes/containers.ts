/*
Copyright (c) 2024 - present liveos.io
*/
import express from 'express';
import { checkToken } from '../config/safeRoutes';
import {
  getContainers,
  startContainer,
  stopContainer,
} from '../controllers/docker.controller';

const router = express.Router();
// Route: <HOST>:PORT/api/containers/

router.get('/all', checkToken, getContainers);
router.post('/:id/start', checkToken, startContainer);
router.post('/:id/stop', checkToken, stopContainer);

export default router;
