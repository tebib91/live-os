import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Keep this in sync with lib/prisma.ts
    url: "file:./prisma/live-os.db",
  },
});
