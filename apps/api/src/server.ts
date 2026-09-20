import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";

const app: Express = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "maanak-api",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[MAANAK-API] Running on port ${port}`);
  });
}

export { app };
