import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Пути переопределяются в Docker через volumes.
IMAGES_DIR = os.environ.get("IMAGES_DIR", "/images")
LOGS_DIR = os.environ.get("LOGS_DIR", "/logs")
BACKUPS_DIR = os.environ.get("BACKUPS_DIR", "/backups")

# Жесткие лимиты из спецификации.
ALLOWED_EXTENSIONS = {".jpg", ".png", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024

# БД опциональна; по умолчанию включена для расширений 2.0.
DB_ENABLED = os.environ.get("DB_ENABLED", "1") == "1"
DB_HOST = os.environ.get("DB_HOST", "postgres")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "image_hosting")
DB_USER = os.environ.get("DB_USER", "image_user")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "image_pass")
