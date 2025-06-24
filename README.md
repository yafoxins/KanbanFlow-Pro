
# 🗂️ Flask Kanban & ToDo Board

**Flask Kanban & ToDo Board** — современный сервис для личной канбан-доски и ToDo‑листа на Python + Flask + PostgreSQL.  
Каждый пользователь получает собственную доску, ToDo‑лист, может менять тему, редактировать профиль и пароль.

---

## 🇷🇺 Быстрый старт

### Установка (Docker Compose)
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask
sudo docker-compose up --build -d
```

Откройте: [http://localhost/](http://localhost/)  
База и таблицы создаются автоматически.

---

### Ручная установка (без Docker)

```bash
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Создать базу Postgres:
```sql
CREATE DATABASE kanban_db;
CREATE USER kanban_user WITH PASSWORD 'kanban_pass';
GRANT ALL PRIVILEGES ON DATABASE kanban_db TO kanban_user;
```

```bash
python app.py
```

---

## 🌟 Возможности

- Kanban + ToDo‑лист (SPA)
- Drag & Drop задач и статусов
- Профиль пользователя + смена пароля
- Темная/светлая тема
- Безопасная авторизация
- Современный адаптивный дизайн

---

## 👤 Профиль

- Редактирование e‑mail, страны, имени
- Смена пароля через модалку
- Быстрый выход

---

## 🗂️ Структура

```
kanban-flask/
├── app.py
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── requirements.txt
├── static/
│   ├── style.css
│   └── home.css
├── templates/
│   ├── home.html
│   ├── kanban.html
│   ├── todo.html
└── README.md
```

---

## 📝 Лицензия

GPL‑3.0  
Автор: Yafoxin ([@yafoxins](https://t.me/yafoxins))


---

# 🇬🇧 Quick Start

### Install (Docker Compose)
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask
sudo docker-compose up --build -d
```

App: [http://localhost/](http://localhost/)

---

### Manual install (no Docker)

```bash
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create Postgres DB:
```sql
CREATE DATABASE kanban_db;
CREATE USER kanban_user WITH PASSWORD 'kanban_pass';
GRANT ALL PRIVILEGES ON DATABASE kanban_db TO kanban_user;
```

```bash
python app.py
```

---

## 🌟 Features

- Kanban + ToDo‑list (SPA)
- Drag & Drop tasks and statuses
- User profile + password change
- Light/Dark theme
- Secure authentication
- Modern, adaptive UI

---

## 👤 User profile

- Edit e-mail, country, name
- Change password via modal
- Quick logout

---

## 🗂️ Structure

```
kanban-flask/
├── app.py
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── requirements.txt
├── static/
│   ├── style.css
│   └── home.css
├── templates/
│   ├── home.html
│   ├── kanban.html
│   ├── todo.html
└── README.md
```

---

## 📝 License

GPL‑3.0  
Author: Yafoxin ([@yafoxins](https://t.me/yafoxins))
