/* eslint-disable @typescript-eslint/comma-dangle */
import { Request, Response } from 'express';
import AppStoreServices from '../services/appstore.service';

export const getApps = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Create new service instance here
    const apps = await new AppStoreServices().fetchAppsData();

    res.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ message: 'Error to get apps' });
  }
};
