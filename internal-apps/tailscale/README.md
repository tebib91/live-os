# Tailscale (Internal App)

This folder packages the Tailscale daemon as an internal LiveOS app.

## What it does
- Runs `tailscaled` in a privileged container with host networking.
- Creates a persistent volume for `/var/lib/tailscale` so auth survives restarts.
- Grants `NET_ADMIN`/`NET_RAW` and mounts `/dev/net/tun` so the tunnel interface can be created.

## How to use
1. Deploy the compose: `docker compose -f internal-apps/tailscale/docker-compose.yml up -d`
2. Authenticate:
   - Easiest: `docker exec -it liveos-tailscale tailscale up`
   - Optional unattended: set `TS_AUTHKEY` env in the compose and redeploy.
3. Verify: `docker exec -it liveos-tailscale tailscale status`

## Notes
- Icon reference is remote: `https://tailscale.com/logo-square.png`.
- If you want the host to advertise subnet routes or exit-node capability, add the appropriate `tailscale up` flags after auth.
- Container name: `liveos-tailscale`; state volume: `tailscale-state`.
