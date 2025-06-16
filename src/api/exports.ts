import e from "express";
import { AppDataSource } from "../data-source";
import { Mailing } from "../entity/Mailing";
import { getDialog } from "../clients";


const router = e.Router();
const manager = AppDataSource.manager;

router.get('/api/exports/mailings/:id', async (req, res): Promise<any> => {
    const mailing = await manager.findOne(Mailing, {
        where: {
            id: +req.params.id
        },
        relations: {
            users: {
                bot: true
            }
        }
    });

    if (!mailing) return res.status(404).end();

    let result: {
        user: string,
        messages: {
            role: 'ai' | 'user',
            text: string
        }[]
    }[] = [];

    for (const user of mailing.users) {
        try {
            if (user.replied) {
                result.push({
                    messages: await getDialog(user.username, user.bot.phone),
                    user: user.username
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    res.status(200).json(result);
})

export default router;
