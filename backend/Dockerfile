FROM python:3.11-slim

WORKDIR /workspace/backend

# System deps for psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000","--reload"]
