import fs from 'fs/promises';
import path from 'path';
import readline from 'readline/promises';
import { Api, TelegramClient } from 'telegram';
import 'dotenv/config';
import { StringSession } from 'telegram/sessions';
import { LogLevel } from 'telegram/extensions/Logger';
import { generateRandomBigInt } from 'telegram/Helpers';
import ExcelJS from 'exceljs';
import {MeiliSearch} from 'meilisearch';



(async () => {
    console.log('Парсер v1.0 запускается');
    const rl = readline.createInterface(process.stdin, process.stdout);
    const search = new MeiliSearch({
        host: 'localhost:7767',
        apiKey: process.env.MEILISEARCH_KEY
    });
    const index = search.index<{
        id: string;
        name: string;
        categories: string;
        brands: string;
        organization: string;
        status: string;
        inn: string;
    }>('sellers');

    let db: {
        id: string;
        name: string;
        categories: string;
        brands: string;
        organization: string;
        status: string;
        inn: string;
    }[] = [];

    {
        console.log('Читаю файлы...');
        const stats = await fs.readdir(process.cwd());
        if (!stats.includes("bots.temp.txt") || !stats.includes('users.temp.txt') || !stats.includes('names.temp.txt') || !stats.includes('database.temp.xlsx')) {
            console.log('Нет входных файлов. Прекращение работы...');
            return;
        }

        if (!stats.includes('preprocess.temp.json')) {
            console.log('Нет файла с токенами ботов. Создаю пустой...');
            fs.writeFile(path.join(process.cwd(), 'logins.temp.json'), '{}');
        }
    }


    console.log('Загружаю данные...')
    const bots = (await fs.readFile(path.join(process.cwd(), 'bots.temp.txt')), 'utf-8').split('\n').filter(el => el);
    const users = (await fs.readFile(path.join(process.cwd(), 'users.temp.txt'), 'utf-8')).split('\n').filter(el => el);
    let loggedbefore: {
        [phone: string]: string
    } = JSON.parse((await fs.readFile(path.join(process.cwd(), 'logins.temp.json'),'utf-8')));


    if (users.length === 0 || bots.length === 0) {
        console.log('Массив пользователей или ботов пуст. Заканчиваю работу...');
        return;
    }

    await index.addDocuments(db);

    console.log('Подключаю юзерботов...')
    let clients: TelegramClient[] = [];

    
    for (const bot of bots) {
        let session: StringSession;
        if (loggedbefore[bot]) {
            console.log(`Бот ${bot} уже входил. Захожу через память...`)
            session = new StringSession(loggedbefore[bot]);
        } else {
            console.log(`Бот ${bot} не входил раньше. Потребуется код из смс`)
            session = new StringSession();
        }

        const client = new TelegramClient(session, +process.env.TG_API_ID!, process.env.TG_API_HASH!, {
        });
        client.setLogLevel(LogLevel.NONE);
        await client.start({
            async onError(err) {
                console.error(`Произошла ошибка при входе в аккаунт ${bot}`);
                console.log(err);
                return false;
            },
            phoneNumber: bot,
            phoneCode: async () => await rl.question(`Введите код из смс для бота ${bot}: `)
        });

        clients.push(client);
        loggedbefore[bot] = client.session.save()!;
    }

    await fs.writeFile(path.join(process.cwd(), 'preprocess.temp.json'), JSON.stringify(loggedbefore), 'utf-8');
    console.log(`Вход в ботов завершен. Начинаю препроцессинг пользователей...`);

    console.log(`Собираю имена...`)
    const names = (await fs.readFile(path.join(process.cwd(), 'names.temp.txt'), 'utf-16le')).split('\n').filter(el => el);
    if (names.length !== users.length) {
        console.log('Количество имен и пользователей не совпадает. Решаю вопрос...');
        let idx = 1;
        while (names.length < users.length) {
            console.log('Добавляю случайное имя (Формата Фамилия Имя Отчество)');
            names.push(`${idx} Селлер Иванович`);
        }
    }

    console.log()

    let results: {
        phone: string,
        id: string,
        username?: string,
        firstName: string,
        inn?: string,
        wbId?: string,
        categories?: string, 
        status?: string, 
        brands?: string,
    }[] = [];

    

    for (let i = 0; i < users.length; i++) {
        try {
            console.log(`Пользователь ${users[i]}`);

            const client = clients[i % clients.length];
            console.log(`Выбран юзербот`);
            console.log('Добавляю контакт...');
            const [lastName, firstName] = names[i].split(' ');
            const contactResult = await client.invoke(new Api.contacts.ImportContacts({
                contacts: [
                    new Api.InputPhoneContact({
                        clientId: generateRandomBigInt(),
                        firstName,
                        lastName,
                        phone: users[i]
                    })
                ]
            }));

            if (contactResult.users.length === 0) throw new Error('User not found');
            const entity = contactResult.users[0] as Api.User;

            console.log('Контакт добавлен. Выясняю имя пользователя...');
            if (!entity.username) {
                console.log('Нету имени пользователя. ');
            } else {
                console.log(`Имя пользователя определно: ${entity.username}`);
            }

            console.log('Ищу в базе вбкон...');
            const found = await index.search(names[i], {
                attributesToSearchOn: [
                    'name', 'organization'
                ]
            });
            if (found.hits.length === 0) {
                results.push({
                    firstName,
                    id: entity.id.toString(),
                    phone: users[i],
                    username: entity.username,
                });
                throw new Error("Поставщик не найден");
            } 
            console.log('Поставщик найден');
            const seller = found.hits[0];
            results.push({
                firstName,
                id: entity.id.toJSON(),
                brands: seller.brands,
                categories: seller.categories,
                phone: users[i],
                inn: seller.inn,
                status: seller.status,
                username: entity.username,
                wbId: seller.id
            });
        } catch (error) {
            console.log('Парсинг пользователя прекращен.')
        } finally {
            console.log('Ожидаю...');
            await new Promise((resolve, reject) => setTimeout(resolve, 1000));
            console.log('перехожу к следующему пользователю...')
        }
    }

    console.log('Парсинг окончен. Сохраняю результаты...');
    await fs.writeFile(path.join(process.cwd(), 'results.temp.txt'), JSON.stringify(results), 'utf-8');

    

})()