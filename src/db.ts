import { DataSource } from "typeorm";


export const db = new DataSource({
    type: 'postgres',
    username: 'test',
    password: 'test',
    database: 'test',
    entities: [

    ],
    host: 'postgres',
    port: 5432,
    logging: true,
    synchronize: true
})

export const manager = db.manager;