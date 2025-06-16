import express from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entity/User';


const router = express.Router();
const manager = AppDataSource.manager;

router.get('/api/users', async (req, res) => {
    const users = await manager.find(User);
    res.status(200).json(users);
});

router.get('/api/users/:username', async (req, res): Promise<any> => {
    const user = await manager.findOne(User, {
        where: {
            username: req.params.username
        }
    });
    if (!user) return res.status(404).end();
    res.status(200).json(user);
});

router.post('/api/users', async (req: express.Request<any, any, [
    {
        username?: string;
        data?: string;
    }
]>, res): Promise<any> => {
    if (!Array.isArray(req.body)) return res.status(400).end();
    for (const user of req.body) {
        if (!user.username || !user.data) continue
        const u = new User();
        u.username = user.username;
        u.additionalData = user.data;
        await manager.save(u);
    }
    res.status(201).end();
});



export default router;