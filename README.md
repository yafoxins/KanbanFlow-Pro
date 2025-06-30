<div align="center">

# 🚀 KanbanFlow Pro

**Современная канбан-доска и система управления задачами**  
**A modern Kanban board and task management system**

[![Flask](https://img.shields.io/badge/Flask-2.3.3+-blue.svg)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-green.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-GPL--3.0-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-5.3.2-orange.svg)](https://github.com/yafoxins/kanban-flask)

<!-- Главный скриншот -->
<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/main.png" alt="Главная страница / Main page" width="800"/>
  <br>
  <i>Главная страница / Main page</i>
</p>

</div>

> **🎯 Полнофункциональная система управления проектами с канбан-доской, ToDo-листами и командной работой**  
> **🎯 Full-featured project management system with Kanban board, ToDo lists, and team collaboration**

---

<table align="center">
  <tr>
    <td align="center"><a href="#-русский">🇷🇺<br>Русский</a></td>
    <td align="center"><a href="#-english">🇬🇧<br>English</a></td>
    <td align="center"><a href="#-быстрый-старт">🚀<br>Быстрый старт</a></td>
    <td align="center"><a href="#-возможности">🌟<br>Возможности</a></td>
    <td align="center"><a href="#-скриншоты--screenshots">📱<br>Скриншоты</a></td>
    <td align="center"><a href="#️-технологии--technologies">🛠️<br>Технологии</a></td>
  </tr>
</table>

---

<div align="center">

## 🌐 Живые демо / Live Demo

<table>
  <tr>
    <td align="center" width="50%">
      <b>🇷🇺 Работающее демо</b><br>
      <a href="https://kanban.yafoxin.ru">
        <img src="https://img.shields.io/badge/kanban.yafoxin.ru-1976d2?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="RU Demo">
      </a>
    </td>
    <td align="center" width="50%">
      <b>🇺🇸 Live Demo</b><br>
      <a href="https://kanban.yafoxin.tech">
        <img src="https://img.shields.io/badge/kanban.yafoxin.tech-0057b7?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="EN Demo">
      </a>
    </td>
  </tr>
</table>

**🎮 Попробуйте прямо сейчас!**  
Создайте аккаунт и испытайте все возможности системы.

</div>

---

<!-- Здесь можно вставить GIF/видео демонстрации -->
<!-- ![KanbanFlow Demo](demo.gif) -->

---

## 🇷🇺 Русский

### 🎯 О проекте

**KanbanFlow Pro** — это современное веб-приложение для управления задачами и проектами, построенное на Flask и PostgreSQL. Приложение объединяет в себе канбан-доску, ToDo-листы и систему командной работы в едином интуитивном интерфейсе.

**🌐 Работающее демо:** [kanban.yafoxin.ru](https://kanban.yafoxin.ru)

### 🏗️ Архитектура / Architecture

```mermaid
flowchart LR
    FE[Frontend<br/>HTML/CSS/JS]
    BE[Backend<br/>Flask]
    DB[Database<br/>PostgreSQL]
    WS[WebSocket<br/>Socket.IO]
    
    FE <--> BE
    BE <--> DB
    FE <--> WS
    BE <--> WS
```

**🇷🇺 Архитектура проекта** — Вся система построена по принципу клиент-сервер с поддержкой real-time через WebSocket.  
**🇬🇧 Project architecture** — The whole system is built on a client-server principle with real-time support via WebSocket.

### ✨ Ключевые особенности

<table>
  <tr><td>🎨 Современный UI/UX</td><td>Адаптивный дизайн с поддержкой темной/светлой темы</td></tr>
  <tr><td>📋 Канбан-доска</td><td>Drag & Drop интерфейс с настраиваемыми статусами</td></tr>
  <tr><td>✅ ToDo-листы</td><td>Персональные задачи с датами и приоритетами</td></tr>
  <tr><td>👥 Командная работа</td><td>Создание команд, назначение задач, совместная работа</td></tr>
  <tr><td>🔐 Безопасность</td><td>CSRF-защита, хеширование паролей, сессии</td></tr>
  <tr><td>📱 Адаптивность</td><td>Полная поддержка мобильных устройств</td></tr>
  <tr><td>⚡ Real-time</td><td>WebSocket для мгновенных обновлений</td></tr>
  <tr><td>🖼️ Медиа</td><td>Загрузка изображений в задачи и аватаров</td></tr>
</table>

### 🚀 Быстрый старт

#### 🐳 Docker Compose (Рекомендуется)

```bash
# Клонирование репозитория
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Запуск с Docker Compose
docker-compose up --build -d

# Открыть в браузере
open http://localhost
```

#### 🛠️ Ручная установка

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

### 🌟 Возможности

<table>
  <tr>
    <td>📋 <b>Канбан-доска</b></td>
    <td>
      Drag & Drop — Перетаскивание задач между статусами<br>
      Настраиваемые статусы — Создание и удаление колонок<br>
      Детальные задачи — Описания, теги, даты, изображения<br>
      Редактирование — Полное управление задачами<br>
      Поиск и фильтрация — Быстрый поиск по задачам
    </td>
  </tr>
  <tr>
    <td>✅ <b>ToDo-листы</b></td>
    <td>
      Персональные задачи — Приватные списки дел<br>
      Даты выполнения — Планирование по времени<br>
      Статусы — Отметка выполненных задач<br>
      Быстрое добавление — Мгновенное создание задач
    </td>
  </tr>
  <tr>
    <td>👥 <b>Командная работа</b></td>
    <td>
      Создание команд — Объединение пользователей<br>
      Назначение задач — Распределение работы<br>
      Командные доски — Общие канбан-доски<br>
      Роли — Лидеры команд и участники<br>
      Real-time обновления — Мгновенная синхронизация
    </td>
  </tr>
  <tr>
    <td>👤 <b>Профиль пользователя</b></td>
    <td>
      Редактирование данных — Имя, email, страна<br>
      Смена пароля — Безопасное обновление<br>
      Аватары — Загрузка профильных фото<br>
      Темы — Переключение между темной/светлой темой
    </td>
  </tr>
</table>

---

## 🇬🇧 English

### 🎯 About Project

**KanbanFlow Pro** is a modern web application for task and project management, built on Flask and PostgreSQL. The application combines kanban boards, todo lists, and team collaboration in a single intuitive interface.

**🌐 Demo for Americans:** [kanban.yafoxin.tech](https://kanban.yafoxin.tech)

### ✨ Key Features

<table>
  <tr><td>🎨 Modern UI/UX</td><td>Responsive design with dark/light theme support</td></tr>
  <tr><td>📋 Kanban Board</td><td>Drag & Drop interface with customizable statuses</td></tr>
  <tr><td>✅ Todo Lists</td><td>Personal tasks with dates and priorities</td></tr>
  <tr><td>👥 Team Collaboration</td><td>Create teams, assign tasks, work together</td></tr>
  <tr><td>🔐 Security</td><td>CSRF protection, password hashing, sessions</td></tr>
  <tr><td>📱 Responsive</td><td>Full mobile device support</td></tr>
  <tr><td>⚡ Real-time</td><td>WebSocket for instant updates</td></tr>
  <tr><td>🖼️ Media</td><td>Image uploads in tasks and avatars</td></tr>
</table>

### 🚀 Quick Start

#### 🐳 Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Run with Docker Compose
docker-compose up --build -d

# Open in browser
open http://localhost
```

#### 🛠️ Manual Installation

```bash
# Clone and setup
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Setup PostgreSQL
sudo -u postgres psql
CREATE DATABASE kanban_db;
CREATE USER kanban_user WITH PASSWORD 'kanban_pass';
GRANT ALL PRIVILEGES ON DATABASE kanban_db TO kanban_user;
\q

# Run application
python app.py
```

### 🌟 Features

<table>
  <tr>
    <td>📋 <b>Kanban Board</b></td>
    <td>
      Drag & Drop — Drag tasks between statuses<br>
      Customizable Statuses — Create and delete columns<br>
      Detailed Tasks — Descriptions, tags, dates, images<br>
      Editing — Full task management<br>
      Search & Filter — Quick task search
    </td>
  </tr>
  <tr>
    <td>✅ <b>Todo Lists</b></td>
    <td>
      Personal Tasks — Private to-do lists<br>
      Due Dates — Time planning<br>
      Statuses — Mark completed tasks<br>
      Quick Add — Instant task creation
    </td>
  </tr>
  <tr>
    <td>👥 <b>Team Collaboration</b></td>
    <td>
      Create Teams — Unite users<br>
      Assign Tasks — Distribute work<br>
      Team Boards — Shared kanban boards<br>
      Roles — Team leaders and members<br>
      Real-time Updates — Instant synchronization
    </td>
  </tr>
  <tr>
    <td>👤 <b>User Profile</b></td>
    <td>
      Edit Data — Name, email, country<br>
      Change Password — Secure update<br>
      Avatars — Upload profile photos<br>
      Themes — Switch between dark/light theme
    </td>
  </tr>
</table>

---

## 📱 Скриншоты / Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/board.png" alt="Канбан-доска / Kanban board" width="800"/>
  <br>
  <i>Канбан-доска / Kanban board</i>
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/todo.png" alt="ToDo-лист / ToDo list" width="800"/>
  <br>
  <i>ToDo-лист / ToDo list</i>
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/task.png" alt="Создание задачи / New task" width="500"/>
  <br>
  <i>Создание задачи / New task</i>
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/taskview.png" alt="Просмотр задачи / Task view" width="600"/>
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/taskfullview.png" alt="Полный просмотр задачи / Full task view" width="600"/>
  <br>
  <i>Просмотр задачи / Task view</i>
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/teamboard.png" alt="Командная доска / Team board" width="800"/>
  <br>
  <i>Командная доска / Team board</i>
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/profile.png" alt="Профиль пользователя / User profile" width="400"/>
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/about.png" alt="О проекте / About project" width="400"/>
  <img src="https://raw.githubusercontent.com/yafoxins/kanban-flask/media/screenshots/password.png" alt="Смена пароля / Change password" width="400"/>
  <br>
  <i>Профиль, О проекте, Смена пароля / Profile, About, Change password</i>
</p>

---

## 🛠️ Технологии / Technologies

### Backend
- **Flask 2.3.3+** — Веб-фреймворк / Web framework
- **PostgreSQL 16+** — База данных / Database
- **Flask-SocketIO** — WebSocket поддержка / WebSocket support
- **Werkzeug** — Утилиты безопасности / Security utilities
- **Eventlet** — Асинхронный сервер / Async server

### Frontend
- **HTML5/CSS3** — Современная разметка и стили / Modern markup and styles
- **JavaScript (ES6+)** — Интерактивность / Interactivity
- **Socket.IO** — Real-time обновления / Real-time updates
- **Sortable.js** — Drag & Drop функциональность / Drag & Drop functionality
- **Quill.js** — Rich text редактор / Rich text editor

### DevOps
- **Docker** — Контейнеризация / Containerization
- **Docker Compose** — Оркестрация / Orchestration
- **Nginx** — Обратный прокси / Reverse proxy
- **PostgreSQL** — Производственная БД / Production DB

---

## 📁 Структура проекта / Project Structure

```
kanban-flask/
├── 📄 app.py                 # Основное Flask приложение / Main Flask app
├── 🐳 docker-compose.yml     # Docker Compose конфигурация / Docker Compose config
├── 🐳 Dockerfile             # Docker образ / Docker image
├── 🌐 nginx.conf             # Nginx конфигурация / Nginx config
├── 📋 requirements.txt       # Python зависимости / Python dependencies
├── 📁 static/                # Статические файлы / Static files
│   ├── 🎨 css/               # Стили / Styles
│   ├── ⚡ js/                 # JavaScript
│   ├── 👤 avatars/           # Аватары пользователей / User avatars
│   ├── 📸 uploads/           # Загруженные изображения / Uploaded images
│   └── 🌍 countries.js       # Список стран / Countries list
├── 📁 templates/             # HTML шаблоны / HTML templates
│   ├── 🏠 home.html          # Главная страница / Home page
│   ├── 📋 kanban.html        # Канбан-доска / Kanban board
│   ├── ✅ todo.html          # ToDo-лист / Todo list
│   ├── 👥 team_board.html    # Командная доска / Team board
│   └── ✏️ task_*.html        # Редактирование задач / Task editing
└── 📖 README.md              # Документация / Documentation
```

---

## 🔧 API Endpoints

### Аутентификация / Authentication
- `POST /api/register` — Регистрация / Registration
- `POST /api/login` — Вход / Login
- `GET /<username>/logout` — Выход / Logout

### Канбан / Kanban
- `GET /<username>/api/statuses` — Получение статусов / Get statuses
- `POST /<username>/api/statuses` — Создание статуса / Create status
- `GET /<username>/api/tasks` — Получение задач / Get tasks
- `POST /<username>/api/tasks` — Создание задачи / Create task
- `PATCH /<username>/api/tasks/<id>` — Обновление задачи / Update task

### ToDo
- `GET /<username>/api/todos` — Получение ToDo / Get todos
- `POST /<username>/api/todos` — Создание ToDo / Create todo
- `PATCH /<username>/api/todos/<id>` — Обновление ToDo / Update todo

### Команды / Teams
- `POST /<username>/api/teams` — Создание команды / Create team
- `GET /<username>/api/teams/list` — Список команд / List teams
- `POST /<username>/api/teams/<id>/members` — Добавление участника / Add member

---

## 🚀 Развертывание / Deployment

### Production с Docker / Production with Docker

```bash
# Клонирование / Clone
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask

# Запуск / Run
docker-compose up -d
```

### Production без Docker / Production without Docker

```bash
# Установка зависимостей / Install dependencies
pip install -r requirements.txt

# Настройка PostgreSQL / Setup PostgreSQL
sudo -u postgres createdb kanban_db
sudo -u postgres createuser kanban_user

# Настройка Nginx / Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/kanban
sudo ln -s /etc/nginx/sites-available/kanban /etc/nginx/sites-enabled/

# Запуск с Gunicorn / Run with Gunicorn
gunicorn -w 4 -k gevent --worker-connections 1000 app:app
```

---

## 🔒 Безопасность / Security

- **CSRF Protection** — Защита от межсайтовых запросов / Cross-site request forgery protection
- **Password Hashing** — Хеширование паролей с bcrypt / Password hashing with bcrypt
- **Session Management** — Управление сессиями / Session management
- **Input Validation** — Валидация входных данных / Input validation
- **SQL Injection Protection** — Защита от SQL-инъекций / SQL injection protection
- **XSS Protection** — Защита от XSS-атак / XSS attack protection

---

## 🤝 Вклад в проект / Contributing

1. **Fork** репозитория / Fork the repository
2. Создайте **feature branch** (`git checkout -b feature/AmazingFeature`) / Create feature branch
3. **Commit** изменения (`git commit -m 'Add AmazingFeature'`) / Commit changes
4. **Push** в branch (`git push origin feature/AmazingFeature`) / Push to branch
5. Откройте **Pull Request** / Open Pull Request

---

## 📄 Лицензия / License

Этот проект распространяется под лицензией **GPL-3.0**. См. файл [LICENSE](LICENSE) для подробностей.

This project is licensed under **GPL-3.0**. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Автор / Author

**Yafoxin** — [@yafoxin](https://t.me/yafoxin)

- 🌐 **Website**: [yafoxin.ru](https://yafoxin.ru)
- 💬 **Telegram**: [@yafoxins](https://t.me/yafoxins)

---

<div align="center">

### ⭐ Если проект вам понравился, поставьте звездочку! / If you like the project, give it a star!

Если проект тебе по душе — ставь ⭐, делай форк 🍴, делись с друзьями и присоединяйся к развитию!  
If you like the project — star ⭐ it, fork 🍴 it, share with friends and join the development!

[![GitHub stars](https://img.shields.io/github/stars/yafoxins/kanban-flask?style=social)](https://github.com/yafoxins/kanban-flask/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/yafoxins/kanban-flask?style=social)](https://github.com/yafoxins/kanban-flask/network/members)
[![GitHub issues](https://img.shields.io/github/issues/yafoxins/kanban-flask)](https://github.com/yafoxins/kanban-flask/issues)

---

**Made with ❤️ by Yafoxin**

</div>

## 🙏 Благодарности / Thanks

Спасибо всем, кто поддерживал, тестировал и вдохновлял на новые фичи.  
Thank you to everyone who supported, tested, and inspired new features.