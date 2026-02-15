import express from "express";

const router = express.Router();

router.get("/hello", (req, res) => {
  res.json({ message: "hello world" });
});

export default router;
