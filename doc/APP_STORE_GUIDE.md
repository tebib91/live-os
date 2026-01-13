# LiveOS App Store Guide

Quick reference for managing the Umbrel Apps integration.

## Overview

LiveOS uses [Umbrel's app repository](https://github.com/getumbrel/umbrel-apps) as the source for its app store. Your fork at `umbrel-apps-ref/` contains 298+ Docker-based apps.

## Quick Start

### View Apps in App Store

1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3001`
3. Browse the App Store

### Update Apps from Upstream

```bash
# Interactive update (recommended)
npm run update-apps

# Auto-approve all updates
npm run update-apps:auto

# Test app parsing
npm run test-apps
```

## Current Status

Your fork is currently **24 commits behind** upstream with updates available for:

- affine (0.25.1 → 0.25.7)
- arcane (1.12.0 → 1.12.2)
- blinko (1.6.5 → 1.8.3)
- booklore (1.16.5 → 1.17.0)
- budibase (3.23.14 → 3.24.0)
- code-server (4.107.0 → 4.107.1)
- element (1.12.3 → 1.12.7)
- endurain (0.16.4 → 0.16.5)
- file-browser (2.53.1 → 2.54.0)
- firefly-iii-importer (2.0.2 → 2.0.4)
- ... and 14 more apps

**Recommendation:** Run `npm run update-apps` to get the latest versions.

## How It Works

### Architecture

```
LiveOS
├── umbrel-apps-ref/              # Your fork (298 apps)
│   ├── adguard-home/
│   │   ├── umbrel-app.yml       # App metadata
│   │   └── docker-compose.yml   # Container config
│   ├── nextcloud/
│   └── ...
│
├── app/actions/appstore.ts       # Reads apps from umbrel-apps-ref/
└── components/app-store/         # UI components
```

### Icon Sources

Icons are fetched from Umbrel's CDN:

```
https://getumbrel.github.io/umbrel-apps-gallery/[app-id]/icon.svg
```

**Example:**
- AdGuard Home: https://getumbrel.github.io/umbrel-apps-gallery/adguard-home/icon.svg
- Nextcloud: https://getumbrel.github.io/umbrel-apps-gallery/nextcloud/icon.svg

### Data Flow

1. **Server Action** (`app/actions/appstore.ts`):
   - Reads `umbrel-apps-ref/*/umbrel-app.yml`
   - Parses metadata (name, version, category, etc.)
   - Returns array of apps with icon URLs

2. **UI** (`components/app-store/`):
   - Displays apps in grid/list
   - Fetches icons from Umbrel CDN
   - Shows app details in dialogs

3. **Installation** (future):
   - Reads `docker-compose.yml`
   - Spins up containers
   - Manages lifecycle

## Maintenance

### Recommended Update Schedule

- **Weekly**: For production deployments
- **Monthly**: For development/personal use
- **Before major releases**: Always sync to latest

### Update Workflow

```bash
# 1. Check for updates
npm run update-apps

# 2. Review changes (script shows summary)
#    - New apps
#    - Version updates
#    - Deleted apps

# 3. Approve updates (y/n)

# 4. Restart dev server
npm run dev

# 5. Test app store loads correctly
```

### Staying in Sync with Upstream

Your setup:

```
origin    → github.com/tebib91/umbrel-apps-ref (your fork)
upstream  → github.com/getumbrel/umbrel-apps  (official)
```

The update script:
1. Fetches from `upstream/master`
2. Shows what changed
3. Merges into your local branch
4. You can push to `origin` to update your fork

### Pushing Updates to Your Fork

After running `npm run update-apps`:

```bash
cd umbrel-apps-ref

# Review changes
git log -5

# Push to your fork
git push origin master
```

## Customization

### Adding Custom Apps

To add your own apps alongside Umbrel's:

1. **Create app folder:**

   ```bash
   mkdir umbrel-apps-ref/my-app
   ```

2. **Add `umbrel-app.yml`:**

   ```yaml
   manifestVersion: 1
   id: my-app
   name: My Custom App
   version: "1.0.0"
   category: productivity
   tagline: Short description
   description: |
     Full description with markdown support...
   developer: Your Name
   website: https://example.com
   repo: https://github.com/you/my-app
   port: 8080
   gallery: []
   ```

3. **Add `docker-compose.yml`:**

   ```yaml
   version: "3.7"
   services:
     app:
       image: your/image:latest
       ports:
         - "8080:80"
       volumes:
         - ${APP_DATA_DIR}:/data
       restart: unless-stopped
   ```

4. **Prevent overwriting during updates:**

   ```bash
   # Add to .gitignore
   echo "my-app/" >> umbrel-apps-ref/.gitignore
   ```

### Filtering Apps

To hide certain apps from your store, edit `app/actions/appstore.ts`:

```typescript
export async function getAppStoreApps(): Promise<App[]> {
  // ... existing code ...

  // Filter out specific apps
  const filteredApps = validApps.filter(app => {
    return !['unwanted-app-1', 'unwanted-app-2'].includes(app.id);
  });

  return filteredApps;
}
```

### Custom Icon Sources

To use your own icons instead of Umbrel's CDN, modify `getAppIcon()` in `app/actions/appstore.ts`:

```typescript
async function getAppIcon(folderName: string, appId: string): Promise<string> {
  // Check for local icon first
  const localIconPath = path.join(process.cwd(), 'public', 'app-icons', `${appId}.svg`);
  try {
    await fs.access(localIconPath);
    return `/app-icons/${appId}.svg`;
  } catch {
    // Fallback to Umbrel CDN
    return `https://getumbrel.github.io/umbrel-apps-gallery/${appId}/icon.svg`;
  }
}
```

## Custom Docker Deployments

LiveOS now supports deploying your own Docker containers directly from the App Store interface, without needing to create Umbrel app manifests.

### Features

- **Docker Compose**: Upload or paste `docker-compose.yml` files
- **Docker Run**: Configure containers through a simple form interface
- **Automatic Management**: Custom deployments appear in the installed apps grid
- **Full Control**: Configure ports, volumes, and environment variables

### Deploying with Docker Compose

1. Click the **"Custom Deploy"** button in the App Store header
2. Select the **"Docker Compose"** tab
3. Enter an app name (lowercase with hyphens, e.g., `my-app`)
4. Either:
   - Paste your `docker-compose.yml` content directly
   - Or click "Upload File" to select a file
5. Click **"Deploy Application"**

**Example docker-compose.yml:**

```yaml
version: '3.8'
services:
  myapp:
    image: nginx:latest
    ports:
      - '8080:80'
    volumes:
      - ./data:/usr/share/nginx/html
    environment:
      - NGINX_HOST=localhost
      - NGINX_PORT=80
    restart: unless-stopped
```

### Deploying with Docker Run

1. Click the **"Custom Deploy"** button in the App Store header
2. Select the **"Docker Run"** tab
3. Fill in the configuration:
   - **App Name**: Unique identifier (e.g., `my-custom-app`)
   - **Docker Image**: Image name and tag (e.g., `nginx:latest`)
   - **Container Name** (optional): Custom container name
   - **Port Mappings**: Format `host:container`, comma-separated (e.g., `8080:80, 8443:443`)
   - **Volume Mounts**: One per line, format `host:container` (e.g., `/host/data:/app/data`)
   - **Environment Variables**: One per line, format `KEY=value`
4. Click **"Deploy Application"**

**Example Configuration:**

```
App Name: my-web-server
Docker Image: nginx:latest
Port Mappings: 8080:80
Volume Mounts:
  /opt/nginx/html:/usr/share/nginx/html
  /opt/nginx/conf:/etc/nginx
Environment Variables:
  NGINX_HOST=localhost
  NGINX_PORT=80
```

### File Storage

Custom deployments are stored in the `custom-apps/` directory:

```
custom-apps/
├── my-app/
│   └── docker-compose.yml
├── another-app/
│   └── docker-compose.yml
└── ...
```

This directory is automatically added to `.gitignore` to prevent accidental commits.

### Managing Custom Deployments

Custom deployments appear in the **Installed Applications** grid alongside Umbrel apps. You can:

- **Start/Stop**: Right-click and select from context menu
- **Restart**: Right-click and select restart
- **View Logs**: Access container logs from the context menu
- **Uninstall**: Remove the container and volumes

### Naming Rules

App names must follow these rules:
- Lowercase letters only
- Numbers allowed
- Hyphens allowed (for word separation)
- No spaces or special characters
- Examples:
  - ✅ `my-app`
  - ✅ `web-server-01`
  - ✅ `nginx-proxy`
  - ❌ `My App`
  - ❌ `web_server`
  - ❌ `app@123`

### Port Management

**Important:** Ensure ports don't conflict with:
- LiveOS itself (default: 3000)
- Other installed apps
- System services

**Check port availability:**

```bash
# See all used ports
sudo netstat -tulpn | grep LISTEN

# Or with ss
ss -tulpn
```

### Troubleshooting Custom Deployments

**"App name already exists"**
- Choose a different name
- Or remove the existing app first

**"Container name already in use"**
- The container name conflicts with an existing container
- Choose a different container name
- Or remove the conflicting container: `docker rm <name>`

**"Invalid port mapping"**
- Ensure format is `host:container` (e.g., `8080:80`)
- Ports must be between 1024-65535
- Separate multiple ports with commas

**"Failed to deploy"**
- Check Docker is running: `docker ps`
- Verify image name is correct
- Check logs: `docker logs <container-name>`
- Ensure no port conflicts

**View deployment files:**

```bash
# List custom apps
ls -la custom-apps/

# View docker-compose file
cat custom-apps/my-app/docker-compose.yml
```

## Troubleshooting

### "No apps showing in App Store"

1. Check server logs: `npm run dev`
2. Test parsing: `npm run test-apps`
3. Verify directory exists: `ls umbrel-apps-ref/ | head -10`

### "Icons not loading"

Icons are fetched from Umbrel's CDN. If they fail:

1. Check network connection
2. Verify icon URL in browser: `https://getumbrel.github.io/umbrel-apps-gallery/adguard-home/icon.svg`
3. Add fallback icon in UI component

### "Update script fails with merge conflict"

```bash
cd umbrel-apps-ref

# View conflicted files
git status

# Option 1: Accept upstream version
git checkout --theirs <file>
git add <file>

# Option 2: Accept your version
git checkout --ours <file>
git add <file>

# Option 3: Manually resolve
# Edit file, then:
git add <file>

# Complete merge
git merge --continue
```

### "Reset to upstream"

If you want to completely reset to Umbrel's version:

```bash
cd umbrel-apps-ref
git fetch upstream
git reset --hard upstream/master
git push origin master --force  # Updates your fork
```

## Advanced Features (Future)

### Planned Features

- [ ] App installation via Docker
- [ ] App lifecycle management (start/stop/restart)
- [ ] Resource monitoring per app
- [ ] Automatic security updates
- [ ] Community app repositories
- [ ] Local icon caching
- [ ] App screenshots viewer
- [ ] One-click backups

### Contributing

To contribute apps to the official Umbrel repository:

1. Fork: https://github.com/getumbrel/umbrel-apps
2. Follow: [Umbrel's contribution guide](https://github.com/getumbrel/umbrel-apps/blob/master/README.md)
3. Submit PR to Umbrel
4. Once merged, run `npm run update-apps` to get it in LiveOS

## Resources

- **Umbrel Apps**: https://github.com/getumbrel/umbrel-apps
- **Your Fork**: https://github.com/tebib91/umbrel-apps-ref
- **App Gallery**: https://getumbrel.github.io/umbrel-apps-gallery/
- **Docker Compose Docs**: https://docs.docker.com/compose/
- **Script Documentation**: [scripts/README.md](./scripts/README.md)

## Support

Questions? Issues?

1. Check [scripts/README.md](./scripts/README.md)
2. Run diagnostic: `npm run test-apps`
3. Open issue on GitHub
4. Review Umbrel's docs

---

**Last Updated:** 2026-01-12
**Apps Available:** 298
**Updates Available:** 24 apps have newer versions
