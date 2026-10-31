import http from "node:http";
import { prisma } from "@docket/db";
import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();
const server = http.createServer(app);

const startServer = () => {
  server.listen(env.PORT, () => {
    console.log(`✅ API running on http://localhost:${env.PORT}`);
  });
};

const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  server.close(async (error) => {
    if (error) {
      console.error("❌ Error while closing server:", error);
      process.exit(1);
      return;
    }

    try {
      await prisma.$disconnect();
      console.log("✅ Prisma disconnected");
      process.exit(0);
    } catch (disconnectError) {
      console.error("❌ Error disconnecting Prisma:", disconnectError);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  void shutdown("uncaughtException");
});

startServer();