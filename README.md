
# 🗂️ Flask Kanban Board

**Flask Kanban Board** — это простой и современный веб-сервис для личной канбан-доски на Python + Flask.  
Каждый пользователь получает свою уникальную доску — все данные защищены паролем и хранятся локально на сервере.

---

## 🇷🇺 Быстрый старт (Russian)

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask
```

### 2. Установите Python

Проверьте, что у вас установлен Python 3.8 или выше:

```bash
python3 --version
```
Если Python не установлен, [скачайте его с официального сайта](https://www.python.org/downloads/).

---

### 3. (Рекомендуется) создайте виртуальное окружение

```bash
python3 -m venv venv
source venv/bin/activate      # Linux/Mac
venv\Scripts\activate        # Windows
```

---

### 4. Установите зависимости

```bash
pip install flask werkzeug
```

---

### 5. Запустите приложение

```bash
python app.py
```

Откройте в браузере [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🌟 Возможности

- Уникальная канбан-доска для каждого пользователя
- Безопасная аутентификация, пароли хранятся в виде хэшей
- Светлая и тёмная тема, современный дизайн
- Drag & Drop задач и статусов, всё работает динамически (SPA)
- Не требует баз данных — все данные хранятся в `user_data/`

---

## 📦 Структура проекта

```
kanban-flask/
│
├── app.py              # Основное приложение Flask
├── user_data/          # Здесь хранятся все данные пользователей
├── templates/
│   ├── home.html       # Главная страница
│   └── kanban.html     # Канбан-доска
├── static/
│   ├── style.css       # Общие стили
│   └── home.css        # Стили главной страницы
└── README.md
```

---

## 🛠️ Зависимости

```python
import os
import json
import time
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
```

---

## 📝 Лицензия

GPL-3.0 license

Автор: [Yafoxin](https://t.me/yafoxin)

---

# 🇬🇧 Quick Start (English)

### 1. Clone the repository

```bash
git clone https://github.com/yafoxins/kanban-flask.git
cd kanban-flask
```

### 2. Install Python

Make sure you have Python 3.8+:

```bash
python3 --version
```
If not, [download Python here](https://www.python.org/downloads/).

---

### 3. (Recommended) Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate      # Linux/Mac
venv\Scripts\activate        # Windows
```

---

### 4. Install dependencies

```bash
pip install flask werkzeug
```

---

### 5. Run the application

```bash
python app.py
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## 🌟 Features

- Unique Kanban board per user
- Secure authentication (passwords hashed)
- Light/Dark mode and modern UI
- Drag & Drop for tasks and statuses (fully dynamic, SPA)
- No database required — all data in `user_data/`

---

## 📦 Project Structure

```
kanban-flask/
│
├── app.py              # Main Flask app
├── user_data/          # User data storage
├── templates/
│   ├── home.html       # Home page
│   └── kanban.html     # Kanban board
├── static/
│   ├── style.css       # Main styles
│   └── home.css        # Home page styles
└── README.md
```

---

## 🛠️ Dependencies

```python
import os
import json
import time
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash
```

---

## 📝 License

GPL-3.0 license

Author: [Yafoxin](https://t.me/yafoxin)

---

> Have questions or suggestions? Create an [issue](https://github.com/yafoxins/kanban-flask/issues) or contact the author!
