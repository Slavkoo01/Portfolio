"""Development entrypoint.  Usage:  python run.py   (or:  flask --app run run)."""
from __future__ import annotations

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Port 5000 by default; the React dev server (5173) talks to this.
    app.run(host="127.0.0.1", port=5000, debug=True)
