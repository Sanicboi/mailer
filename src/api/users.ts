import e from "express";
import { Req } from "./middleware/auth";
import { manager } from "../db";
import { User } from "../entities/user";

const router = e.Router();

router.get("/", async (req: Req, res) => {
  res.status(200).json(req.user);
});

router.put('/', async (req: Req<{
  prompt: string
}>, res) => {
  if (!req.user) return;
  req.user.prompt = req.body.prompt;
  await manager.save(req.user);
  res.status(204).end();
});

router.post('/', async (req: Req<{
  prompt: string,
  name: string
}>, res) => {
  const user = new User();
  user.prompt = req.body.prompt;
  user.name = req.body.name;
  await manager.save(user);
  res.status(201).end();
})

export default router;
