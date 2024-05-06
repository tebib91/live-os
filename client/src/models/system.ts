export default interface SystemInfo {
  id: string;

  cpu: CPUInfo;

  mem: MemoryInfo;

  net: NetworkInfo;

  sys_disk: DiskInfo;

  sys_usb: USBDeviceInfo[];
}

export interface CPUInfo {
  model: string;
  num: number;
  percent: number;
  temperature: number;
}

export interface MemoryInfo {
  available: number;
  free: number;
  total: number;
  used: number;
  usedPercent: number;
}

export interface NetworkInfo {
  [key: string]: NetworkInterface[];
}

export interface NetworkInterface {
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  cidr: string;
  scopeid?: number;
}

export interface DiskInfo {
  avail: number;
  health: boolean;
  size: number;
  used: number;
}

export interface USBDeviceInfo {
  busNumber: number;
  deviceAddress: number;
  deviceDescriptor: DeviceDescriptor;
  portNumbers?: number[];
}

export interface DeviceDescriptor {
  bLength: number;
  bDescriptorType: number;
  bcdUSB: number;
  bDeviceinterface: number;
  bDeviceSubinterface: number;
  bDeviceProtocol: number;
  bMaxPacketSize0: number;
  idVendor: number;
  idProduct: number;
  bcdDevice: number;
  iManufacturer?: number;
  iProduct?: number;
  iSerialNumber?: number;
  bNumConfigurations: number;
}
