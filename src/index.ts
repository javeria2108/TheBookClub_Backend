import express from "express";
import clubsRouter from "./routes/clubs";
import { config } from "dotenv";
import authRouter from "./routes/authRoutes";
import cors from "cors";

config();

const app = express();
//Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/clubs", clubsRouter);
app.use("/api/auth", authRouter);

const PORT = 5001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
