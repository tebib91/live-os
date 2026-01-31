export type NetworkType = "bridge" | "host" | "macvlan" | "none";
export type PortMapping = { id: string; host: string; container: string };
export type VolumeMount = { id: string; host: string; container: string };
export type EnvVarRow = { id: string; key: string; value: string };
export type DeviceMapping = { id: string; host: string; container: string };
export type CapabilityRow = { id: string; name: string };
export type RestartPolicy = "no" | "always" | "unless-stopped" | "on-failure";
export type IdFactory = (prefix: string) => string;

export function parseImageAndTag(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { image: "", tag: "" };

  const withoutDigest = trimmed.split("@")[0] ?? trimmed;
  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");
  const hasTag = lastColon > lastSlash;

  if (!hasTag) {
    return { image: withoutDigest, tag: "" };
  }

  return {
    image: withoutDigest.slice(0, lastColon),
    tag: withoutDigest.slice(lastColon + 1),
  };
}

export function parsePorts(
  value: string | undefined,
  createId: IdFactory,
): PortMapping[] {
  const items = value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return items.map((mapping) => {
    const [host = "", container = ""] = mapping
      .split(":")
      .map((v) => v.trim());
    return { id: createId("port"), host, container };
  });
}

export function parseVolumes(
  value: string | undefined,
  createId: IdFactory,
): VolumeMount[] {
  const items = value
    ? value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return items.map((mount) => {
    const [host = "", container = ""] = mount.split(":").map((v) => v.trim());
    return { id: createId("volume"), host, container };
  });
}

export function parseEnvVars(
  value: string | undefined,
  createId: IdFactory,
): EnvVarRow[] {
  const items = value
    ? value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return items.map((envLine) => {
    const [key = "", ...rest] = envLine.split("=");
    const joinedValue = rest.join("=").trim();
    return { id: createId("env"), key: key.trim(), value: joinedValue };
  });
}

export function ensurePortRows(rows: PortMapping[], createId: IdFactory) {
  return rows.length
    ? rows
    : [{ id: createId("port"), host: "", container: "" }];
}

export function ensureVolumeRows(rows: VolumeMount[], createId: IdFactory) {
  return rows.length
    ? rows
    : [{ id: createId("volume"), host: "", container: "" }];
}

export function ensureEnvRows(rows: EnvVarRow[], createId: IdFactory) {
  return rows.length ? rows : [{ id: createId("env"), key: "", value: "" }];
}

export function serializePorts(rows: PortMapping[]) {
  return rows
    .map((row) => `${row.host.trim()}:${row.container.trim()}`)
    .filter(
      (value) => value !== ":" && !value.startsWith(":") && !value.endsWith(":"),
    )
    .join(", ");
}

export function serializeVolumes(rows: VolumeMount[]) {
  return rows
    .map((row) => `${row.host.trim()}:${row.container.trim()}`)
    .filter((value) => value !== ":" && value.includes(":"))
    .join("\n");
}

export function serializeEnvVars(rows: EnvVarRow[]) {
  return rows
    .map((row) => `${row.key.trim()}=${row.value.trim()}`)
    .filter((value) => value !== "=" && !value.startsWith("="))
    .join("\n");
}

export function parseDevices(
  value: string | undefined,
  createId: IdFactory,
): DeviceMapping[] {
  const items = value
    ? value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return items.map((mapping) => {
    const [host = "", container = ""] = mapping.split(":").map((v) => v.trim());
    return { id: createId("device"), host, container };
  });
}

export function ensureDeviceRows(rows: DeviceMapping[], createId: IdFactory) {
  return rows.length
    ? rows
    : [{ id: createId("device"), host: "", container: "" }];
}

export function serializeDevices(rows: DeviceMapping[]) {
  return rows
    .map((row) => `${row.host.trim()}:${row.container.trim()}`)
    .filter((value) => value !== ":" && value.includes(":"))
    .join("\n");
}

export function parseCapabilities(
  value: string | undefined,
  createId: IdFactory,
): CapabilityRow[] {
  const items = value
    ? value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  return items.map((name) => ({ id: createId("cap"), name }));
}

export function ensureCapabilityRows(
  rows: CapabilityRow[],
  createId: IdFactory,
) {
  return rows.length ? rows : [{ id: createId("cap"), name: "" }];
}

export function serializeCapabilities(rows: CapabilityRow[]) {
  return rows
    .map((row) => row.name.trim())
    .filter(Boolean)
    .join("\n");
}
