### API Документация
## Боты

# Получение списка ботов
GET /api/bots

# Получение одного бота
GET /api/bots/:phone

# Добавление бота 
1) POST /api/auth/bot
2) POST /api/auth/code

## Группы (партии)

# Создание группы ботов
POST /api/groups

# Получение группы ботов
GET /api/groups/:id

# Получение всех групп
GET /api/groups/

## Рассылки

# начать рассылку
POST /api/mailings

# остановить рассылку
PUT /api/mailings/:id/stop

## Экспорты 

# за рассылку
GET /api/exports/mailings/:id

# за аккаунт
GET /api/exports/bots/:id

# за партию
GET /api/exports/group/:id

# диалог с конткретным юзером
GET /api/exports/users/:id

