import os from 'os'; // Node.js os module for system information
// import diskinfo from 'node-disk-info';
// import { usb, getDeviceList } from 'usb';
import { exec } from 'child_process';

class SystemService {

  constructor() {
  }

   async getCPUtemperature(): Promise<number> {
    return new Promise((resolve, reject) => {
      exec('vcgencmd measure_temp', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        // Example output: temp=44.9'C
        const temperatureString = stdout.trim().split('=')[1];
        const temperature = parseFloat(temperatureString.replace('\'C', ''));
        resolve(temperature);
      });
    });
  }

 async getUtilizationSystem(): Promise<any> {
    try {
      // Gather system utilization data
      const cpuInfo = os.cpus();
      // const memInfo = os.freemem();
      const networkInfo = os.networkInterfaces();
      // const diskInfo = diskinfo.getDiskInfoSync();
      // const devicesInfo = usb.Device[] = getDeviceList();
      const temperature = "44.9'C"; // Fetch CPU temperature dynamically

      // Format the response
      const utilizationData = {
        cpu: {
          model: cpuInfo[0].model,
          num: cpuInfo.length,
          percent: os.loadavg()[0],
          temperature: temperature
        },
        mem: {
          available: os.freemem(),
          free: os.freemem(),
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        net: networkInfo,
        sys_disk: {
          // avail: diskInfo[0].available,
          // health: true,
          // size: diskInfo[0].blocks,
          // used: diskInfo[0].used
        },
        // sys_usb: usbInfo
      };

      return utilizationData;
    } catch (error) {
      console.error('Error return system Uilization:', error);
      throw error; // Or handle the error gracefully and return an appropriate error message
    }
  }
}


export default SystemService;
