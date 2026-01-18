FROM python:3.12-slim AS builder
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY backend/ /app
COPY frontend/ /frontend
EXPOSE 8000
CMD ["python", "app.py"]
