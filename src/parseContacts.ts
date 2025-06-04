import fs from "fs/promises";
import path from "path";
//@ts-ignore
import input from 'input';
import { Api, TelegramClient } from "telegram";
import "dotenv/config";
import { StringSession } from "telegram/sessions";
import { LogLevel } from "telegram/extensions/Logger";
import { generateRandomBigInt } from "telegram/Helpers";

(async () => {
  console.log("Парсер ТГ контактов v1.0 запускается");

  {
    console.log("Читаю файлы...");
    const stats = await fs.readdir(process.cwd());
    if (
      !stats.includes("bots.temp.txt") ||
      !stats.includes("users.temp.txt") ||
      !stats.includes("names.temp.txt")
    ) {
      console.log("Нет входных файлов. Прекращение работы...");
      return;
    }

    if (!stats.includes("logins.temp.json")) {
      console.log("Нет файла с токенами ботов. Создаю пустой...");
      fs.writeFile(path.join(process.cwd(), "logins.temp.json"), "{}");
    }
  }

  console.log("Загружаю данные...");
  const bots = (await fs.readFile(path.join(process.cwd(), "bots.temp.txt"), 'utf-8'))
    .split("\n")
    .filter((el) => el);
  const users = (
    await fs.readFile(path.join(process.cwd(), "users.temp.txt"), "utf-8")
  )
    .split("\n")
    .filter((el) => el)
    .map(el => el.startsWith('+') ? el : '+' + el);

  let loggedbefore: {
    [phone: string]: string;
  } = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "logins.temp.json"), "utf-8")
  );

  if (users.length === 0 || bots.length === 0) {
    console.log("Массив пользователей или ботов пуст. Заканчиваю работу...");
    return;
  }

  console.log("Подключаю юзерботов...");
  let clients: TelegramClient[] = [];

  for (const bot of bots) {
    console.log(bot);
    if (!bot) continue;
    let session: StringSession;
    if (loggedbefore[bot]) {
      console.log(`Уже входил. Захожу через память...`);
      session = new StringSession(loggedbefore[bot]);
    } else {
      console.log(`Не входил раньше. Потребуется код из смс`);
      session = new StringSession();
    }

    const client = new TelegramClient(
      session,
      +process.env.TG_API_ID!,
      process.env.TG_API_HASH!,
      {}
    );
    client.setLogLevel(LogLevel.NONE);

    await client.start({
      async onError(err) {
        console.error(`Произошла ошибка при входе в аккаунт ${bot}`);
        console.log(err);
        return false;
      },
      phoneNumber: bot,
      phoneCode: async () =>
        await input.text(`Введите код из смс для бота ${bot}:`),
    });

    clients.push(client);
    loggedbefore[bot] = client.session.save()!;
  }

  await fs.writeFile(
    path.join(process.cwd(), "logins.temp.json"),
    JSON.stringify(loggedbefore),
    "utf-8"
  );
  console.log(`Вход в ботов завершен. Начинаю препроцессинг пользователей...`);

  console.log(`Собираю имена...`);
  const names = (
    await fs.readFile(path.join(process.cwd(), "names.temp.txt"), "utf-8")
  )
    .split("\n")
    .filter((el) => el);
  if (names.length !== users.length) {
    console.log(
      "Количество имен и пользователей не совпадает. Решаю вопрос..."
    );
    let idx = 1;
    while (names.length < users.length) {
      console.log("Добавляю случайное имя (Формата Фамилия Имя Отчество)");
      names.push(`${idx} Селлер Иванович`);
    }
  }

  let results: {
    phone: string;
    id: string;
    username?: string;
    firstName: string;
    fullName: string;
  }[] = [];

  for (let i = 0; i < users.length; i++) {
    try {
      console.log(`Пользователь ${users[i]}`);

      const client = clients[i % clients.length];
      console.log(`Выбран юзербот`);
      console.log("Добавляю контакт...");
      const [lastName, firstName] = names[i].split(" ");
      const contactResult = await client.invoke(
        new Api.contacts.ImportContacts({
          contacts: [
            new Api.InputPhoneContact({
              clientId: generateRandomBigInt(),
              firstName,
              lastName,
              phone: users[i],
            }),
          ],
        })
      );

      if (contactResult.users.length === 0) throw new Error("User not found");
      const entity = contactResult.users[0] as Api.User;

      console.log("Контакт добавлен. Выясняю имя пользователя...");
      if (!entity.username) {
        console.log("Нету имени пользователя. ");
      } else {
        console.log(`Имя пользователя определно: ${entity.username}`);
      }

      results.push({
        firstName,
        id: entity.id.toJSON(),
        phone: users[i],
        username: entity.username,
        fullName: names[i]
      })
      
    } catch (error) {
      console.log("Парсинг пользователя прекращен.");
    } finally {
      console.log("Ожидаю...");
      await new Promise((resolve, reject) => setTimeout(resolve, 1000));
      console.log("перехожу к следующему пользователю...");
    }
  }

  console.log("Парсинг окончен. Сохраняю результаты...");
  await fs.writeFile(
    path.join(process.cwd(), "results.temp.json"),
    JSON.stringify(results),
    "utf-8"
  );

  console.log("Теперь пользователей можно пробить в вб!")
  return;
})();
