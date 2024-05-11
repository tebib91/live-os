/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/comma-dangle */
import Docker from "dockerode";

interface Container {
  id: string;
  names: string;
  labels: ContainerLabels;
  image: string;
  status: string;
}

interface ContainerLabels {
  project: string;
  service: string;
  version: string;
  imageName: string;
  imageVersion: string;
}

class DockerService {
  docker = new Docker(); // Or a different instantiation method

  constructor() {
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" }); // Replace with your Docker socket path
  }

  async listContainers(): Promise<Container[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });

      return containers.map((container) => ({
        id: container.Id,
        names: container.Names[0] as string,
        labels: {
          project: container.Labels["com.docker.compose.project"] || "default",
          service: container.Labels["com.docker.compose.service"] || "default",
          version: container.Labels["com.docker.compose.version"] || "unknown",
          imageName: "unknown",
          imageVersion:
            container.Labels["org.opencontainers.image.version"] || "unknown",
        },
        image: container.Image,
        status: container.State, // Note: Ensure that you are accessing the correct property for the status
      }));
    } catch (error) {
      console.error("Error listing containers:", error);
      throw error; // Consider handling or re-throwing the error based on your error handling strategy
    }
  }

  async startContainer(containerId: string): Promise<void> {
    try {
      await this.docker.getContainer(containerId).start();
    } catch (error) {
      console.error("Error starting container:", error);
      throw error; // Or handle the error gracefully
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      await this.docker.getContainer(containerId).stop();
    } catch (error) {
      console.error("Error stopping container:", error);
      throw error; // Or handle the error gracefully
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    try {
      await this.docker.getContainer(containerId).remove();
    } catch (error) {
      console.error("Error removing container:", error);
      throw error; // Or handle the error gracefully
    }
  }

  // (Optional) Implement functions for other actions (build image, view logs)
}

export default DockerService;
