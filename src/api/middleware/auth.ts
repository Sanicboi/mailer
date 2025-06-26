import type e from "express";
import { User } from "../../entities/user";
import { manager } from "../../db";
import jwt, { JwtPayload } from 'jsonwebtoken';
import type {ParamsDictionary} from 'express-serve-static-core';

export interface Req<Body = any, Params = ParamsDictionary> extends e.Request<Params, any, Body> {
    user?: User
}

interface AuthPayload extends JwtPayload {
    id?: number;
}

export const authorize = async (req: Req, res: e.Response, next: e.NextFunction): Promise<any> => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).end(); 
    if (typeof header !== 'string') return res.status(400).end();
    if (!header.startsWith('Bearer ')) return res.status(400).end();
    const token = header.split(' ')[1];
    if (!token) return res.status(401).end();

    try {
        const verified: string | AuthPayload = jwt.verify(token, process.env.JWT_KEY!);
        if (typeof verified === 'string') return res.status(401).end();
        if (!verified.id) return res.status(401).end();
        if (typeof verified.id !== 'number') return res.status(401).end();

        const user = await manager.findOne(User, {
            where: {
                id: verified.id
            }
        });
        if (!user) return res.status(404).end();
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).end();
    }
}