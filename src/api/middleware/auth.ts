import e from "express";
import { User } from "../../entities/user";
import { manager } from "../../db";

export interface Req<Body = any> extends e.Request<{
    userId?: string,
    [key: string]: string | undefined
}, any, Body> {
    user?: User
}

export const authorize = async (req: Req, res: e.Response, next: e.NextFunction): Promise<any> => {
    if (!req.params.userId) {
        return res.status(401).end();
    }

    const found = await manager.findOne(User, {
        where: {
            id: Number(req.params.userId)
        },
    });
    if (!found) return res.status(404).end();
    req.user = found;
    next();
}