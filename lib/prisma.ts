import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaBetterSqlite3(
  {
    url: "file:./prisma/live-os.db",
  },
  {
    timestampFormat: "unixepoch-ms",
  },
);

const prisma = new PrismaClient({
  adapter,
});

export { prisma };
export default prisma;
