import e from "express";
import { Bot } from "../entity/Bot";
import { AppDataSource } from "../data-source";
import { sendCode, login } from "../clients";

const manager = AppDataSource.manager;
const router = e.Router();

router.post(
  "/api/auth/bot",
  async (
    req: e.Request<
      any,
      any,
      {
        phone?: string;
      }
    >,
    res
  ): Promise<any> => {
    if (!req.body.phone || typeof req.body.phone !== "string")
      return res.status(400).end();

    const bot = new Bot();
    bot.phone = req.body.phone;
    await manager.save(bot);

    try {
      await sendCode(bot);
      res.status(201).end();
    } catch (error) {
      return res.status(500).end();
    }
  }
);

router.post(
  "/api/auth/code",
  async (
    req: e.Request<
      any,
      any,
      {
        phone?: string;
        code?: string;
      }
    >,
    res
  ): Promise<any> => {
    if (!req.body.phone || typeof req.body.phone !== "string")
      return res.status(400).end();
    if (!req.body.code || typeof req.body.code !== "string")
      return res.status(400).end();

    const bot = await manager.findOneBy(Bot, {
      phone: req.body.phone,
    });
    if (!bot) return res.status(404).end();

    try {
      await login(bot, req.body.code);
      res.status(204).end();
    } catch (error) {
      return res.status(500).end();
    }
  }
);

router.get("/api/bots", async (req, res) => {
  const bots = await manager.find(Bot, {
    select: {
      codeHash: false,
      token: false,
    },
    relations: {
      group: true,
    }
  });

  res.status(200).json(bots);
});

router.get("/api/bots/:phone", async (req, res): Promise<any> => {
  const bot = await manager.findOne(Bot, {
    select: {
      codeHash: false,
      token: false,
    },
    where: {
      phone: req.params.phone
    },
    relations: {
      group: true
    }
  });
  if (!bot) return res.status(404).end();
  res.status(200).json(bot);
});



export default router;
