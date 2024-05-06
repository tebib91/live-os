import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class SystemInfo {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "jsonb", nullable: false })
  cpu!: CPUInfo;

  @Column({ type: "jsonb", nullable: false })
  mem!: MemoryInfo;

  @Column({ type: "jsonb", nullable: false })
  net!: NetworkInfo;

  @Column({ type: "jsonb", nullable: false })
  sys_disk!: DiskInfo;

  @Column({ type: "jsonb", nullable: false })
  sys_usb!: USBDeviceInfo[];
}

export class CPUInfo {
  model!: string;
  num!: number;
  percent!: number;
  temperature!: number;
}

export class MemoryInfo {
  available!: number;
  free!: number;
  total!: number;
  used!: number;
  usedPercent!: number;
}

export class NetworkInfo {
  [key: string]: NetworkInterface[];
}

export class NetworkInterface {
  address!: string;
  netmask!: string;
  family!: string;
  mac!: string;
  internal!: boolean;
  cidr!: string;
  scopeid?: number;
}

export class DiskInfo {
  avail!: number;
  health!: boolean;
  size!: number;
  used!: number;
}

export class USBDeviceInfo {
  busNumber!: number;
  deviceAddress!: number;
  deviceDescriptor!: DeviceDescriptor;
  portNumbers?: number[];
}

export class DeviceDescriptor {
  bLength!: number;
  bDescriptorType!: number;
  bcdUSB!: number;
  bDeviceClass!: number;
  bDeviceSubClass!: number;
  bDeviceProtocol!: number;
  bMaxPacketSize0!: number;
  idVendor!: number;
  idProduct!: number;
  bcdDevice!: number;
  iManufacturer?: number;
  iProduct?: number;
  iSerialNumber?: number;
  bNumConfigurations!: number;
}
