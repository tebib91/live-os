/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

class AppStoreServices {
  APPS_DIR = './Apps'; // Set the path to your apps directory

  fetchAppsData() {
    const apps = [];
    const directories = fs
      .readdirSync(this.APPS_DIR, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const dir of directories) {
      const filePath = path.join(this.APPS_DIR, dir, 'docker-compose.yml');
      if (fs.existsSync(filePath)) {
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(fileContents);
        apps.push({ directory: dir, data });
      }
    }
    return apps;
  }
}

export default AppStoreServices;
