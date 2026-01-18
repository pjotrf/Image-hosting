import os
import time
import uuid
from flask import Flask, jsonify, redirect, request, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge
from config import ALLOWED_EXTENSIONS, IMAGES_DIR, MAX_FILE_SIZE, DB_ENABLED
from utils import log_action, secure_original_name

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
frontend_dir = os.path.abspath(frontend_dir)


def is_allowed_extension(extension):
    return extension.lower() in ALLOWED_EXTENSIONS


def ensure_images_dir():
    os.makedirs(IMAGES_DIR, exist_ok=True)


def wants_json():
    # API всегда возвращает JSON; HTML страницы возвращают обычный ответ.
    if request.path.startswith("/api/"):
        return True
    return "application/json" in request.headers.get("Accept", "")


@app.errorhandler(RequestEntityTooLarge)
def handle_large_file(_error):
    message = "Файл превышает 5 МБ."
    log_action("Ошибка", message)
    if wants_json():
        return jsonify({"success": False, "error": message}), 413
    return message, 413


@app.errorhandler(400)
def handle_bad_request(_error):
    message = "Некорректный запрос."
    log_action("Ошибка", message)
    if wants_json():
        return jsonify({"success": False, "error": message}), 400
    return message, 400


@app.route("/")
def index():
    return send_from_directory(frontend_dir, "index.html")


@app.route("/upload", methods=["GET"])
def upload_page():
    return send_from_directory(frontend_dir, "upload.html")


@app.route("/images", methods=["GET"])
def images_redirect():
    return redirect("/images/")


@app.route("/images/", methods=["GET"])
def images_page():
    return send_from_directory(frontend_dir, "images.html")


@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory(frontend_dir, path)


@app.route("/upload", methods=["POST"])
@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        message = "Файл не найден в запросе."
        log_action("Ошибка", message)
        return (jsonify({"success": False, "error": message}), 400) if wants_json() else (message, 400)

    file = request.files["file"]
    if not file or file.filename == "":
        message = "Имя файла отсутствует."
        log_action("Ошибка", message)
        return (jsonify({"success": False, "error": message}), 400) if wants_json() else (message, 400)

    raw_name = file.filename
    original_name = secure_original_name(raw_name)
    ext = os.path.splitext(raw_name)[1].lower()

    if not is_allowed_extension(ext):
        message = f"Неподдерживаемый формат файла ({original_name})."
        log_action("Ошибка", message)
        return (jsonify({"success": False, "error": message}), 400) if wants_json() else (message, 400)

    # Проверяем размер заранее, не загружая файл целиком в память.
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_FILE_SIZE:
        message = "Файл превышает 5 МБ."
        log_action("Ошибка", message)
        return (jsonify({"success": False, "error": message}), 413) if wants_json() else (message, 413)

    ensure_images_dir()
    # Никогда не используем имя пользователя в пути; генерируем UUID.
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(IMAGES_DIR, stored_name)
    file.save(stored_path)

    db_id = None
    if DB_ENABLED:
        try:
            from database import insert_image
            db_id = insert_image(stored_name, original_name, size, ext.lstrip("."))
        except Exception as exc:
            log_action("Ошибка", f"Сбой записи в БД: {exc}.")

    url = f"/images/{stored_name}"
    log_action("Успех", f"изображение {stored_name} загружено.")

    if wants_json():
        return jsonify({"success": True, "id": db_id, "file_name": stored_name, "url": url})

    return (
        f"<html><body><h2>Файл загружен</h2>"
        f"<p>Идентификатор: {stored_name}</p>"
        f"<p>Ссылка: <a href=\"{url}\">{url}</a></p>"
        f"<p><a href=\"/upload\">Загрузить еще</a></p>"
        f"</body></html>"
    )


@app.route("/api/images", methods=["GET"])
def api_images():
    if not DB_ENABLED:
        message = "База данных не настроена."
        return jsonify({"success": False, "message": message, "items": []}), 200

    try:
        from database import list_images
    except Exception as exc:
        log_action("Ошибка", f"Сбой доступа к БД: {exc}.")
        return jsonify({"success": False, "message": "Ошибка БД.", "items": []}), 500

    def parse_int(value, default):
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    limit = parse_int(request.args.get("limit"), 10)
    offset = parse_int(request.args.get("offset"), 0)
    sort_by = request.args.get("sort_by", "date")
    sort_dir = request.args.get("sort_dir", "desc").lower()
    if sort_by not in {"name", "size", "date"}:
        sort_by = "date"
    if sort_dir not in {"asc", "desc"}:
        sort_dir = "desc"
    limit = max(1, min(100, limit))
    offset = max(0, offset)

    try:
        total, items = list_images(limit, offset, sort_by, sort_dir)
    except Exception as exc:
        log_action("Ошибка", f"Сбой чтения БД: {exc}.")
        return jsonify({"success": False, "message": "Ошибка БД.", "items": []}), 500

    for item in items:
        item["url"] = f"/images/{item['file_name']}"

    return jsonify(
        {
            "success": True,
            "items": items,
            "limit": limit,
            "offset": offset,
            "total": total,
            "sort_by": sort_by,
            "sort_dir": sort_dir,
        }
    )


@app.route("/api/images/<int:image_id>", methods=["DELETE"])
def api_delete_image(image_id):
    if not DB_ENABLED:
        message = "База данных не настроена."
        return jsonify({"success": False, "message": message}), 200

    try:
        from database import delete_image, get_image_by_id
    except Exception as exc:
        log_action("Ошибка", f"Сбой доступа к БД: {exc}.")
        return jsonify({"success": False, "message": "Ошибка БД."}), 500

    try:
        record = get_image_by_id(image_id)
    except Exception as exc:
        log_action("Ошибка", f"Сбой чтения БД: {exc}.")
        return jsonify({"success": False, "message": "Ошибка БД."}), 500

    if not record:
        return jsonify({"success": False, "message": "Файл не найден."}), 404

    file_path = os.path.join(IMAGES_DIR, record["file_name"])
    if os.path.exists(file_path):
        os.remove(file_path)
    else:
        log_action("Предупреждение", f"Файл {record['file_name']} отсутствует на диске.")

    try:
        delete_image(image_id)
    except Exception as exc:
        log_action("Ошибка", f"Сбой удаления из БД: {exc}.")
        return jsonify({"success": False, "message": "Ошибка БД."}), 500

    log_action("Успех", f"изображение {record['file_name']} удалено.")
    return jsonify({"success": True})


if __name__ == "__main__":
    if DB_ENABLED:
        for attempt in range(5):
            try:
                from database import init_db
                init_db()
                log_action("Успех", "База данных инициализирована.")
                break
            except Exception as exc:
                log_action("Ошибка", f"Не удалось инициализировать БД: {exc}.")
                time.sleep(2)
    app.run(host="0.0.0.0", port=8000)
