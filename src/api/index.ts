import e from "express"
import { authorize } from "./middleware/auth";




export default async () => {
    const app = e();
    app.use(e.json());
    app.param('userId', authorize);



    app.listen(80);
}