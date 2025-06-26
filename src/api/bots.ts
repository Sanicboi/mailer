import e from "express";
import { Req } from "./middleware/auth";
import { manager } from "../db";
import { Bot } from "../entities/bot";

const router = e.Router();

router.get("/:phone", async (req: Req, res): Promise<any> => {
  const bot = await manager.findOne(Bot, {
    where: {
      user: req.user,
      phone: req.params.phone,
    },
  });

  if (!bot) return res.status(404).end();
  res.status(200).json(bot);
});

router.get("/", async (req: Req, res) => {
  const bots = await manager.find(Bot, {
    where: {
      user: req.user,
    },
    select: {
      codeHash: false,
      token: false,
    },
  });

  res.status(200).json(bots);
});

export default router;
