import os from "os"; // Node.js os module for system information
const nodeDiskInfo = require("node-disk-info");
import { getDeviceList, usb } from "usb";
// import { exec } from "child_process";
import * as fs from "fs";

class SystemService {
  constructor() {}

  // async getCPUtemperature(): Promise<number> {
  //   return new Promise((resolve, reject) => {
  //     exec("vcgencmd measure_temp", (error, stdout) => {
  //       if (error) {
  //         reject(error);
  //         return;
  //       }
  //       // Example output: temp=44.9'C
  //       const temperatureString = stdout.trim().split("=")[1];
  //       const temperature = parseFloat(temperatureString.replace("'C", ""));
  //       resolve(temperature);
  //     });

  //  //Read CPU temperature from the thermal_zone files
  //  return new Promise((resolve, reject) => {
  //   fs.readFile("/sys/class/thermal/thermal_zone0/temp", "utf8", (err, data) => {
  //     if (err) {
  //       reject(err);
  //       return;
  //     }

  //     const temperature = parseFloat(data) / 1000; // Temperature is in millidegrees Celsius, so divide by 1000
  //     resolve(temperature);
  //   });
  // });
  //   });
  // }

  async getCPUtemperature(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Read CPU temperatures from the thermal_zone files for each CPU core
      fs.readdir("/sys/class/thermal/", (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        // Filter out files that represent CPU thermal zones
        const cpuTempFiles = files.filter((file) =>
          file.startsWith("thermal_zone")
        );

        // Read temperature from each CPU thermal zone file
        let totalTemperature = 0;
        let numCores = 0;
        cpuTempFiles.forEach((file) => {
          fs.readFile(
            `/sys/class/thermal/${file}/temp`,
            "utf8",
            (err, data) => {
              if (err) {
                reject(err);
                return;
              }

              const temperature = parseFloat(data) / 1000; // Temperature is in millidegrees Celsius, so divide by 1000
              totalTemperature += temperature;
              numCores++;

              // If temperatures for all cores have been read, calculate the average
              if (numCores === cpuTempFiles.length) {
                const averageTemperature = totalTemperature / numCores;
                resolve(averageTemperature);
              }
            }
          );
        });
      });
    });
  }

  getCpuUsage = (): string => {
    const cpus: any[] = os.cpus();
    const numCores: number = cpus.length;
    let totalIdle: number = 0;
    let totalTick: number = 0;

    cpus.forEach((cpu) => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type as keyof any];
      }
      totalIdle += cpu.times.idle;
    });

    const idle: number = totalIdle / numCores;
    const total: number = totalTick / numCores;

    const cpuUsage: number = (1 - idle / total) * 100;
    return cpuUsage.toFixed(1);
  };

  async getUtilizationSystem(): Promise<any> {
    try {
      // Gather system utilization data
      const cpuInfo = os.cpus();
      // const memInfo = os.freemem();
      const networkInfo = os.networkInterfaces();
      const diskInfo = nodeDiskInfo.getDiskInfoSync();
      const devicesInfo: usb.Device[] = getDeviceList();
      const temperature = (await this.getCPUtemperature()) ?? "44.9'C"; // Fetch CPU temperature dynamically

      // Format the response
      const utilizationData = {
        cpu: {
          model: cpuInfo[0].model,
          num: cpuInfo.length,
          percent: this.getCpuUsage(),
          temperature: temperature,
        },
        mem: {
          available: os.freemem(),
          free: os.freemem(),
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          usedPercent: (
            ((os.totalmem() - os.freemem()) / os.totalmem()) *
            100
          ).toFixed(1),
        },
        net: networkInfo,
        sys_disk: {
          avail: diskInfo[0].available,
          health: true,
          size: diskInfo[0].blocks,
          used: diskInfo[0].used,
        },
        sys_usb: devicesInfo,
      };

      return utilizationData;
    } catch (error) {
      console.error("Error return system Uilization:", error);
      throw error; // Or handle the error gracefully and return an appropriate error message
    }
  }
}

export default SystemService;
