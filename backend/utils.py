import os
from datetime import datetime
from werkzeug.utils import secure_filename
from config import LOGS_DIR

LOG_FILE = os.path.join(LOGS_DIR, "app.log")


def ensure_log_dir():
    os.makedirs(LOGS_DIR, exist_ok=True)


def log_action(status, message):
    """Write log line with required format."""
    ensure_log_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {status}: {message}\n"
    with open(LOG_FILE, "a", encoding="utf-8") as log_file:
        log_file.write(line)


def secure_original_name(filename):
    # Убираем опасные символы, но сохраняем читаемое имя для логов/метаданных.
    cleaned = secure_filename(filename or "")
    return cleaned if cleaned else "unnamed"
