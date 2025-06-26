

import { db } from "./db";
import 'dotenv/config';
import server from './api';

db.initialize().then(async () => {
    await server();
})