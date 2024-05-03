const Docker = require("dockerode");

interface Container {
  id: string;
  names: string[];
  image: string;
  status: string;
}

class DockerService {
  docker = new Docker(); // Or a different instantiation method

  constructor() {
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" }); // Replace with your Docker socket path
  }

  async listContainers(): Promise<Container[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map(
        (container: { Id: any; Names: any[]; Image: any; State: any }) => ({
          id: container.Id,
          names: container.Names[0],
          image: container.Image,
          status: container.State,
        })
      );
    } catch (error) {
      console.error("Error listing containers:", error);
      throw error; // Or handle the error gracefully and return an appropriate error message
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
