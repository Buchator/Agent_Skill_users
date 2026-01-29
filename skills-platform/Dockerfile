# Skills Platform - Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código del backend
COPY backend/ .

# Crear directorio para skills (se montará como volumen)
RUN mkdir -p /skills

# Exponer puerto
EXPOSE 8000

# Variables de entorno por defecto
ENV SKILLS_DIRECTORY=/skills
ENV DEBUG=false

# Comando de inicio
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
