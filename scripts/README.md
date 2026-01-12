# LiveOS Scripts

This directory contains utility scripts for managing LiveOS.

## App Store Management

### `update-apps.sh` - Sync with Umbrel Apps

Updates your local `umbrel-apps-ref` directory with the latest apps from Umbrel's official repository.

**Usage:**

```bash
# Interactive mode (asks for confirmation)
npm run update-apps

# Auto-approve mode (no prompts)
npm run update-apps:auto

# Or run directly
./scripts/update-apps.sh
./scripts/update-apps.sh --auto-yes
```

**Features:**

- ✅ Shows what changed before updating
- ✅ Lists new apps, modified apps, and deleted apps
- ✅ Shows version changes for updated apps
- ✅ Handles merge conflicts gracefully
- ✅ Stashes uncommitted changes automatically
- ✅ Color-coded output for easy reading

**Example Output:**

```
╔════════════════════════════════════════════════════════════════╗
║              LiveOS - Umbrel Apps Update Script                ║
╚════════════════════════════════════════════════════════════════╝

▶ Checking Prerequisites
✓ Git is installed
✓ Apps directory found: /path/to/umbrel-apps-ref
✓ Git repository detected

▶ Checking for Updates
ℹ Your repository is 15 commits behind upstream

▶ Changes Summary
Changes:
  +5 new apps
  ~12 modified apps
  -1 deleted apps
  =47 total files changed

New Apps:
  + paperless-ngx
  + actual-budget
  + homeassistant
  + frigate
  + nextcloud-talk

Modified Apps:
  ~ adguard-home (0.107.51 → 0.107.71)
  ~ pihole (2024.01.0 → 2024.02.1)
  ~ jellyfin (10.8.13 → 10.9.0)
  ...

Apply these updates? [y/N]:
```

**What It Does:**

1. **Checks Prerequisites** - Verifies git is installed and directory exists
2. **Checks for Updates** - Fetches from upstream and counts commits behind
3. **Shows Changes** - Lists all new, modified, and deleted apps
4. **View Details** (optional) - Shows commit log and full diff
5. **Applies Updates** - Merges changes from upstream
6. **Shows Summary** - Displays final statistics

**Troubleshooting:**

If you encounter merge conflicts:

```bash
# View conflicted files
git status

# Resolve conflicts in your editor, then:
git add <resolved-files>
git merge --continue
```

---

### `test-appstore.js` - Test App Store Integration

Verifies that your app store is correctly reading Umbrel apps.

**Usage:**

```bash
npm run test-apps

# Or run directly
node scripts/test-appstore.js
```

**Example Output:**

```
🔍 Testing AppStore Integration with umbrel-apps-ref...

✅ Found 298 apps in umbrel-apps-ref/

📦 AdGuard Home
   ID: adguard-home
   Version: 0.107.71
   Category: networking
   Icon URL: https://getumbrel.github.io/umbrel-apps-gallery/adguard-home/icon.svg
   Gallery: 4 images

✅ Test complete! Your app store should now display Umbrel apps.
```

---

## Maintenance

### Keeping Apps Updated

**Recommended frequency:** Weekly or monthly

**Method 1: Manual (Recommended)**

```bash
# Check what's new
npm run update-apps

# Review changes and approve
```

**Method 2: Automated (CI/CD)**

Add to your CI/CD pipeline:

```bash
npm run update-apps:auto
```

### Best Practices

1. **Always review changes** - Don't blindly update, check what's new
2. **Test after updating** - Run `npm run dev` and verify app store loads
3. **Commit updates** - Keep your git history clean

   ```bash
   cd umbrel-apps-ref
   git add .
   git commit -m "chore: sync with Umbrel apps $(date +%Y-%m-%d)"
   ```

4. **Check for breaking changes** - Some app updates might require changes to your installation logic

---

## Advanced: Custom Apps

### Adding Your Own Apps

To add custom apps that aren't in Umbrel's repository:

1. Create a new folder in `umbrel-apps-ref/`:

   ```bash
   mkdir umbrel-apps-ref/my-custom-app
   ```

2. Add `umbrel-app.yml`:

   ```yaml
   manifestVersion: 1
   id: my-custom-app
   name: My Custom App
   version: "1.0.0"
   category: productivity
   tagline: A custom app for LiveOS
   description: |
     Full description of your app...
   developer: Your Name
   website: https://example.com
   repo: https://github.com/you/app
   port: 8080
   gallery: []
   ```

3. Add `docker-compose.yml`:

   ```yaml
   version: "3.7"
   services:
     app:
       image: your-image:latest
       ports:
         - 8080:80
       volumes:
         - ${APP_DATA_DIR}:/data
   ```

4. Test with: `npm run test-apps`

### Preventing Custom Apps from Being Overwritten

Add your custom apps to `.gitignore` in `umbrel-apps-ref/`:

```bash
echo "my-custom-app/" >> umbrel-apps-ref/.gitignore
```

Or better yet, create a separate directory for custom apps:

```
store/
├── umbrel-apps-ref/    # Official Umbrel apps
└── custom-apps/        # Your custom apps
```

---

## Icon Management

### How Icons Work

Icons are fetched from Umbrel's CDN:

```
https://getumbrel.github.io/umbrel-apps-gallery/[app-id]/icon.svg
```

### Fallback Icons

If an icon fails to load, you can:

1. **Add local icon** - Place `icon.svg` in the app folder
2. **Use custom CDN** - Modify `app/actions/appstore.ts`
3. **Download icons locally** - Create a script to cache icons

### Downloading Icons Locally (Optional)

```bash
# Download all icons from Umbrel CDN
./scripts/download-icons.sh
```

*(Script not yet implemented - let me know if you need this)*

---

## Support

If you encounter issues:

1. Check git status: `cd umbrel-apps-ref && git status`
2. View logs: Check error messages in the script output
3. Reset if needed: `cd umbrel-apps-ref && git reset --hard upstream/master`
4. Open an issue on GitHub

---

## Related Files

- `/app/actions/appstore.ts` - Server action that reads apps
- `/components/app-store/types.ts` - TypeScript type definitions
- `/umbrel-apps-ref/` - Umbrel apps repository (git submodule)
