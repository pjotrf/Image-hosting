# Сервер картинок / Хостинг изображений 2.0

## Запуск

```bash
docker compose up --build
```

## Почему так

- Статика изображений отдается Nginx — это быстрее и разгружает Flask.
- Файлы сохраняются с UUID, чтобы избежать конфликтов имен и path traversal.
- Метаданные храним в Postgres для каталога и сортировки.

## Доступ

- Пользовательский вход (Nginx): http://localhost:8080
- Бэкенд для отладки (Flask): http://localhost:8000

## Загрузка через браузер

Откройте http://localhost:8080/upload и выберите файл (.jpg, .png, .gif до 5 МБ).

## Загрузка через curl

```bash
curl -F "file=@./example.jpg" http://localhost:8000/upload
```

или через API:

```bash
curl -F "file=@./example.jpg" http://localhost:8000/api/upload
```

## Просмотр изображения

После загрузки получите ссылку вида:

```
http://localhost:8080/images/<stored_filename>
```

## Каталог изображений

Откройте http://localhost:8080/images/ (страница каталога). Данные подтягиваются из API:

```
GET /api/images?limit=10&offset=0
```

Поддерживается сортировка:

```
GET /api/images?limit=10&offset=0&sort_by=name&sort_dir=asc
```

## UI-фичи

- Preview: наведите на имя файла, чтобы увидеть мини-превью.
- Copy link: кнопка копирует прямую ссылку на изображение.
- Сортировка: кликайте по заголовкам Name, Size, Uploaded для смены порядка.

## Удаление изображения через API

```
DELETE /api/images/<id>
```

## Резервное копирование БД

В контейнере приложения:

```bash
docker compose exec app python backup.py
```

Восстановление:

```bash
docker compose exec app python backup.py restore /backups/backup_YYYY-MM-DD_HH-MM-SS.sql
```

## Логи

Все действия записываются в `backend/logs/app.log` (том `/logs`).

## Дизайн

Текущий киберпанк-дизайн находится в `frontend/`. Оригинальный шаблон сохранен в `old_design/` для быстрого отката.
