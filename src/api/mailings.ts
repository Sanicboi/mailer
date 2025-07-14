import e from "express";
import { Req } from "./middleware/auth";
import { manager } from "../db";
import { Mailing } from "../entities/mailing";
import { Bot } from "../entities/bot";
import dayjs from "dayjs";
import { IsNull, LessThan, Or } from "typeorm";
import { Lead } from "../entities/lead";
import { LeadBase } from "../entities/leadBase";
import { clients } from "../clients";
import { AI } from "../ai";
import { amo, CustomFieldID } from "../crm";
import { wait } from "../utils";

const router = e.Router();

router.get("/:id", async (req: Req, res): Promise<any> => {
  const mailing = await manager.findOne(Mailing, {
    where: {
      user: req.user,
      id: Number(req.params.id),
    },
    relations: {
      bots: true,
      leadBase: true,
      leads: true,
    },
    select: {
      bots: {
        codeHash: false,
        token: false,
      },
    },
  });

  if (!mailing) return res.status(404).end();
  res.status(200).json(mailing);
});

router.get("/", async (req: Req, res) => {
  const mailings = await manager.find(Mailing, {
    where: {
      user: req.user,
    },
    relations: {
      bots: true,
      leadBase: true,
      leads: true,
    },
    select: {
      bots: {
        codeHash: false,
        token: false,
      },
    },
  });

  res.status(200).json(mailings);
});


router.post(
  "/",
  async (
    req: Req<{
      numAccs: number;
      baseId: number;
    }>,
    res,
  ): Promise<any> => {
    if (!req.user) return;

    const N = 15;
    const barrier = dayjs().subtract(2, "days").toDate();
    let bots = await manager.find(Bot, {
      where: {
        user: req.user,
        blocked: false,
      },
      take: req.body.numAccs,
      order: {
        lastMessage: "ASC",
      },
      relations: {
        mailings: true
      }
    });
    const leads = await manager.find(Lead, {
      where: {
        user: req.user,
        previousResId: IsNull(),
        leadBase: {
          id: req.body.baseId,
        },
      },
      take: bots.length * N,
    });

    if (leads.length === 0) return res.status(404).end();

    let mailing: Mailing | null = new Mailing();
    mailing.leadBase = new LeadBase();
    mailing.leadBase.id = req.body.baseId;
    mailing.user = req.user;
    mailing.bots = bots;
    mailing.leads = leads;
    await manager.save(mailing);

    for (let i = 0; i < leads.length; i++) {
      leads[i].mailing = mailing;
    }
    
    for (let i = 0; i < bots.length; i++) {
      bots[i].mailings.push(mailing);
    }


    res.status(201).end();

    for (let i = 0; i < leads.length; i++) {
      mailing = await manager.findOneBy(Mailing, {
        id: mailing?.id,
      });
      if (!mailing) break;
      if (!mailing.active) {
        break;
      }
      const botIdx = i % bots.length;
      const client = clients.get(bots[botIdx].phone);
      if (!client) continue;

      const ai = new AI(req.user.prompt);
      const firstRes = await ai.createFirstMessage(leads[i].data);
      try {
        if (dayjs().subtract(4, "minutes").isBefore(bots[botIdx].lastMessage)) {
          await wait(dayjs().diff(bots[botIdx].lastMessage, "s"));
        }
        bots[botIdx].lastMessage = new Date();

        await manager.save(bots[botIdx]);

        await client.sendMessage(leads[i].username, {
          message: firstRes.text,
        });
        leads[i].previousResId = firstRes.id;
        leads[i].sent = true;
        leads[i].bot = bots[botIdx];
        leads[i].amoId = (
          await amo.addDeal([
            {
              pipeline_id: 9442090,
              status_id: 77868898,
              custom_fields_values: [
                {
                  field_id: CustomFieldID.Phone,
                  values: [
                    {
                      value: leads[i].phone,
                    },
                  ],
                },
                {
                  field_id: CustomFieldID.Username,
                  values: [
                    {
                      value: leads[i].username,
                    },
                  ],
                },
                {
                  field_id: CustomFieldID.INN,
                  values: [{
                    value: leads[i].inn
                  }]
                },
                {
                  field_id: CustomFieldID.Dialog,
                  values: [{
                    value: firstRes.text
                  }]
                }
              ],
              name: leads[i].username,
            },
          ])
        ).id;
        await manager.save(leads[i]);
      } catch (error) {
        console.error(error);
      }
    }
  },
);

router.put('/:id', async (req: Req, res): Promise<any> => {
  const mailing = await manager.findOne(Mailing, {
    where: {
      user: req.user,
      active: true
    }
  });
  if (!mailing) return res.status(404).end();
  mailing.active = false;
  await manager.save(mailing);
})

export default router;
