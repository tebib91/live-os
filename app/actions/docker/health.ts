import { execAsync } from "./utils";

/**
 * Wait for a container to reach the "running" state with retry logic.
 */
export async function waitForContainerRunning(
  containerName: string,
  maxRetries = 5,
  intervalMs = 2000,
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { stdout } = await execAsync(
        `docker inspect --format '{{.State.Running}}' "${containerName}"`,
      );
      if (stdout.trim() === "true") return true;
    } catch {
      // Container may not exist yet
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return false;
}

/**
 * Get the exit code of a container (null if still running or not found).
 */
export async function getContainerExitCode(
  containerName: string,
): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format '{{.State.ExitCode}}' "${containerName}"`,
    );
    const code = parseInt(stdout.trim(), 10);
    return Number.isFinite(code) ? code : null;
  } catch {
    return null;
  }
}
