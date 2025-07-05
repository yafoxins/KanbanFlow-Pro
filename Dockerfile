FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Копируем все файлы проекта
COPY . .

# Создаем директорию для загружаемых файлов
RUN mkdir -p uploads

EXPOSE 5000

# По умолчанию запускаем приложение с ботом
CMD ["python", "start_with_bot.py"]