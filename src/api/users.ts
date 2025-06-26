import e from "express";
import { Req } from "./middleware/auth";

const router = e.Router();

router.get("/", async (req: Req, res) => {
  res.status(200).json(req.user);
});

export default router;
