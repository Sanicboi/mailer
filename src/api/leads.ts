import e from "express";
import { Req } from "./middleware/auth";
import { manager } from "../db";
import { LeadBase } from "../entities/leadBase";
import { Lead } from "../entities/lead";

const router = e.Router();

router.get("/bases/:id", async (req: Req, res): Promise<any> => {
  const base = await manager.find(LeadBase, {
    where: {
      user: req.user,
      id: Number(req.params.id),
    },
    relations: {
      leads: true,
    },
  });
  if (!base) return res.status(404).end();

  res.status(200).json(base);
});

router.get("/bases", async (req: Req, res) => {
  const bases = await manager.find(LeadBase, {
    where: {
      user: req.user,
    },
    relations: {
      leads: true,
    },
  });

  res.status(200).send(bases);
});

router.get("/:username", async (req: Req, res): Promise<any> => {
  const lead = await manager.findOne(Lead, {
    where: {
      username: req.params.username,
      user: req.user,
    },
    relations: {
      bot: true,
    },
    select: {
      bot: {
        token: false,
        codeHash: false,
      },
    },
  });
  if (!lead) return res.status(404).end();
  res.status(200).json(lead);
});

router.get("/", async (req: Req, res) => {
  const leads = await manager.find(Lead, {
    where: {
      user: req.user,
    },
    relations: {
      bot: true,
    },
    select: {
      bot: {
        token: false,
        codeHash: false,
      },
    },
  });

  res.status(200).json(leads);
});

router.post(
  "/bases",
  async (
    req: Req<{
      leads: {
        username: string;
        data: string;
        phone: string;
      }[];
    }>,
    res,
  ) => {
    try {
      const base = new LeadBase();
      base.leads = [];

      for (const l of req.body.leads) {
        const lead = new Lead();
        lead.username = l.username;
        lead.data = l.data;
        lead.phone = l.phone;
        await manager.save(lead);
        base.leads.push(lead);
      }

      await manager.save(base);
      res.status(201).json(base);
    } catch (error) {
      res.status(400).end();
    }
  },
);

export default router;
