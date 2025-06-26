import e from "express"
import { authorize } from "./middleware/auth";
import leads from './leads';
import bots from './bots';
import mailings from './mailings';
import users from './users';

export default async () => {
    const app = e();
    app.use(e.json());
    app.use(authorize);

    app.use('/leads', leads);
    app.use('/bots', bots);
    app.use('/mailings', mailings);
    app.use('/users', users);


    app.listen(80);
}