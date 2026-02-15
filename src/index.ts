import express from "express";
import clubsRouter from "./routes/clubs";
import { config } from "dotenv";

config();
//TODO: add cors, body-parser, and other middleware as needed
const app = express();
app.use("/clubs", clubsRouter);

const PORT = 5001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
