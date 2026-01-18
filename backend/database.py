import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def get_conn():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def init_db():
    # Минимальная схема по спецификации; id serial, file_name уникален.
    create_sql = """
    CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL UNIQUE,
        original_name TEXT NOT NULL,
        size INTEGER NOT NULL,
        upload_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        file_type TEXT NOT NULL
    );
    """
    with get_conn() as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(create_sql)


def insert_image(file_name, original_name, size, file_type):
    # Параметризованный SQL для защиты от инъекций.
    sql = """
    INSERT INTO images (file_name, original_name, size, file_type)
    VALUES (%s, %s, %s, %s)
    RETURNING id;
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (file_name, original_name, size, file_type))
            return cur.fetchone()[0]


def list_images(limit, offset, sort_by, sort_dir):
    order_map = {
        "name": "original_name",
        "size": "size",
        "date": "upload_time",
    }
    sort_column = order_map.get(sort_by, "upload_time")
    sort_direction = "ASC" if sort_dir == "asc" else "DESC"
    items_sql = f"""
    SELECT id, file_name, original_name, size, upload_time, file_type
    FROM images
    ORDER BY {sort_column} {sort_direction}
    LIMIT %s OFFSET %s;
    """
    count_sql = "SELECT COUNT(*) FROM images;"
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(count_sql)
            total = cur.fetchone()["count"]
            cur.execute(items_sql, (limit, offset))
            items = cur.fetchall()
            return total, items


def get_image_by_id(image_id):
    sql = """
    SELECT id, file_name, original_name, size, upload_time, file_type
    FROM images
    WHERE id = %s;
    """
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (image_id,))
            return cur.fetchone()


def delete_image(image_id):
    sql = "DELETE FROM images WHERE id = %s;"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (image_id,))
