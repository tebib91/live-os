/* eslint-disable @typescript-eslint/comma-dangle */
import { Request, Response } from 'express';
import DockerService from '../services/docker.service';

export const getContainers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    // Create new service instance here
    const containers = await new DockerService().listContainers();
    res.json(containers);
  } catch (error) {
    res.status(500).json({ message: 'Error listing containers' });
  }
};
export const startContainer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const containerId = req.params.id; // Assuming container ID comes from the request path
    await new DockerService().startContainer(containerId); // Create new service instance here
    res.json({ message: 'Container started successfully' });
  } catch (error) {
    res.status(500).json({ message: `Error starting container: ${error}` });
  }
};

export const stopContainer = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const containerId = req.params.id; // Assuming container ID comes from the request path
    await new DockerService().stopContainer(containerId); // Create new service instance here
    res.json({ message: 'Container stopped successfully' });
  } catch (error) {
    res.status(500).json({ message: `Error stopping container: ${error}` });
  }
};

// Implement similar handler functions for other API endpoints related to Docker manipulation
// based on your feature requirements.
