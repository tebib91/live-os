# LiveOS Development Roadmap

This document tracks features needed to reach feature parity with UmbrelOS and CasaOS.

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress

---

## 🔍 Gaps vs CasaOS/UmbrelOS (add to roadmap)
- [x] Real app catalog with install/uninstall status, progress, and logs
- [x] Docker/compose lifecycle controls (start/stop/restart, health, port/resource config)
- [x] Live system dashboard (CPU/RAM/disk/network, temps, alerts)
- [~] File manager with upload/download, permissions, and external drive visibility
- [~] Settings for hostname/timezone/locale, networking, SSH toggle, backups, updates, notifications
- [ ] Multi-user accounts, roles, 2FA, session management, and audit logs
- [x] Idle lock/timeout, rate limiting, and remote logout/device approvals
- [ ] Scheduled backups, restore, and OTA updates with changelog and rollback
- [ ] Onboarding wizard with device checks, network setup, and storage selection
- [ ] Remote access/sharing (reverse proxy/relay, LAN discovery, QR pairing)
- [~] Desktop UX polish (dynamic dock/app grid, quick settings tray, notification center, widgets)

---

## 🔴 Phase 1: Security & Stability (Critical)

### 1. User Authentication & Security
- [x] **Login System**
  - [x] Username/Pin authentication
  - [x] Session management with JWT/cookies
  - [x] Login page UI
  - [x] Logout functionality
  - [x] "Remember me" option
  - **Priority:** CRITICAL
  - **Estimated effort:** 2-3 days
  - **Status:** COMPLETED

- [ ] **User Management**
  - [ ] Create/edit/delete users
  - [ ] User roles (admin, user, guest)
  - [ ] Password change functionality
  - [ ] Account settings page
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **Two-Factor Authentication (2FA)**
  - [ ] TOTP support (Google Authenticator, Authy)
  - [ ] QR code generation
  - [ ] Backup codes
  - [ ] Optional/mandatory 2FA per user
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **Password Security**
  - [ ] Password strength requirements
  - [ ] Password hashing (bcrypt/argon2)
  - [ ] Password reset flow
  - [ ] Email verification (optional)
  - **Priority:** CRITICAL
  - **Estimated effort:** 1 day

- [ ] **Session Security**
  - [ ] Session timeout
  - [ ] Active sessions viewer
  - [ ] Logout all devices
  - [ ] IP-based restrictions (optional)
  - **Priority:** HIGH
  - **Estimated effort:** 1 day

### 2. Backup & Restore System
- [ ] **App Data Backup**
  - [ ] Backup Docker volumes
  - [ ] Backup app configurations
  - [ ] Incremental backups
  - [ ] Compression support
  - **Priority:** CRITICAL
  - **Estimated effort:** 3 days

- [ ] **System Backup**
  - [ ] Backup LiveOS configuration
  - [ ] Backup installed apps list
  - [ ] Backup user settings
  - [ ] Export backup to external location
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **Restore Functionality**
  - [ ] Restore individual apps
  - [ ] Restore full system
  - [ ] Version selection
  - [ ] Rollback on failure
  - **Priority:** CRITICAL
  - **Estimated effort:** 2 days

- [ ] **Scheduled Backups**
  - [ ] Cron-based scheduling
  - [ ] Backup frequency settings (daily/weekly/monthly)
  - [ ] Retention policy (keep last N backups)
  - [ ] Backup notifications
  - **Priority:** HIGH
  - **Estimated effort:** 1-2 days

- [ ] **Backup Storage Options**
  - [ ] Local storage
  - [ ] External drive
  - [ ] Network share (SMB/NFS)
  - [ ] Cloud storage (S3, Dropbox, etc.)
  - **Priority:** MEDIUM
  - **Estimated effort:** 2-3 days

### 3. SSL/HTTPS Support
- [ ] **Self-Signed Certificates**
  - [ ] Generate self-signed SSL certificates
  - [ ] HTTPS server configuration
  - [ ] Auto-redirect HTTP to HTTPS
  - [ ] Certificate viewer in UI
  - **Priority:** HIGH
  - **Estimated effort:** 1-2 days

- [ ] **Let's Encrypt Integration**
  - [ ] Automatic SSL certificate generation
  - [ ] Domain validation (HTTP-01, DNS-01)
  - [ ] Auto-renewal before expiry
  - [ ] Multiple domain support
  - **Priority:** HIGH
  - **Estimated effort:** 2-3 days

- [ ] **Certificate Management**
  - [ ] Upload custom certificates
  - [ ] View certificate details
  - [ ] Certificate expiry warnings
  - [ ] Revoke/replace certificates
  - **Priority:** MEDIUM
  - **Estimated effort:** 1 day

- [ ] **Reverse Proxy Setup**
  - [ ] Nginx/Caddy integration
  - [ ] Automatic subdomain routing
  - [ ] WebSocket support
  - [ ] Custom headers management
  - **Priority:** HIGH
  - **Estimated effort:** 3-4 days

### 4. App Update System
- [ ] **App Version Management**
  - [ ] Detect available updates
  - [ ] Show current vs available version
  - [ ] Update notification badges
  - [ ] Update changelog display
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **Update Functionality**
  - [ ] One-click app updates
  - [ ] Update all apps button
  - [ ] Rollback to previous version
  - [ ] Update queue management
  - **Priority:** HIGH
  - **Estimated effort:** 2-3 days

- [ ] **Update Notifications**
  - [ ] Check for updates on schedule
  - [ ] Browser notifications
  - [ ] Email notifications (optional)
  - [ ] Update summary dashboard widget
  - **Priority:** MEDIUM
  - **Estimated effort:** 1 day

- [ ] **Docker Image Management**
  - [ ] Pull latest images
  - [ ] Clean unused images
  - [ ] Image size display
  - [ ] Image vulnerability scanning (optional)
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

---

## 🟡 Phase 2: Core Features (Important)

### 5. Storage Management
- [ ] **External Drive Detection**
  - [ ] Auto-detect USB/external drives
  - [ ] Show drive information (size, format, label)
  - [ ] Mount/unmount drives
  - [ ] Format drives UI
  - **Priority:** HIGH
  - **Estimated effort:** 2-3 days

- [ ] **Mount Management**
  - [ ] Custom mount points
  - [ ] Auto-mount on boot
  - [ ] Mount options (permissions, read-only)
  - [ ] Unmount safely (check for active processes)
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **Network Shares**
  - [ ] Samba/CIFS share setup
  - [ ] NFS share setup
  - [ ] Share permissions management
  - [ ] Connect to remote shares
  - **Priority:** MEDIUM
  - **Estimated effort:** 2-3 days

- [ ] **Disk Health Monitoring**
  - [ ] S.M.A.R.T. data display
  - [ ] Disk temperature monitoring
  - [ ] Disk failure warnings
  - [ ] Disk usage trends
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

- [ ] **RAID Configuration** (Optional)
  - [ ] RAID 0/1/5/10 setup
  - [ ] RAID status monitoring
  - [ ] Rebuild progress tracking
  - [ ] Array management
  - **Priority:** LOW
  - **Estimated effort:** 4-5 days

### 6. Network Management
- [x] **Wi-Fi Configuration**
  - [x] Scan available networks
  - [x] Connect to Wi-Fi
  - [x] Save Wi-Fi credentials
  - [x] Signal strength display
  - **Priority:** HIGH
  - **Estimated effort:** 2 days
  - **Status:** COMPLETED

- [ ] **Static IP Configuration**
  - [ ] Set static IP address
  - [ ] Configure DNS servers
  - [ ] Configure gateway
  - [ ] Network interface selection
  - **Priority:** MEDIUM
  - **Estimated effort:** 1-2 days

- [ ] **VPN Integration**
  - [ ] WireGuard client setup
  - [ ] OpenVPN client setup
  - [ ] VPN connection status
  - [ ] VPN on/off toggle
  - **Priority:** MEDIUM
  - **Estimated effort:** 3-4 days

- [ ] **Port Forwarding UI**
  - [ ] UPnP/NAT-PMP configuration
  - [ ] Manual port forwarding rules
  - [ ] Port forwarding status
  - [ ] Test port accessibility
  - **Priority:** MEDIUM
  - **Estimated effort:** 2-3 days

- [x] **Firewall Management**
  - [x] UFW/iptables UI
  - [x] Allow/deny rules
  - [x] Port opening/closing
  - [x] Firewall presets (secure, permissive)
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

### 7. App Store Enhancements
- [x] **Search Functionality**
  - [x] Real-time search
  - [x] Search by name, description, category
  - [ ] Search suggestions
  - [ ] Recent searches
  - **Priority:** HIGH
  - **Estimated effort:** 1 day
  - **Status:** MOSTLY COMPLETED

- [~] **Advanced Filters**
  - [x] Filter by category
  - [ ] Filter by rating
  - [ ] Filter by popularity
  - [ ] Sort by name/date/popularity
  - **Priority:** MEDIUM
  - **Estimated effort:** 1 day

- [ ] **App Ratings & Reviews**
  - [ ] Star ratings (1-5)
  - [ ] User reviews
  - [ ] Review moderation
  - [ ] Helpful/unhelpful votes
  - **Priority:** MEDIUM
  - **Estimated effort:** 2-3 days

- [ ] **Enhanced App Details**
  - [ ] Full screenshot gallery
  - [ ] Video previews
  - [ ] Detailed changelog
  - [ ] Resource requirements display
  - **Priority:** MEDIUM
  - **Estimated effort:** 1-2 days

- [ ] **App Collections**
  - [ ] "Popular" section
  - [ ] "Recently Added" section
  - [ ] "Recommended for you"
  - [ ] Featured apps carousel
  - **Priority:** LOW
  - **Estimated effort:** 1-2 days

### 8. System Updates
- [ ] **LiveOS Update Check**
  - [ ] Check GitHub for new releases
  - [ ] Show release notes
  - [ ] Update notification
  - [ ] Version comparison
  - **Priority:** HIGH
  - **Estimated effort:** 1 day

- [ ] **One-Click Updates**
  - [ ] Update LiveOS from UI
  - [ ] Backup before update
  - [ ] Rollback on failure
  - [ ] Update progress display
  - **Priority:** HIGH
  - **Estimated effort:** 2-3 days

- [ ] **Update Settings**
  - [ ] Auto-update toggle
  - [ ] Update channel (stable/beta)
  - [ ] Update schedule
  - [ ] Update notifications
  - **Priority:** MEDIUM
  - **Estimated effort:** 1 day

### 9. Notifications System
- [ ] **System Notifications**
  - [ ] Low disk space warnings
  - [ ] High CPU/RAM usage alerts
  - [ ] Service failure notifications
  - [ ] Update available notifications
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **App Notifications**
  - [ ] App crashed alerts
  - [ ] App update available
  - [ ] App installation complete
  - [ ] App configuration errors
  - **Priority:** MEDIUM
  - **Estimated effort:** 1-2 days

- [ ] **Notification Center**
  - [ ] Notification history
  - [ ] Notification preferences
  - [ ] Mark as read/unread
  - [ ] Clear all notifications
  - **Priority:** MEDIUM
  - **Estimated effort:** 1-2 days

- [ ] **Notification Channels**
  - [ ] Browser notifications
  - [ ] Email notifications
  - [ ] Webhook notifications
  - [ ] Mobile push (optional)
  - **Priority:** LOW
  - **Estimated effort:** 2-3 days

### 10. Docker Management Enhancements
- [ ] **Resource Limits**
  - [ ] Set CPU limits per app
  - [ ] Set RAM limits per app
  - [ ] Set disk I/O limits
  - [ ] Resource usage enforcement
  - **Priority:** HIGH
  - **Estimated effort:** 2 days

- [ ] **Port Management**
  - [ ] Detect port conflicts
  - [ ] Suggest available ports
  - [ ] Port mapping UI
  - [ ] Reserved ports list
  - **Priority:** HIGH
  - **Estimated effort:** 1-2 days

- [ ] **Volume Management**
  - [ ] View all Docker volumes
  - [ ] Delete unused volumes
  - [ ] Volume size display
  - [ ] Volume backup/restore
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

- [ ] **Network Management**
  - [ ] Create custom networks
  - [ ] Assign apps to networks
  - [ ] Network isolation
  - [ ] Network inspection tools
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

- [ ] **Container Management**
  - [ ] View container logs with filters
  - [ ] Execute commands in containers
  - [ ] Inspect container details
  - [ ] Export/import containers
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

---

## 🟢 Phase 3: User Experience (Nice-to-Have)

### 11. Advanced Features
- [ ] **Reverse Proxy Manager**
  - [ ] Nginx Proxy Manager integration
  - [ ] Traefik integration
  - [ ] Automatic subdomain routing
  - [ ] Custom domain mapping
  - **Priority:** MEDIUM
  - **Estimated effort:** 3-4 days

- [ ] **API for Third-Party**
  - [ ] REST API endpoints
  - [ ] API authentication (tokens)
  - [ ] API rate limiting
  - [ ] API documentation
  - **Priority:** MEDIUM
  - **Estimated effort:** 3-4 days

- [ ] **Plugin/Extension System**
  - [ ] Plugin architecture
  - [ ] Plugin marketplace
  - [ ] Plugin installation UI
  - [ ] Plugin configuration
  - **Priority:** LOW
  - **Estimated effort:** 5-7 days

- [ ] **Mobile App**
  - [ ] iOS app
  - [ ] Android app
  - [ ] Push notifications
  - [ ] Remote access
  - **Priority:** LOW
  - **Estimated effort:** 10+ days

- [ ] **Webhook Support**
  - [ ] Configure webhooks
  - [ ] Webhook triggers (events)
  - [ ] Webhook testing
  - [ ] Webhook logs
  - **Priority:** LOW
  - **Estimated effort:** 2 days

### 12. User Experience Improvements
- [x] **Dashboard Customization**
  - [x] Drag-and-drop widgets
  - [x] Widget library
  - [x] Custom layouts
  - [x] Save/load layouts
  - **Priority:** MEDIUM
  - **Estimated effort:** 3-4 days

- [ ] **Widgets System**
  - [x] System status widget
  - [x] App status widget
  - [x] Storage widget
  - [ ] Network widget
  - [ ] Custom widgets
  - **Priority:** MEDIUM
  - **Estimated effort:** 2-3 days

- [ ] **Theme System**
  - [ ] Dark/light theme toggle
  - [ ] Custom color schemes
  - [ ] Theme editor
  - [ ] Import/export themes
  - **Priority:** LOW
  - **Estimated effort:** 2-3 days

- [ ] **Onboarding Wizard**
  - [ ] First-time setup wizard
  - [ ] Step-by-step configuration
  - [ ] Skip/resume wizard
  - [ ] Tutorial tooltips
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

- [ ] **Keyboard Shortcuts**
  - [ ] Global shortcuts (search, settings)
  - [ ] App shortcuts
  - [ ] Customizable shortcuts
  - [ ] Shortcut help overlay
  - **Priority:** LOW
  - **Estimated effort:** 1-2 days

- [ ] **Accessibility**
  - [ ] Screen reader support
  - [ ] High contrast mode
  - [ ] Keyboard navigation
  - [ ] ARIA labels
  - **Priority:** MEDIUM
  - **Estimated effort:** 2-3 days

### 13. Collaboration Features
- [ ] **Multi-User Support**
  - [ ] Multiple user accounts
  - [ ] User-specific settings
  - [ ] User activity tracking
  - [ ] User profiles
  - **Priority:** MEDIUM
  - **Estimated effort:** 3-4 days

- [ ] **Permission System**
  - [ ] Role-based access control (RBAC)
  - [ ] Granular permissions
  - [ ] Permission templates
  - [ ] Permission inheritance
  - **Priority:** MEDIUM
  - **Estimated effort:** 3 days

- [ ] **Shared Access Controls**
  - [ ] Share apps with users
  - [ ] Share folders with permissions
  - [ ] Shared app settings
  - [ ] Access logs
  - **Priority:** LOW
  - **Estimated effort:** 2-3 days

- [ ] **Activity Logs**
  - [ ] User action logs
  - [ ] System event logs
  - [ ] App operation logs
  - [ ] Log export/filtering
  - **Priority:** MEDIUM
  - **Estimated effort:** 2 days

### 14. Built-in Apps
- [ ] **Download Manager**
  - [ ] HTTP/HTTPS downloads
  - [ ] Download queue
  - [ ] Pause/resume downloads
  - [ ] Download history
  - **Priority:** LOW
  - **Estimated effort:** 3-4 days

- [ ] **Torrent Client**
  - [ ] Add torrents via magnet/file
  - [ ] Torrent management
  - [ ] Speed limits
  - [ ] Ratio settings
  - **Priority:** LOW
  - **Estimated effort:** 4-5 days

- [ ] **Media Server**
  - [ ] Video streaming
  - [ ] Audio streaming
  - [ ] Subtitle support
  - [ ] Transcoding
  - **Priority:** LOW
  - **Estimated effort:** 5-7 days

- [ ] **Photo Gallery**
  - [ ] Photo viewer
  - [ ] Album organization
  - [ ] Photo sharing
  - [ ] Basic editing
  - **Priority:** LOW
  - **Estimated effort:** 4-5 days

- [ ] **Ad-Blocking (Pi-hole)**
  - [ ] DNS-based ad blocking
  - [ ] Blocklist management
  - [ ] Whitelist management
  - [ ] Query logs
  - **Priority:** LOW
  - **Estimated effort:** 3-4 days

---

## ✅ Already Implemented

- [x] System monitoring (CPU, RAM, disk, network, temperature)
- [x] Docker container management (basic)
- [x] App store (Umbrel format + CasaOS community stores)
- [x] Installed apps management
- [x] File browser with real filesystem (list, create, delete)
- [x] Terminal access
- [x] mDNS/.local domain support (Avahi)
- [x] App installation with configuration
- [x] App start/stop/restart
- [x] Container logs viewer
- [x] Settings panel with system details
- [x] Real-time metrics via SSE streaming
- [x] App store dialog with grid/list view
- [x] System information display
- [x] User authentication (PIN-based login)
- [x] Session management with cookies
- [x] Wi-Fi scanning and connection
- [x] App store search (real-time)
- [x] Category filtering in app store
- [x] Custom Docker deploy (compose & run)
- [x] Customize install for store apps
- [x] Status bar with WiFi, battery, date/time
- [x] Lock screen with PIN

---

## 📊 Summary Statistics

### By Priority
- **Critical**: 12 features
- **High**: 25 features
- **Medium**: 32 features
- **Low**: 18 features

### By Phase
- **Phase 1 (Security & Stability)**: 4 major features, ~35 sub-features
- **Phase 2 (Core Features)**: 6 major features, ~40 sub-features
- **Phase 3 (User Experience)**: 4 major features, ~25 sub-features

### Estimated Timeline
- **Phase 1**: 4-6 weeks (2 developers) or 8-12 weeks (1 developer)
- **Phase 2**: 6-8 weeks (2 developers) or 12-16 weeks (1 developer)
- **Phase 3**: 8-10 weeks (2 developers) or 16-20 weeks (1 developer)

**Total**: ~6-8 months with 1 developer working full-time

---

## 🎯 Recommended Implementation Order

1. **Start with Phase 1** - Security is critical
2. **Most important first**:
   - User Authentication (1-2 weeks)
   - Backup System (1 week)
   - HTTPS/SSL (1 week)
   - App Updates (1 week)

3. **Then Phase 2** - Core functionality
4. **Finally Phase 3** - Polish and UX

---

## 📝 Notes

- Estimates are approximate and may vary based on complexity
- Some features depend on others (e.g., HTTPS requires reverse proxy)
- Testing and bug fixing time not included in estimates
- Documentation time not included in estimates
- Some features may be skipped or deprioritized based on user needs

---

**Last Updated**: January 19, 2026
**Maintained By**: LiveOS Development Team
