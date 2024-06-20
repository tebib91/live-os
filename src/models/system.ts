/* eslint-disable max-classes-per-file */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class SystemInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'jsonb', nullable: false })
  cpu!: string;

  @Column({ type: 'jsonb', nullable: false })
  mem!: string;

  @Column({ type: 'jsonb', nullable: false })
  net!: string;

  @Column({ type: 'jsonb', nullable: false })
  sys_disk!: string;

  @Column({ type: 'jsonb', nullable: false })
  sys_usb!: string;
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
export class NetworkInterface {
  address!: string;

  netmask!: string;

  family!: string;

  mac!: string;

  internal!: boolean;

  cidr!: string;

  scopeid?: number;
}
export class NetworkInfo {
  [key: string]: NetworkInterface[];
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
