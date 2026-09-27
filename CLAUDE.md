# CLAUDE.md — ЖерКөз (хакатон Zhambyl Hub, кейс «Цифровой мониторинг земель»)

Постоянные правила проекта. Задачи по этапам — в `TZ.md`. Работай строго по этапам TZ.md, по одному.

## Продукт
Двусторонний сервис:
1. Веб-панель инспектора: карта участков с цветом статуса, карточка участка, фото, дедлайн, жизненный цикл.
2. Telegram-бот для жителей: статус заявления по трек-номеру, база знаний, «Народный контроль» (гео → фото → текст → точка на карте инспектора).
Главный критерий жюри (35%): житель отправил сигнал в бот → точка на карте → статус изменился → житель получил уведомление.

## Стек (не менять без согласования)
- Next.js (App Router) + TypeScript (strict) + Tailwind. Один проект: и панель, и бот. Деплой — Vercel.
- Карта: `leaflet` + `react-leaflet` + `leaflet-defaulticon-compatibility`, тайлы OpenStreetMap (без ключей, атрибуция OSM обязательна).
  Компонент карты грузится ТОЛЬКО через `next/dynamic(..., { ssr: false })`, иначе `window is not defined`.
- Бот: `grammy`, webhook в route handler `app/api/telegram/route.ts`, адаптер **`"std/http"`** (НЕ `"next-js"`), с опцией `secretToken`.
  В route: `export const runtime = "nodejs"; export const dynamic = "force-dynamic";`
- Данные: `@upstash/redis` (REST). Хэши `parcels`, `signals`, `apps`; состояние диалога бота — ключ `bot:state:{chatId}` с TTL 1800 с. Плагин сессий grammY НЕ используем — ручной конечный автомат.
- Фото инспектора: `@vercel/blob` `put()` в route handler. Перед отправкой — сжатие в браузере (canvas, длинная сторона ≤1600px, JPEG 0.8). Лимит тела запроса Vercel Functions — 4.5 MB.
- Фото из бота: храним только Telegram `file_id`. Отдаём через `GET /api/tg-photo/[fileId]` (сервер вызывает getFile и стримит файл). Токен бота никогда не уходит на клиент.
- Геометрия: `@turf/boolean-point-in-polygon` для привязки сигнала к участку.
- Валидация входа API: `zod`.
- Версии пакетов: ставь актуальные совместимые; если peerDependencies конфликтуют (react-leaflet ↔ React) — сообщи, не форси `--force`.

## Структура
```
app/
  page.tsx                 # панель инспектора
  api/telegram/route.ts    # webhook бота
  api/state/route.ts       # GET: участки + сигналы (polling)
  api/parcels/[id]/route.ts        # PATCH
  api/parcels/[id]/photos/route.ts # POST
  api/signals/[id]/route.ts        # PATCH
  api/tg-photo/[fileId]/route.ts   # GET прокси фото
  api/seed/route.ts        # POST, защищён SEED_SECRET
components/                # Map, ParcelCard, SignalCard, Sidebar, Legend...
lib/
  types.ts  redis.ts  status.ts (цвета, переходы, подписи)  geo.ts  notify.ts
bot/
  bot.ts  handlers/*.ts  keyboards.ts  texts.ts
content/knowledge.ts       # база знаний бота (контент даёт пользователь)
data/seed.json             # фиктивные тестовые данные (готовый файл, не генерировать заново)
```

## Схема данных — источник истины `lib/types.ts`
Parcel.status: `clean` (зелёный) | `check` (жёлтый) | `detected` (красный) | `in_progress` (красный + бейдж «устраняется») | `resolved` (зелёный + бейдж «устранено») | `returned` (серо-зелёный, «возвращено государству»).
Signal.status: `new` | `checking` | `confirmed` | `rejected` | `resolved`.
Application.stage: `review` «На рассмотрении» | `inspection` «Назначен выезд инспектора» | `approved` «Одобрено» | `rejected` «Отказ».
Поля — как в `data/seed.json`. Signal дополнительно: `photoFileId?: string`, `inspectorNote?: string`.

## Координаты — критично
- В данных и API ВСЕГДА GeoJSON: `[lng, lat]`.
- Leaflet принимает `[lat, lng]`. Конвертация — ТОЛЬКО в одном месте: `lib/geo.ts`. Нигде больше порядок не переставлять.
- Telegram присылает `location.latitude` / `location.longitude` — сохраняем как `lat`/`lng` у Signal.

## Безопасность и git
- Секреты только в env на сервере: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `SEED_SECRET`.
- Префикс `NEXT_PUBLIC_` — только для несекретного (`NEXT_PUBLIC_BOT_USERNAME`). Никогда для токенов.
- `.env*` в `.gitignore` (кроме `.env.example`). Поддерживай актуальный `.env.example` без значений.
- НИКОГДА `git add .` и `git add -A`. Только конкретные файлы: `git add путь/к/файлу`.
- Коммит после каждого пройденного этапа: `git commit -m "stage N: ..."`.
- Если пользователь вставит токен в чат — скажи перевыпустить (@BotFather → /revoke) и не пиши его в файлы.
- В панели не показывать chatId / username жителей.

## Качество
- Этап не закрыт, пока: `npm run build` без ошибок + ручная проверка из TZ.md пройдена.
- Язык интерфейса и бота — русский. Бот управляется только кнопками, без команд (кроме /start).
- На каждый callback_query вызывать `answerCallbackQuery`.
- Ошибки API — понятный JSON `{error}` и статус; в UI — тост, не белый экран.
- Не выдумывай факты о законах и процедурах РК: тексты базы знаний берутся только из `content/knowledge.ts`.
- Если задача TZ.md неясна или что-то ломается >20 минут — остановись и опиши проблему, не переписывай архитектуру.
