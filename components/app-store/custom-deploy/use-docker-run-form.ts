import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import {
  ensureEnvRows,
  ensurePortRows,
  ensureVolumeRows,
  parseEnvVars,
  parseImageAndTag,
  parsePorts,
  parseVolumes,
  type EnvVarRow,
  type NetworkType,
  type PortMapping,
  type VolumeMount,
} from "./docker-run-utils";

type DockerRunInitialData = {
  image?: string;
  containerName?: string;
  ports?: string;
  volumes?: string;
  env?: string;
};

type UseDockerRunFormArgs = {
  open: boolean;
  dockerRun?: DockerRunInitialData;
  appIcon?: string;
};

export function useDockerRunForm({ open, dockerRun, appIcon }: UseDockerRunFormArgs) {
  const idRef = useRef(0);
  const nextId = useCallback((prefix: string) => {
    idRef.current += 1;
    return `${prefix}-${idRef.current}`;
  }, []);
  const tagManualRef = useRef(false);

  const initialImageParts = parseImageAndTag(dockerRun?.image ?? "");
  const [imageName, setImageName] = useState(initialImageParts.image);
  const [imageTag, setImageTag] = useState(initialImageParts.tag);
  const [containerName, setContainerName] = useState(dockerRun?.containerName ?? "");
  const [iconUrl, setIconUrl] = useState(appIcon ?? "");
  const [portMappings, setPortMappings] = useState<PortMapping[]>([
    { id: "port-0", host: "", container: "" },
  ]);
  const [volumeMounts, setVolumeMounts] = useState<VolumeMount[]>([
    { id: "volume-0", host: "", container: "" },
  ]);
  const [envVarRows, setEnvVarRows] = useState<EnvVarRow[]>([
    { id: "env-0", key: "", value: "" },
  ]);
  const [networkType, setNetworkType] = useState<NetworkType>("bridge");
  const [webUIPort, setWebUIPort] = useState("");

  // Reset the form when the dialog opens or initial data changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    idRef.current = 0;
    tagManualRef.current = false;

    const parts = parseImageAndTag(dockerRun?.image ?? "");
    tagManualRef.current = Boolean(parts.tag);
    setImageName(parts.image);
    setImageTag(parts.tag);
    setContainerName(dockerRun?.containerName ?? "");
    setIconUrl(appIcon ?? "");

    const parsedPorts = ensurePortRows(parsePorts(dockerRun?.ports, nextId), nextId);
    const parsedVolumes = ensureVolumeRows(
      parseVolumes(dockerRun?.volumes, nextId),
      nextId,
    );
    const parsedEnvVars = ensureEnvRows(parseEnvVars(dockerRun?.env, nextId), nextId);
    setPortMappings(parsedPorts);
    setVolumeMounts(parsedVolumes);
    setEnvVarRows(parsedEnvVars);
    setNetworkType("bridge");
    setWebUIPort("");
  }, [open, dockerRun, appIcon, nextId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleImageChange = (value: string) => {
    const parts = parseImageAndTag(value);
    setImageName(parts.image);

    if (parts.tag) {
      setImageTag(parts.tag);
      tagManualRef.current = true;
      return;
    }

    if (!tagManualRef.current) {
      setImageTag("");
    }
  };

  const handleTagChange = (value: string) => {
    tagManualRef.current = true;
    setImageTag(value);
  };

  const looksLikeUrl = (value: string) => /^https?:\/\//i.test(value.trim());
  const handleIconPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted || !looksLikeUrl(pasted)) return;
    e.preventDefault();
    setIconUrl(pasted.trim());
  };

  const updatePortMapping = (
    id: string,
    field: "host" | "container",
    value: string,
  ) => {
    setPortMappings((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };
  const addPortMapping = () =>
    setPortMappings((rows) => [
      ...rows,
      { id: nextId("port"), host: "", container: "" },
    ]);
  const removePortMapping = (id: string) =>
    setPortMappings((rows) => {
      if (rows.length === 1) {
        return [{ ...rows[0], host: "", container: "" }];
      }
      return rows.filter((row) => row.id !== id);
    });

  const updateVolumeMount = (
    id: string,
    field: "host" | "container",
    value: string,
  ) => {
    setVolumeMounts((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };
  const addVolumeMount = () =>
    setVolumeMounts((rows) => [
      ...rows,
      { id: nextId("volume"), host: "", container: "" },
    ]);
  const removeVolumeMount = (id: string) =>
    setVolumeMounts((rows) => {
      if (rows.length === 1) {
        return [{ ...rows[0], host: "", container: "" }];
      }
      return rows.filter((row) => row.id !== id);
    });

  const updateEnvVarRow = (id: string, field: "key" | "value", value: string) => {
    setEnvVarRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };
  const addEnvVarRow = () =>
    setEnvVarRows((rows) => [...rows, { id: nextId("env"), key: "", value: "" }]);
  const removeEnvVarRow = (id: string) =>
    setEnvVarRows((rows) => {
      if (rows.length === 1) {
        return [{ ...rows[0], key: "", value: "" }];
      }
      return rows.filter((row) => row.id !== id);
    });

  const reset = () => {
    idRef.current = 0;
    tagManualRef.current = false;
    setImageName("");
    setImageTag("");
    setContainerName("");
    setIconUrl("");
    setPortMappings(ensurePortRows([], nextId));
    setVolumeMounts(ensureVolumeRows([], nextId));
    setEnvVarRows(ensureEnvRows([], nextId));
    setNetworkType("bridge");
    setWebUIPort("");
  };

  return {
    imageName,
    imageTag,
    containerName,
    iconUrl,
    portMappings,
    volumeMounts,
    envVarRows,
    setContainerName,
    setIconUrl,
    handleImageChange,
    handleTagChange,
    handleIconPaste,
    updatePortMapping,
    addPortMapping,
    removePortMapping,
    updateVolumeMount,
    addVolumeMount,
    removeVolumeMount,
    updateEnvVarRow,
    addEnvVarRow,
    removeEnvVarRow,
    networkType,
    setNetworkType,
    webUIPort,
    setWebUIPort,
    reset,
  };
}
