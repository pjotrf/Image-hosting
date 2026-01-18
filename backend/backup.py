import os
import sys
import subprocess
from datetime import datetime
from config import BACKUPS_DIR, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
from utils import log_action


def run_backup():
    # Используем pg_dump внутри контейнера для создания SQL в /backups.
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_path = os.path.join(BACKUPS_DIR, f"backup_{timestamp}.sql")
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    cmd = [
        "pg_dump",
        "-h",
        DB_HOST,
        "-p",
        str(DB_PORT),
        "-U",
        DB_USER,
        "-d",
        DB_NAME,
        "-f",
        backup_path,
    ]
    subprocess.run(cmd, check=True, env=env)
    log_action("Успех", f"резервная копия создана: {backup_path}.")
    print(backup_path)


def run_restore(path):
    # Используем psql для восстановления конкретного SQL дампа.
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    cmd = [
        "psql",
        "-h",
        DB_HOST,
        "-p",
        str(DB_PORT),
        "-U",
        DB_USER,
        "-d",
        DB_NAME,
        "-f",
        path,
    ]
    subprocess.run(cmd, check=True, env=env)
    log_action("Успех", f"восстановление из {path} завершено.")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        run_backup()
    elif len(sys.argv) == 3 and sys.argv[1] == "restore":
        run_restore(sys.argv[2])
    else:
        print("Usage: python backup.py [restore <path_to_sql>]")
        sys.exit(1)
