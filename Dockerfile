FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY app.py .
COPY static ./static
COPY templates ./templates

EXPOSE 5000

CMD ["python", "app.py"]