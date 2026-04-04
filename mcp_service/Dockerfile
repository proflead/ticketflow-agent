FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/mcp_service:/app/shared

WORKDIR /app
COPY mcp_service/requirements.txt /app/mcp_service/requirements.txt
RUN pip install --no-cache-dir -r /app/mcp_service/requirements.txt
COPY mcp_service /app/mcp_service
COPY shared /app/shared
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--app-dir", "/app/mcp_service"]
