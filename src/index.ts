

import { db } from "./db";
import 'dotenv/config';
import server from './api';
import { init } from "./clients";

db.initialize().then(async () => {
    await init();
    await server();
})