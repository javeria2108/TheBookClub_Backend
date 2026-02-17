import express from "express";
import clubsRouter from "./routes/clubs";
import { config } from "dotenv";
import authRouter from "./routes/authRoutes";

config();
//TODO: add cors, body-parser, and other middleware as needed
const app = express();

app.use(express.json());
app.use("/clubs", clubsRouter);
app.use("/auth", authRouter);

const PORT = 5001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
