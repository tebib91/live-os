#!/usr/bin/env node

/**
 * Test script to verify app store is reading Umbrel apps correctly
 * Run with: node scripts/test-appstore.js
 */

import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAppStore() {
  console.log('🔍 Testing AppStore Integration with umbrel-apps-ref...\n');

  const appStorePath = path.join(__dirname, '..', 'umbrel-apps-ref');

  try {
    const entries = await fs.readdir(appStorePath, { withFileTypes: true });
    const appFolders = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));

    console.log(`✅ Found ${appFolders.length} apps in umbrel-apps-ref/\n`);

    // Test first 5 apps
    const testApps = appFolders.slice(0, 5);

    for (const folder of testApps) {
      const appPath = path.join(appStorePath, folder.name);
      const umbrelAppPath = path.join(appPath, 'umbrel-app.yml');

      try {
        const content = await fs.readFile(umbrelAppPath, 'utf-8');
        const umbrelApp = YAML.parse(content);

        console.log(`📦 ${umbrelApp.name || folder.name}`);
        console.log(`   ID: ${umbrelApp.id || folder.name}`);
        console.log(`   Version: ${umbrelApp.version}`);
        console.log(`   Category: ${umbrelApp.category}`);
        console.log(`   Icon URL: https://getumbrel.github.io/umbrel-apps-gallery/${umbrelApp.id || folder.name}/icon.svg`);
        console.log(`   Gallery: ${umbrelApp.gallery ? umbrelApp.gallery.length + ' images' : 'none'}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Failed to parse ${folder.name}: ${error.message}`);
      }
    }

    console.log('✅ Test complete! Your app store should now display Umbrel apps.');
    console.log('   Icons are fetched from: https://getumbrel.github.io/umbrel-apps-gallery/');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAppStore();
