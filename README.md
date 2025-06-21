# HomeOS Clone

A CasaOS-style dashboard built with Next.js 14, TypeScript, Prisma and Socket.IO.

## Development

### Prerequisites

- Node.js 20+
- Docker and docker-compose

### Setup

1. Copy `.env.local.example` to `.env.local` and update the variables.
2. Install dependencies with `npm install`.
3. Run Prisma migrations using `npx prisma migrate dev`.
4. Start the stack with `docker-compose up` and open `http://localhost:3000`.

### Build & Deploy

Run `npm run build` to create a production build. Deploy with Docker or to a provider like Vercel.

## Folder structure

```
app/
  dashboard/
    page.tsx
  api/
    containers/route.ts
hooks/
  useStats.ts
lib/
  prisma.ts
  socket.ts
pages/
  api/
    socket.ts
prisma/
  schema.prisma
```

This repository provides a minimal starting point. Additional features like authentication, file browsing and plugin management can be built on top of this foundation.
