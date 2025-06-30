<div align="center">

# <span style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: gradient 3s ease infinite; font-size: 2.5em; font-weight: bold;">🚀 KanbanFlow Pro</span>

<style>
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.animated-text {
  animation: fadeInUp 1s ease-out;
}

.pulse-emoji {
  animation: pulse 2s infinite;
  display: inline-block;
}
</style>

**<span class="animated-text">Современная канбан-доска и система управления задачами</span>**

[![Flask](https://img.shields.io/badge/Flask-2.3.3+-blue.svg)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-green.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-GPL--3.0-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-5.3.2-orange.svg)](https://github.com/yafoxins/kanban-flask)

> **<span class="pulse-emoji">🎯</span> Полнофункциональная система управления проектами с канбан-доской, ToDo-листами и командной работой**

---

<!-- Здесь можно вставить GIF/видео демонстрации -->
<!-- ![KanbanFlow Demo](demo.gif) -->

---

[🇷🇺 Русский](#-русский) • [🇬🇧 English](#-english) • [🚀 Быстрый старт](#-быстрый-старт) • [🌟 Возможности](#-возможности) • [📱 Скриншоты](#-скриншоты) • [🛠️ Технологии](#️-технологии)

</div>

---

## 🇷🇺 Русский

### 🎯 О проекте

**KanbanFlow Pro** — это современное веб-приложение для управления задачами и проектами, построенное на Flask и PostgreSQL. Приложение объединяет в себе канбан-доску, ToDo-листы и систему командной работы в едином интуитивном интерфейсе.

### ✨ Ключевые особенности

- 🎨 **Современный UI/UX** — Адаптивный дизайн с поддержкой темной/светлой темы
- 📋 **Канбан-доска** — Drag & Drop интерфейс с настраиваемыми статусами
- ✅ **ToDo-листы** — Персональные задачи с датами и приоритетами
- 👥 **Командная работа** — Создание команд, назначение задач, совместная работа
- 🔐 **Безопасность** — CSRF-защита, хеширование паролей, сессии
- 📱 **Адаптивность** — Полная поддержка мобильных устройств
- ⚡ **Real-time** — WebSocket для мгновенных обновлений
- 🖼️ **Медиа** — Загрузка изображений в задачи и аватаров

### 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (Flask)       │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   WebSocket     │◄─────────────┘
                        │   (Socket.IO)   │
                        └─────────────────┘
```

---

## 🇬🇧 English

### 🎯 About Project

**KanbanFlow Pro** is a modern web application for task and project management, built on Flask and PostgreSQL. The application combines kanban boards, todo lists, and team collaboration in a single intuitive interface.

### ✨ Key Features

- 🎨 **Modern UI/UX** — Responsive design with dark/light theme support
- 📋 **Kanban Board** — Drag & Drop interface with customizable statuses
- ✅ **Todo Lists** — Personal tasks with dates and priorities
- 👥 **Team Collaboration** — Create teams, assign tasks, work together
- 🔐 **Security** — CSRF protection, password hashing, sessions
- 📱 **Responsive** — Full mobile device support
- ⚡ **Real-time** — WebSocket for instant updates
- 🖼️ **Media** — Image uploads in tasks and avatars

---

## 🚀 Быстрый старт

### 🐳 Docker Compose (Рекомендуется)

```bash
# Клонирование репозитория
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Запуск с Docker Compose
docker-compose up --build -d

# Открыть в браузере
open http://localhost
```

### 🛠️ Ручная установка

```bash
# Клонирование и настройка
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Создание виртуального окружения
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

# Установка зависимостей
pip install -r requirements.txt

# Настройка PostgreSQL
sudo -u postgres psql
CREATE DATABASE kanban_db;
CREATE USER kanban_user WITH PASSWORD 'kanban_pass';
GRANT ALL PRIVILEGES ON DATABASE kanban_db TO kanban_user;
\q

# Запуск приложения
python app.py
```

---

## 🌟 Возможности

### 📋 Канбан-доска
- **Drag & Drop** — Перетаскивание задач между статусами
- **Настраиваемые статусы** — Создание и удаление колонок
- **Детальные задачи** — Описания, теги, даты, изображения
- **Редактирование** — Полное управление задачами
- **Поиск и фильтрация** — Быстрый поиск по задачам

### ✅ ToDo-листы
- **Персональные задачи** — Приватные списки дел
- **Даты выполнения** — Планирование по времени
- **Статусы** — Отметка выполненных задач
- **Быстрое добавление** — Мгновенное создание задач

### 👥 Командная работа
- **Создание команд** — Объединение пользователей
- **Назначение задач** — Распределение работы
- **Командные доски** — Общие канбан-доски
- **Роли** — Лидеры команд и участники
- **Real-time обновления** — Мгновенная синхронизация

### 👤 Профиль пользователя
- **Редактирование данных** — Имя, email, страна
- **Смена пароля** — Безопасное обновление
- **Аватары** — Загрузка профильных фото
- **Темы** — Переключение между темной/светлой темой

---

## 📱 Скриншоты

<!-- Здесь можно добавить скриншоты интерфейса -->
<!-- ![Канбан-доска](screenshots/kanban.png) -->
<!-- ![ToDo-лист](screenshots/todo.png) -->
<!-- ![Командная работа](screenshots/team.png) -->

---

## 🛠️ Технологии

### Backend
- **Flask 2.3.3+** — Веб-фреймворк
- **PostgreSQL 16+** — База данных
- **Flask-SocketIO** — WebSocket поддержка
- **Werkzeug** — Утилиты безопасности
- **Eventlet** — Асинхронный сервер

### Frontend
- **HTML5/CSS3** — Современная разметка и стили
- **JavaScript (ES6+)** — Интерактивность
- **Socket.IO** — Real-time обновления
- **Sortable.js** — Drag & Drop функциональность
- **Quill.js** — Rich text редактор

### DevOps
- **Docker** — Контейнеризация
- **Docker Compose** — Оркестрация
- **Nginx** — Обратный прокси
- **PostgreSQL** — Производственная БД

---

## 📁 Структура проекта

```
kanban-flask/
├── 📄 app.py                 # Основное Flask приложение
├── 🐳 docker-compose.yml     # Docker Compose конфигурация
├── 🐳 Dockerfile             # Docker образ
├── 🌐 nginx.conf             # Nginx конфигурация
├── 📋 requirements.txt       # Python зависимости
├── 📁 static/                # Статические файлы
│   ├── 🎨 css/               # Стили
│   ├── ⚡ js/                 # JavaScript
│   ├── 👤 avatars/           # Аватары пользователей
│   ├── 📸 uploads/           # Загруженные изображения
│   └── 🌍 countries.js       # Список стран
├── 📁 templates/             # HTML шаблоны
│   ├── 🏠 home.html          # Главная страница
│   ├── 📋 kanban.html        # Канбан-доска
│   ├── ✅ todo.html          # ToDo-лист
│   ├── 👥 team_board.html    # Командная доска
│   └── ✏️ task_*.html        # Редактирование задач
└── 📖 README.md              # Документация
```

---

## 🔧 API Endpoints

### Аутентификация
- `POST /api/register` — Регистрация
- `POST /api/login` — Вход
- `GET /<username>/logout` — Выход

### Канбан
- `GET /<username>/api/statuses` — Получение статусов
- `POST /<username>/api/statuses` — Создание статуса
- `GET /<username>/api/tasks` — Получение задач
- `POST /<username>/api/tasks` — Создание задачи
- `PATCH /<username>/api/tasks/<id>` — Обновление задачи

### ToDo
- `GET /<username>/api/todos` — Получение ToDo
- `POST /<username>/api/todos` — Создание ToDo
- `PATCH /<username>/api/todos/<id>` — Обновление ToDo

### Команды
- `POST /<username>/api/teams` — Создание команды
- `GET /<username>/api/teams/list` — Список команд
- `POST /<username>/api/teams/<id>/members` — Добавление участника

---

## 🚀 Развертывание

### Production с Docker

```bash
# Клонирование
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Запуск
docker-compose up -d
```

### Production без Docker

```bash
# Установка зависимостей
pip install -r requirements.txt

# Настройка PostgreSQL
sudo -u postgres createdb kanban_db
sudo -u postgres createuser kanban_user

# Настройка Nginx
sudo cp nginx.conf /etc/nginx/sites-available/kanban
sudo ln -s /etc/nginx/sites-available/kanban /etc/nginx/sites-enabled/

# Запуск с Gunicorn
gunicorn -w 4 -k gevent --worker-connections 1000 app:app
```

---

## 🔒 Безопасность

- **CSRF Protection** — Защита от межсайтовых запросов
- **Password Hashing** — Хеширование паролей с bcrypt
- **Session Management** — Управление сессиями
- **Input Validation** — Валидация входных данных
- **SQL Injection Protection** — Защита от SQL-инъекций
- **XSS Protection** — Защита от XSS-атак

---

## 🤝 Вклад в проект

1. **Fork** репозитория
2. Создайте **feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** изменения (`git commit -m 'Add AmazingFeature'`)
4. **Push** в branch (`git push origin feature/AmazingFeature`)
5. Откройте **Pull Request**

---

## 📄 Лицензия

Этот проект распространяется под лицензией **GPL-3.0**. См. файл [LICENSE](LICENSE) для подробностей.

---

## 👨‍💻 Автор

**Yafoxin** — [@yafoxin](https://t.me/yafoxin)

- 🌐 **Website**: [yafoxin.ru](https://yafoxin.ru)
- 💬 **Telegram**: [@yafoxins](https://t.me/yafoxins)

---

<div align="center">

### ⭐ Если проект вам понравился, поставьте звездочку!

[![GitHub stars](https://img.shields.io/github/stars/yafoxins/kanban-flask?style=social)](https://github.com/yafoxins/kanban-flask/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/yafoxins/kanban-flask?style=social)](https://github.com/yafoxins/kanban-flask/network/members)
[![GitHub issues](https://img.shields.io/github/issues/yafoxins/kanban-flask)](https://github.com/yafoxins/kanban-flask/issues)

---

**Made with ❤️ by Yafoxin**

</div>
