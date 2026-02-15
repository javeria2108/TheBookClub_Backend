import express from "express";
import clubsRouter from "./routes/clubs";
import { config } from "dotenv";
import { disconnectDB } from "./config/db";
import authRouter from "./routes/authRoutes";

config();
//TODO: add cors, body-parser, and other middleware as needed
const app = express();

app.use("/clubs", clubsRouter);
app.use("/auth", authRouter);

const PORT = 5001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/**
 * Safety measure: Disconnect Prisma when the Node process terminates
 */
process.on("uncaughtException", async (err) => {
  console.error("Uncaught exception:", err);
  await disconnectDB();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});
