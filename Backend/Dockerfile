# Flask backend for Koyeb (or any Docker host)
FROM python:3.12-slim

# system deps for psycopg2 + general build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install python deps first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the backend
COPY . .

# Koyeb provides $PORT; gunicorn binds to it
ENV PORT=8000
EXPOSE 8000

CMD gunicorn run:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
