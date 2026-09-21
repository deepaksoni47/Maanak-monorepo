import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config();

const port = process.env.PORT || 4000;

let server: ReturnType<typeof app.listen> | null = null;

if (process.env.NODE_ENV !== "test") {
  server = app.listen(port, () => {
    console.log(
      `[MAANAK-API] Legal Metrology Backend Server running on port ${port}`,
    );
    console.log(
      `[MAANAK-API] Healthcheck available at: http://localhost:${port}/health`,
    );
  });

  // Graceful shutdown handling
  const handleShutdown = (signal: string) => {
    console.log(`[MAANAK-API] Received ${signal}. Gracefully shutting down...`);
    if (server) {
      server.close(() => {
        console.log("[MAANAK-API] Closed HTTP server.");
        process.exit(0);
      });
      // Force close after 5 seconds if connections linger
      setTimeout(() => {
        console.error("[MAANAK-API] Forcefully shutting down.");
        process.exit(1);
      }, 5000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

export { app, server };
