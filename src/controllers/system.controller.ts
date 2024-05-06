/* eslint-disable @typescript-eslint/comma-dangle */
import { Request, Response } from "express";
import SystemService from "../services/system.service";

export const getUtilization = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Create new service instance here
    const utilizationSystem = await new SystemService().getUtilizationSystem();
    res.json(utilizationSystem);
  } catch (error) {
    res.status(500).json({ message: "Error utilization System" });
  }
};

// Implement similar handler functions for other API endpoints related to System Utilization
// based on your feature requirements.
