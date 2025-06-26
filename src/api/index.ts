import e from "express";
import { authorize } from "./middleware/auth";
import leads from "./leads";
import bots from "./bots";
import mailings from "./mailings";
import users from "./users";
import jwt from "jsonwebtoken";

export default async () => {
  const app = e();
  app.use(e.json());
  app.get("/token", async (req, res) => {
    const token = jwt.sign(
      {
        id: 1,
      },
      process.env.JWT_KEY!,
    );
    res.status(201).json({
      token,
    });
  });
  app.use("/api", authorize);

  app.use("/api/leads", leads);
  app.use("/api/bots", bots);
  app.use("/api/mailings", mailings);
  app.use("/api/users", users);

  app.listen(80);
};
