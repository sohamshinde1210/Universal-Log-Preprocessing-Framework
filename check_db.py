
import sqlite3
from pathlib import Path

db_path = Path("data/ulpf.db").resolve()

print("Database path:", db_path)
print("Database exists:", db_path.exists())

connection = sqlite3.connect(str(db_path))

tables = connection.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()

print("\nTables:")
for table in tables:
    print(table[0])

try:
    rows = connection.execute(
        """
        SELECT id, original_filename, sha256_hash, status
        FROM ingested_files
        ORDER BY id DESC
        LIMIT 10
        """
    ).fetchall()

    print("\nRecent ingested files:")
    for row in rows:
        print(row)

except sqlite3.Error as error:
    print("Database query error:", error)

finally:
    connection.close()
