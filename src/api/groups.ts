import e from "express";
import { AppDataSource } from "../data-source";
import { BotGroup } from "../entity/BotGroup";
import { Bot } from "../entity/Bot";

const router = e.Router();
const manager = AppDataSource.manager;

router.post(
  "/api/groups",
  async (req: e.Request<any, any, string[]>, res): Promise<any> => {
    if (
      !Array.isArray(req.body) ||
      !req.body.every((el) => typeof el === "string")
    )
      return res.status(400).end();
    
    const group = new BotGroup();
    group.bots = req.body.map<Bot>(el => {
        const b = new Bot();
        b.phone = el;
        return b
    });
    await manager.save(group);
    res.status(201).json({
        id: group.id
    });
  }
);

router.get('/api/groups', async (req, res): Promise<any> => {
    const groups = await manager.find(BotGroup, {
        relations: {
            bots: true
        },
        select: {
            bots: {
                codeHash: false,
                token: false
            }
        }
    });

    res.status(200).json(groups);
})

router.get('/api/groups/:id', async (req, res): Promise<any> => {
    const group = await manager.findOne(BotGroup, {
        where: {
            id: +req.params.id
        },
        relations: {
            bots: true
        },
        select: {
            bots: {
                codeHash: false,
                token: false
            }
        }
    });

    if (!group) return res.status(404).end();
    res.status(200).json(group);
});





export default router;
