import e from "express";
import { AppDataSource } from "../data-source";
import { Mailing } from "../entity/Mailing";
import { Bot } from "../entity/Bot";
import { User } from "../entity/User";
import { IsNull } from "typeorm";
import { clients } from "../clients";
import { ai } from "../ai";

const router = e.Router();
const manager = AppDataSource.manager;

const wait = async (s: number) => {
  return await new Promise((resolve, reject) => setTimeout(resolve, 1000 * s));
};

router.post(
  "/api/mailings",
  async (
    req: e.Request<
      any,
      any,
      {
        group?: number;
        messagesPerBot?: number;
      }
    >,
    res
  ): Promise<any> => {
    if (!req.body.group || typeof req.body.group !== "number")
      return res.status(400).end();
    if (!req.body.messagesPerBot || typeof req.body.messagesPerBot !== "number")
      return res.status(400).end();

    const groupBots = await manager.find(Bot, {
      where: {
        group: {
          id: req.body.group,
        },
        loggedIn: true,
        blocked: false,
      },
    });

    const users = await manager.find(User, {
      where: {
        sent: false,
        lastMsgId: IsNull(),
      },
      take: groupBots.length,
    });

    let mailing = new Mailing();
    mailing.bots = groupBots;
    mailing.users = users;
    groupBots.forEach((b, idx) => groupBots[idx].mailings.push(mailing));
    users.forEach((u, idx) => (users[idx].mailing = mailing));

    res.status(201).json({
      id: mailing.id,
    });

    let promises: Promise<void>[] = [];
    for (let i = 0; i < groupBots.length; i++) {
      promises.push(
        (async () => {
          if (!req.body.messagesPerBot) return;
          const client = clients.get(groupBots[i].phone);
          if (!client) return;
          for (let k = 0; k < req.body.messagesPerBot; k++) {
            mailing = (await manager.findOne(Mailing, {
              where: {
                id: mailing.id,
              },
            }))!;
            if (!mailing.active) return;
            const message = await ai.createFirstMessage(
              users[i * req.body.messagesPerBot + k].additionalData
            );
            try {
              await client.sendMessage(
                users[i * req.body.messagesPerBot + k].username,
                {
                  message: message.text,
                }
              );
              users[i * req.body.messagesPerBot + k].lastMsgId = message.id;
              users[i * req.body.messagesPerBot + k].sent = true;
              users[i * req.body.messagesPerBot + k].bot = groupBots[i];
              await manager.save(users[i * req.body.messagesPerBot + k]);
            } catch (error) {
              console.error(error);
            } finally {
              await wait(4 * 60);
            }
          }
        })()
      );
    }

    await Promise.all(promises);
  }
);

router.put("/api/mailings/:id/stop", async (req, res) => {
  try {
    await manager
      .createQueryBuilder()
      .update(Mailing)
      .set({ active: false })
      .where("id = :id", {
        id: +req.params.id,
      })
      .execute();
    res.status(204).end();
  } catch (error) {
    res.status(404).end();
  }
});

router.get("/api/mailings", async (req, res) => {
  const mailings = await manager.find(Mailing, {
    relations: {
      bots: true,
      users: {
        bot: true,
      },
    },
    select: {
      bots: {
        codeHash: false,
        token: false,
      },
      users: {
        bot: {
          codeHash: false,
          token: false,
        },
      },
    },
  });

  res.status(200).json(mailings);
});

router.get("/api/mailings/:id", async (req, res): Promise<any> => {
  const mailing = await manager.findOne(Mailing, {
    where: {
      id: +req.params.id,
    },
    relations: {
      bots: true,
      users: {
        bot: true,
      },
    },
    select: {
      bots: {
        codeHash: false,
        token: false,
      },
      users: {
        bot: {
          codeHash: false,
          token: false,
        },
      },
    },
  });

  if (!mailing) return res.status(404).end();
  res.status(200).json(mailing);
});

export default router;
