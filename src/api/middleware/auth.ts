import type e from "express";
import { User } from "../../entities/user";
import { manager } from "../../db";
import jwt, { JwtPayload } from "jsonwebtoken";
import type { ParamsDictionary } from "express-serve-static-core";

export interface Req<Body = any, Params = ParamsDictionary>
  extends e.Request<Params, any, Body> {
  user?: User;
}

interface AuthPayload extends JwtPayload {
  id?: number;
}

export const authorize = async (
  req: Req,
  res: e.Response,
  next: e.NextFunction,
): Promise<any> => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).end();
  console.log("Has Auth header");
  if (typeof header !== "string") return res.status(400).end();
  console.log("Of correct type");
  if (!header.startsWith("Bearer ")) return res.status(400).end();
  console.log("Starts with bearer");
  const token = header.split(" ")[1];
  if (!token) return res.status(401).end();
  console.log(token);

  try {
    console.log(process.env.JWT_KEY!);
    const verified: string | AuthPayload = jwt.verify(
      token,
      process.env.JWT_KEY!,
    );
    console.log("Verified");
    if (typeof verified === "string") return res.status(401).end();
    console.log("Payload of correct type");
    if (!verified.id) return res.status(401).end();
    console.log("Payload has ID");
    if (typeof verified.id !== "number") return res.status(401).end();
    console.log("ID is number");

    const user = await manager.findOne(User, {
      where: {
        id: verified.id,
      },
    });
    if (!user) return res.status(404).end();
    console.log("User found");
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).end();
  }
};
