import os
import time
import psycopg2
import re
import secrets
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
import json
import datetime


app = Flask(__name__)
app.secret_key = 'cGQRPuvxkCqTerOmIDGmNXxXhjynGl'
SESSION_LIFETIME = 1800  # 30 минут
socketio = SocketIO(app, cors_allowed_origins="*")

DATABASE_URL = os.getenv(
    'DATABASE_URL', 'postgres://kanban_user:kanban_pass@localhost:5432/kanban_db')

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db():
    return psycopg2.connect(DATABASE_URL)


def cleanup_invalid_dates():
    """Очищает некорректные даты в базе данных"""
    conn = get_db()
    cur = conn.cursor()
    try:
        # Очищаем все подозрительные даты в таблице tasks
        cur.execute('''
            UPDATE tasks 
            SET due_date = NULL 
            WHERE due_date IS NOT NULL 
            AND (
                due_date < '1900-01-01' OR 
                due_date > '2100-12-31' OR
                EXTRACT(YEAR FROM due_date) > 2100 OR
                EXTRACT(YEAR FROM due_date) < 1900
            )
        ''')
        
        # Очищаем все подозрительные даты в таблице team_tasks
        cur.execute('''
            UPDATE team_tasks 
            SET due_date = NULL 
            WHERE due_date IS NOT NULL 
            AND (
                due_date < '1900-01-01' OR 
                due_date > '2100-12-31' OR
                EXTRACT(YEAR FROM due_date) > 2100 OR
                EXTRACT(YEAR FROM due_date) < 1900
            )
        ''')
        
        conn.commit()
        print("Некорректные даты очищены")
    except Exception as e:
        conn.rollback()
        print(f"Ошибка очистки дат: {e}")
    finally:
        cur.close()
        conn.close()


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        country TEXT NOT NULL,
        fullname TEXT,
        avatar_url TEXT
    );
    CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    date DATE,
    done BOOLEAN DEFAULT FALSE
   );
    CREATE TABLE IF NOT EXISTS statuses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        title TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        tags TEXT[],
        due_date DATE,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP
    );
     CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        leader_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS team_members (
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (team_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS team_statuses (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        code VARCHAR(32) NOT NULL,
        title VARCHAR(64) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS team_tasks (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        description TEXT,
        status VARCHAR(32) NOT NULL,
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        tags TEXT[],
        due_date DATE,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_at TIMESTAMP
    );
    """)
    conn.commit()
    cur.close()
    conn.close()


def is_authenticated(username):
    user = session.get('user')
    ts = session.get('login_time')
    if user == username and ts and (time.time() - ts) < SESSION_LIFETIME:
        session['login_time'] = time.time()
        return True
    session.pop('user', None)
    session.pop('login_time', None)
    return False


def generate_csrf_token():
    """Генерирует уникальный CSRF-токен"""
    return secrets.token_urlsafe(32)

def validate_csrf_token(username, token):
    """Проверяет CSRF-токен для пользователя"""
    if not token:
        return False
    stored_token = session.get(f'csrf_token_{username}')
    return stored_token and secrets.compare_digest(stored_token, token)

def require_csrf_token(f):
    """Декоратор для проверки CSRF-токена"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        username = kwargs.get('username')
        if not username:
            return jsonify({'error': 'Неверный запрос.'}), 400
        
        if not is_authenticated(username):
            return jsonify({'error': 'Требуется авторизация.'}), 401
        
        # Получаем токен из заголовка
        csrf_token = request.headers.get('X-CSRF-Token')
        if not validate_csrf_token(username, csrf_token):
            return jsonify({'error': 'Неверный CSRF-токен. Обновите страницу.'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
def home():
    return render_template('home.html')


@app.route('/<path:invalid_path>')
def catch_all(invalid_path):
    """Перехватывает все несуществующие маршруты и показывает красивую страницу ошибки 404"""
    return render_template('error.html', code=404, message="Страница не найдена"), 404


@app.route('/api/check_user/<username>')
def api_check_user(username):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT id FROM users WHERE username=%s', (username,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({'exists': bool(row), 'id': row[0] if row else None})
    except Exception as e:
        # Логируем ошибку для отладки
        print(f"Error in api_check_user: {e}")
        return jsonify({'exists': False, 'id': None, 'error': 'Database error'}), 500


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных для регистрации.'}), 400
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    country = data.get('country', '').strip()
    fullname = data.get('fullname', '').strip()

    # Валидация
    if (len(username) < 2 or len(password) < 3 or not email or '@' not in email or not country):
        return jsonify({'error': 'Проверьте корректность всех полей.'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('INSERT INTO users (username, password, email, country, fullname) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                    (username, generate_password_hash(password), email, country, fullname))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Пользователь не найден.'}), 400
        user_id = row[0]
        statuses = [("todo", "Запланировано"),
                    ("progress", "В работе"), ("done", "Готово")]
        for code, title in statuses:
            cur.execute(
                'INSERT INTO statuses (user_id, code, title) VALUES (%s, %s, %s)', (user_id, code, title))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь с таким именем уже существует.'}), 409
    cur.close()
    conn.close()
    session['user'] = username
    session['login_time'] = time.time()
    # Генерируем CSRF-токен при регистрации
    session[f'csrf_token_{username}'] = generate_csrf_token()
    return jsonify({'success': True})


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username, password = data.get(
        'username', '').strip(), data.get('password', '').strip()
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT password FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row and check_password_hash(row[0], password):
        session['user'] = username
        session['login_time'] = time.time()
        # Генерируем CSRF-токен при входе
        session[f'csrf_token_{username}'] = generate_csrf_token()
        return jsonify({'success': True})
    return jsonify({'error': 'Неверный логин или пароль.'}), 403


@app.route('/<username>/logout')
def logout(username):
    session.pop('user', None)
    session.pop('login_time', None)
    session.pop(f'csrf_token_{username}', None)
    return redirect(url_for('home'))


@app.route('/<username>/kanban')
def kanban(username):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('kanban.html', username=username, active_page="kanban", csrf_token=csrf_token)


def create_default_statuses(username):
    """Создаёт статусы по умолчанию для пользователя, если их нет"""
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()

        # Проверяем, есть ли уже статусы у пользователя
        cur.execute(
            'SELECT COUNT(*) FROM statuses WHERE user_id=(SELECT id FROM users WHERE username=%s)', (username,))
        count_row = cur.fetchone()
        count = count_row[0] if count_row else 0

        if count == 0:
            # Получаем user_id
            cur.execute('SELECT id FROM users WHERE username=%s', (username,))
            user_row = cur.fetchone()
            if user_row:
                user_id = user_row[0]
                # Создаём статусы по умолчанию
                statuses = [("todo", "Запланировано"),
                            ("progress", "В работе"), ("done", "Готово")]
                for code, title in statuses:
                    cur.execute(
                        'INSERT INTO statuses (user_id, code, title) VALUES (%s, %s, %s)', (user_id, code, title))
                conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        # Не прерываем выполнение, просто логируем ошибку
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/statuses', methods=['GET'])
def api_get_statuses(username):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401

    # Создаём статусы по умолчанию, если их нет
    create_default_statuses(username)

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT code, title FROM statuses WHERE user_id=(SELECT id FROM users WHERE username=%s)', (username,))
        statuses = [{'code': row[0], 'title': row[1]}
                    for row in cur.fetchall()]
        return jsonify(statuses)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка базы данных.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def to_iso(val):
    # Если это строка — возвращаем как есть, если datetime/date — isoformat, иначе None
    if val is None:
        return None
    try:
        if hasattr(val, 'isoformat'):
            return val.isoformat()
        return str(val)
    except (ValueError, OverflowError):
        # Если дата некорректная (например, год 232323), возвращаем None
        return None


@app.route('/<username>/api/tasks', methods=['GET'])
def api_get_tasks(username):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT t.id, t.text, t.description, t.status, t.tags, t.due_date, t.updated_by, t.updated_at, u.username as updated_by_name '
            'FROM tasks t LEFT JOIN users u ON t.updated_by = u.id '
            'WHERE t.user_id=(SELECT id FROM users WHERE username=%s)', (username,))
        tasks = []
        for row in cur.fetchall():
            tasks.append({
                'id': row[0],
                'text': row[1],
                'description': row[2],
                'status': row[3],
                'tags': row[4] or [],
                'due_date': to_iso(validate_date(row[5])),
                'updated_by': row[6],
                'updated_by_name': row[8],
                'updated_at': to_iso(validate_date(row[7]))
            })
        return jsonify(tasks)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка базы данных.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/tasks', methods=['POST'])
@require_csrf_token
def api_add_task(username):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    conn = get_db()
    cur = conn.cursor()
    # Получаем user_id
    cur.execute('SELECT id, username FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не найден.'}), 400
    user_id = user_row[0]
    user_name = user_row[1]
    tags = data.get('tags', [])
    due_date = validate_date(data.get('due_date'))
    updated_at = validate_date(time.strftime('%Y-%m-%dT%H:%M:%S'))
    cur.execute('INSERT INTO tasks (user_id, text, description, status, tags, due_date, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
                (user_id, data['text'], data.get('description', ''), data['status'], tags, due_date, user_id, updated_at))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Задача не найдена.'}), 404
    task_id = row[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'id': task_id, 'updated_by': user_id, 'updated_by_name': user_name, 'updated_at': updated_at})


@app.route('/<username>/api/tasks/<int:task_id>', methods=['PATCH', 'DELETE'])
@require_csrf_token
def api_modify_task(username, task_id):
    app.logger.info(f"API_MODIFY_TASK: {username}, {task_id}, {request.method}")
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'DELETE':
        app.logger.info(f"=== УДАЛЕНИЕ ЗАДАЧИ {task_id} ===")
        # Получаем описание задачи перед удалением для очистки картинок
        cur.execute('SELECT description FROM tasks WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (task_id, username))
        task_row = cur.fetchone()
        app.logger.info(f"Описание задачи: {task_row[0] if task_row else 'None'}")
        if task_row:
            app.logger.info("Вызываем delete_task_images")
            # Удаляем картинки из описания задачи
            delete_task_images(task_row[0])
        else:
            app.logger.info("Задача не найдена в базе данных")
        
        cur.execute('DELETE FROM tasks WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (task_id, username))
        app.logger.info(f"Результат удаления: {cur.rowcount} строк")
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return jsonify({'error': 'Задача не найдена.'}), 404
        conn.commit()
        cur.close()
        conn.close()
        app.logger.info("=== ЗАДАЧА УДАЛЕНА ===")
        return jsonify({'success': True})
    else:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных.'}), 400
        # Получаем user_id
        cur.execute('SELECT id, username FROM users WHERE username=%s', (username,))
        user_row = cur.fetchone()
        if not user_row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Пользователь не найден.'}), 400
        user_id = user_row[0]
        user_name = user_row[1]
        
        # Получаем старое описание для очистки неиспользуемых картинок
        cur.execute('SELECT description FROM tasks WHERE id=%s AND user_id=%s', (task_id, user_id))
        old_task = cur.fetchone()
        old_description = old_task[0] if old_task else ''
        
        updated_at = validate_date(time.strftime('%Y-%m-%dT%H:%M:%S'))
        new_description = data.get('description', '')
        
        cur.execute('UPDATE tasks SET text=%s, description=%s, status=%s, tags=%s, due_date=%s, updated_by=%s, updated_at=%s WHERE id=%s AND user_id=%s RETURNING id',
                    (data['text'], new_description, data['status'], data.get('tags', []), validate_date(data.get('due_date')), user_id, updated_at, task_id, user_id))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Задача не найдена.'}), 404
        
        # Очищаем неиспользуемые картинки
        cleanup_unused_images(old_description, new_description)
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'id': task_id, 'updated_by': user_id, 'updated_by_name': user_name, 'updated_at': updated_at})


@app.route('/<username>/api/tasks/order', methods=['POST'])
@require_csrf_token
def api_reorder_tasks(username):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    
    data = request.get_json()
    if not data or 'orders' not in data:
        return jsonify({'error': 'Нет данных о порядке задач.'}), 400
    
    orders = data['orders']
    conn = get_db()
    cur = conn.cursor()
    
    try:
        # Обрабатываем каждую колонку (статус)
        for status, task_ids in orders.items():
            if not isinstance(task_ids, list):
                continue
            
            # Обновляем статус для каждой задачи в этой колонке
            for task_id in task_ids:
                if not isinstance(task_id, int):
                    continue
                    
                cur.execute('''
                    UPDATE tasks 
                    SET status = %s 
                    WHERE id = %s AND user_id = (SELECT id FROM users WHERE username = %s)
                ''', (status, task_id, username))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
        
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({'error': f'Ошибка обновления порядка: {str(e)}'}), 500


@app.route('/<username>/api/statuses', methods=['POST'])
@require_csrf_token
def api_add_status(username):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    code = data.get('code') or ('s' + str(int(time.time())))
    title = data.get('title', '').strip()
    if not title or len(title) < 2:
        return jsonify({'error': 'Название статуса должно быть не короче 2 символов.'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO statuses (user_id, code, title) VALUES ((SELECT id FROM users WHERE username=%s), %s, %s)', (username, code, title))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'code': code, 'title': title})


@app.route('/<username>/api/statuses/<code>', methods=['DELETE'])
@require_csrf_token
def api_delete_status(username, code):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = get_db()
    cur = conn.cursor()
    # Проверяем, что это не последний статус
    cur.execute('SELECT COUNT(*) FROM statuses WHERE user_id=(SELECT id FROM users WHERE username=%s)', (username,))
    count = cur.fetchone()[0]
    if count <= 1:
        cur.close()
        conn.close()
        return jsonify({'error': 'Нельзя удалить последний статус.'}), 400
    cur.execute('DELETE FROM statuses WHERE code=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (code, username))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/profile/<username>')
def api_profile(username):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'SELECT username, email, country, fullname, avatar_url FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'Профиль не найден.'}), 404
    
    # Добавляем timestamp к avatar_url для предотвращения кеширования
    avatar_url = row[4]
    if avatar_url and '?' not in avatar_url:  # Если timestamp еще не добавлен
        timestamp = int(time.time())
        avatar_url = f"{avatar_url}?t={timestamp}"
    
    return jsonify({
        'username': row[0],
        'email': row[1],
        'country': row[2],
        'fullname': row[3],
        'avatar_url': avatar_url
    })


@app.route('/<username>/api/change_password', methods=['POST'])
@require_csrf_token
def api_change_password(username):
    data = request.get_json()
    old_password = data.get('old_password', '').strip()
    new_password = data.get('new_password', '').strip()
    if len(new_password) < 3:
        return jsonify({'error': 'Пароль слишком короткий (минимум 3 символа).'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT password FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row or not check_password_hash(row[0], old_password):
        cur.close()
        conn.close()
        return jsonify({'error': 'Старый пароль неверен!'}), 400
    cur.execute('UPDATE users SET password=%s WHERE username=%s',
                (generate_password_hash(new_password), username))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/todo')
def todo(username):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('todo.html', username=username, active_page="todo", csrf_token=csrf_token)


@app.route('/<username>/api/todos', methods=['GET', 'POST'])
def api_todos(username):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'GET':
        cur.execute(
            'SELECT id, text, date, done FROM todos WHERE user_id=(SELECT id FROM users WHERE username=%s) ORDER BY (NOT done), date NULLS LAST, id DESC', (username,))
        todos = [
            {'id': row[0], 'text': row[1], 'date': row[2].isoformat(
            ) if row[2] else None, 'done': row[3]}
            for row in cur.fetchall()
        ]
        cur.close()
        conn.close()
        return jsonify(todos)
    else:
        # Для POST запросов добавляем CSRF-защиту
        csrf_token = request.headers.get('X-CSRF-Token')
        if not validate_csrf_token(username, csrf_token):
            return jsonify({'error': 'Неверный CSRF-токен. Обновите страницу.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных.'}), 400
        text = data.get('text', '').strip()
        date_val = data.get('date', None)
        if not text:
            return jsonify({'error': 'Пустой текст задачи.'}), 400
        # Логируем user_id
        cur.execute('SELECT id FROM users WHERE username=%s', (username,))
        user_row = cur.fetchone()
        if not user_row:
            return jsonify({'error': 'Пользователь не найден.'}), 400
        user_id = user_row[0]
        cur.execute('INSERT INTO todos (user_id, text, date) VALUES (%s, %s, %s) RETURNING id, date',
                    (user_id, text, date_val))
        row = cur.fetchone()
        conn.commit()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Ошибка создания задачи.'}), 500
        return jsonify({'id': row[0], 'text': text, 'date': row[1].isoformat() if row[1] else None, 'done': False})


@app.route('/<username>/api/todos/<int:todo_id>', methods=['PATCH', 'DELETE'])
@require_csrf_token
def api_todo_modify(username, todo_id):
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'DELETE':
        cur.execute('DELETE FROM todos WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (todo_id, username))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    else:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных.'}), 400
        
        # Получаем текущие данные задачи
        cur.execute('SELECT text, done, date FROM todos WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (todo_id, username))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Задача не найдена.'}), 404
        
        current_text, current_done, current_date = row
        
        # Обновляем только переданные поля
        text = data.get('text', current_text)
        done = data.get('done', current_done)
        date_val = data.get('date', current_date)
        
        # Проверяем, что текст не пустой (если он передаётся)
        if 'text' in data and not text.strip():
            return jsonify({'error': 'Пустой текст задачи.'}), 400
        
        cur.execute('UPDATE todos SET text=%s, done=%s, date=%s WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s) RETURNING id, text, date, done',
                    (text, done, date_val, todo_id, username))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Задача не найдена.'}), 404
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            'id': row[0], 
            'text': row[1], 
            'date': row[2].isoformat() if row[2] else None, 
            'done': row[3]
        })


@app.route('/<username>/team')
def team_page(username):
    user = session.get('user')
    if not user or not is_authenticated(user):
        return redirect(url_for('home'))
    if user != username:
        return redirect(url_for('team_page', username=user, team_id=request.args.get('team_id')))
    team_id = request.args.get('team_id')
    team_name = None
    avatar_url = None
    if team_id:
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute('''
                SELECT t.name FROM teams t
                JOIN team_members tm ON tm.team_id = t.id
                JOIN users u ON u.id = tm.user_id
                WHERE t.id=%s AND u.username=%s
            ''', (team_id, username))
            row = cur.fetchone()
            if row:
                team_name = row[0]
            # Получаем avatar_url пользователя
            cur.execute('SELECT avatar_url FROM users WHERE username=%s', (username,))
            avatar_row = cur.fetchone()
            if avatar_row:
                avatar_url = avatar_row[0]
                # Добавляем timestamp для предотвращения кеширования
                if avatar_url and '?' not in avatar_url:
                    timestamp = int(time.time())
                    avatar_url = f"{avatar_url}?t={timestamp}"
            cur.close()
            conn.close()
            if not team_name:
                return redirect(url_for('home'))
        except Exception as e:
            return redirect(url_for('home'))
    else:
        return redirect(url_for('home'))
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('team_board.html', username=username, team_name=team_name, csrf_token=csrf_token, user_avatar_url=avatar_url)


@app.route('/<username>/api/teams', methods=['POST'])
@require_csrf_token
def create_team(username):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    team_name = data.get('name', '').strip()
    if not team_name or len(team_name) < 2:
        return jsonify({'error': 'Название команды должно быть не короче 2 символов.'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не найден.'}), 400
    user_id = user_row[0]
    # Проверка уникальности имени команды глобально (без учёта регистра)
    cur.execute('SELECT id FROM teams WHERE LOWER(name) = LOWER(%s)', (team_name,))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда с таким названием уже существует.'}), 409
    cur.execute('INSERT INTO teams (name, leader_id) VALUES (%s, %s) RETURNING id', (team_name, user_id))
    team_id = cur.fetchone()[0]
    cur.execute('INSERT INTO team_members (team_id, user_id) VALUES (%s, %s)', (team_id, user_id))
    
    # Создаём стандартные статусы для команды
    default_statuses = [
        ("todo", "Запланировано"),
        ("progress", "В работе"), 
        ("done", "Готово")
    ]
    for code, title in default_statuses:
        cur.execute('INSERT INTO team_statuses (team_id, code, title) VALUES (%s, %s, %s)', (team_id, code, title))
    
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'team_id': team_id, 'name': team_name})


@app.route('/<username>/api/teams/<int:team_id>/members', methods=['POST'])
@require_csrf_token
def add_team_member(username, team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    member_username = data.get('username', '').strip()
    if not member_username:
        return jsonify({'error': 'Не указано имя пользователя.'}), 400
    
    # Проверяем, нужно ли удалить участника
    remove_member = data.get('remove', False)
    
    conn = get_db()
    cur = conn.cursor()
    # Проверяем, что текущий пользователь - лидер команды
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда не найдена.'}), 404
    leader_id = row[0]
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row or user_row[0] != leader_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Недостаточно прав.'}), 403
    
    # Находим ID участника
    cur.execute('SELECT id FROM users WHERE username=%s', (member_username,))
    member_row = cur.fetchone()
    if not member_row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не найден.'}), 404
    member_id = member_row[0]
    
    if remove_member:
        # Удаляем участника
        cur.execute('DELETE FROM team_members WHERE team_id=%s AND user_id=%s', (team_id, member_id))
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return jsonify({'error': 'Пользователь не найден в команде.'}), 404
        
        # Снимаем все задачи с удаляемого участника
        cur.execute('UPDATE team_tasks SET assignee_id = NULL WHERE team_id = %s AND assignee_id = %s', (team_id, member_id))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    else:
        # Добавляем участника
        try:
            cur.execute('INSERT INTO team_members (team_id, user_id) VALUES (%s, %s)', (team_id, member_id))
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({'error': 'Пользователь уже в команде.'}), 409


@app.route('/<username>/api/teams/<int:team_id>/members', methods=['GET'])
def get_team_members(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            SELECT u.id, u.username, u.avatar_url FROM team_members tm
            JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = %s
        ''', (team_id,))
        
        # Добавляем timestamp к avatar_url для предотвращения кеширования
        members = []
        for row in cur.fetchall():
            avatar_url = row[2]
            if avatar_url and '?' not in avatar_url:  # Если timestamp еще не добавлен
                timestamp = int(time.time())
                avatar_url = f"{avatar_url}?t={timestamp}"
            
            members.append({
                'id': row[0], 
                'username': row[1], 
                'avatar_url': avatar_url
            })
        
        return jsonify({'members': members})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка базы данных.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/teams/<int:team_id>/statuses', methods=['GET'])
def get_team_statuses(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT code, title FROM team_statuses WHERE team_id=%s', (team_id,))
        statuses = [{'code': row[0], 'title': row[1]}
                    for row in cur.fetchall()]
        return jsonify(statuses)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка базы данных.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/teams/<int:team_id>/tasks', methods=['GET', 'POST'])
def team_tasks(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'GET':
        cur.execute(
            'SELECT tt.id, tt.text, tt.description, tt.status, tt.tags, tt.due_date, tt.assignee_id, tt.updated_by, tt.updated_at, u.username as updated_by_name, u2.username as assignee_name '
            'FROM team_tasks tt LEFT JOIN users u ON tt.updated_by = u.id LEFT JOIN users u2 ON tt.assignee_id = u2.id '
            'WHERE tt.team_id=%s AND tt.team_id IN (SELECT team_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE u.username=%s)', (team_id, username))
        tasks = []
        for row in cur.fetchall():
            tasks.append({
                'id': row[0],
                'text': row[1],
                'description': row[2],
                'status': row[3],
                'tags': row[4] or [],
                'due_date': to_iso(validate_date(row[5])),
                'assignee_id': row[6],
                'assignee_name': row[10],
                'updated_by': row[7],
                'updated_by_name': row[9],
                'updated_at': to_iso(validate_date(row[8]))
            })
        cur.close()
        conn.close()
        return jsonify(tasks)
    else:
        # Для POST запросов добавляем CSRF-защиту
        csrf_token = request.headers.get('X-CSRF-Token')
        if not validate_csrf_token(username, csrf_token):
            return jsonify({'error': 'Неверный CSRF-токен. Обновите страницу.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных.'}), 400
        # Получаем user_id
        cur.execute('SELECT id, username FROM users WHERE username=%s', (username,))
        user_row = cur.fetchone()
        if not user_row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Пользователь не найден.'}), 400
        user_id = user_row[0]
        user_name = user_row[1]
        tags = data.get('tags', [])
        due_date = validate_date(data.get('due_date'))
        
        # Обрабатываем assignee_id - если передан username, находим его ID
        assignee_id = data.get('assignee_id')
        if assignee_id is not None and not str(assignee_id).isdigit():
            # Если assignee_id не число, значит это username - находим его ID
            cur.execute('SELECT id FROM users WHERE username=%s', (assignee_id,))
            assignee_row = cur.fetchone()
            if assignee_row:
                assignee_id = assignee_row[0]
            else:
                assignee_id = None
        elif assignee_id is not None:
            try:
                assignee_id = int(assignee_id)
            except Exception:
                assignee_id = None
        
        updated_at = validate_date(time.strftime('%Y-%m-%dT%H:%M:%S'))
        new_description = data.get('description', '')
        
        # Вставляем новую задачу
        cur.execute('INSERT INTO team_tasks (team_id, text, description, status, tags, due_date, assignee_id, updated_by, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
                    (team_id, data['text'], new_description, data['status'], tags, due_date, assignee_id, user_id, updated_at))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Ошибка создания задачи.'}), 500
        task_id = row[0]
        
        # Получаем полные данные новой задачи для WebSocket
        cur.execute('''
            SELECT tt.id, tt.text, tt.description, tt.status, tt.tags, tt.due_date, tt.assignee_id, tt.updated_by, tt.updated_at, 
                   u.username as updated_by_name, u2.username as assignee_name
            FROM team_tasks tt 
            LEFT JOIN users u ON tt.updated_by = u.id 
            LEFT JOIN users u2 ON tt.assignee_id = u2.id 
            WHERE tt.id = %s
        ''', (task_id,))
        task_row = cur.fetchone()
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Отправляем уведомление через WebSocket
        if socketio and task_row:
            task_data = {
                'id': task_row[0],
                'text': task_row[1],
                'description': task_row[2],
                'status': task_row[3],
                'tags': task_row[4] or [],
                'due_date': to_iso(validate_date(task_row[5])),
                'assignee_id': task_row[6],
                'assignee_name': task_row[10],
                'updated_by': task_row[7],
                'updated_by_name': task_row[9],
                'updated_at': to_iso(validate_date(task_row[8]))
            }
            socketio.emit('team_task_added', task_data, room=f'team_{team_id}')
        
        return jsonify({'success': True, 'id': task_id, 'updated_by': user_id, 'updated_by_name': user_name, 'updated_at': updated_at})


@app.route('/<username>/api/teams/<int:team_id>/tasks/<int:task_id>', methods=['PATCH', 'DELETE'])
@require_csrf_token
def team_task_modify(username, team_id, task_id):
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'DELETE':
        app.logger.info(f"=== УДАЛЕНИЕ ЗАДАЧИ {task_id} ===")
        # Получаем описание задачи перед удалением для очистки картинок
        cur.execute('SELECT description FROM team_tasks WHERE id=%s AND team_id=%s AND team_id IN (SELECT team_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE u.username=%s)', (task_id, team_id, username))
        task_row = cur.fetchone()
        app.logger.info(f"Описание задачи: {task_row[0] if task_row else 'None'}")
        if task_row:
            app.logger.info("Вызываем delete_task_images")
            # Удаляем картинки из описания задачи
            delete_task_images(task_row[0])
        else:
            app.logger.info("Задача не найдена в базе данных")
        
        cur.execute('DELETE FROM team_tasks WHERE id=%s AND team_id=%s AND team_id IN (SELECT team_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE u.username=%s)', (task_id, team_id, username))
        app.logger.info(f"Результат удаления: {cur.rowcount} строк")
        if cur.rowcount == 0:
            cur.close()
            conn.close()
            return jsonify({'error': 'Задача не найдена.'}), 404
        conn.commit()
        cur.close()
        conn.close()
        app.logger.info("=== ЗАДАЧА УДАЛЕНА ===")
        return jsonify({'success': True})
    else:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Нет данных.'}), 400
        # Получаем user_id
        cur.execute('SELECT id, username FROM users WHERE username=%s', (username,))
        user_row = cur.fetchone()
        if not user_row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Пользователь не найден.'}), 400
        user_id = user_row[0]
        user_name = user_row[1]
        
        # Получаем старое описание для очистки неиспользуемых картинок
        cur.execute('SELECT description FROM team_tasks WHERE id=%s AND team_id=%s AND team_id IN (SELECT team_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE u.username=%s)', (task_id, team_id, username))
        old_task = cur.fetchone()
        old_description = old_task[0] if old_task else ''
        
        updated_at = validate_date(time.strftime('%Y-%m-%dT%H:%M:%S'))
        new_description = data.get('description', '')
        
        cur.execute('UPDATE team_tasks SET text=%s, description=%s, status=%s, tags=%s, due_date=%s, assignee_id=%s, updated_by=%s, updated_at=%s WHERE id=%s AND team_id=%s AND team_id IN (SELECT team_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE u.username=%s) RETURNING id',
                    (data['text'], new_description, data['status'], data.get('tags', []), validate_date(data.get('due_date')), data.get('assignee_id'), user_id, updated_at, task_id, team_id, username))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'Задача не найдена.'}), 404
        
        # Очищаем неиспользуемые картинки
        cleanup_unused_images(old_description, new_description)
        
        # Получаем полные данные обновленной задачи для WebSocket
        try:
            cur.execute('''
                SELECT tt.id, tt.text, tt.description, tt.status, tt.tags, tt.due_date, tt.assignee_id, tt.updated_by, tt.updated_at, 
                       u.username as updated_by_name, u2.username as assignee_name
                FROM team_tasks tt 
                LEFT JOIN users u ON tt.updated_by = u.id 
                LEFT JOIN users u2 ON tt.assignee_id = u2.id 
                WHERE tt.id = %s
            ''', (task_id,))
            task_row = cur.fetchone()
        except Exception as e:
            # Если есть проблема с датами, очищаем некорректные даты и пробуем снова
            cleanup_invalid_dates()
            cur.execute('''
                SELECT tt.id, tt.text, tt.description, tt.status, tt.tags, tt.due_date, tt.assignee_id, tt.updated_by, tt.updated_at, 
                       u.username as updated_by_name, u2.username as assignee_name
                FROM team_tasks tt 
                LEFT JOIN users u ON tt.updated_by = u.id 
                LEFT JOIN users u2 ON tt.assignee_id = u2.id 
                WHERE tt.id = %s
            ''', (task_id,))
            task_row = cur.fetchone()
        
        conn.commit()
        cur.close()
        conn.close()
        
        # Отправляем уведомление через WebSocket
        if socketio and task_row:
            task_data = {
                'id': task_row[0],
                'text': task_row[1],
                'description': task_row[2],
                'status': task_row[3],
                'tags': task_row[4] or [],
                'due_date': to_iso(validate_date(task_row[5])),
                'assignee_id': task_row[6],
                'assignee_name': task_row[10],
                'updated_by': task_row[7],
                'updated_by_name': task_row[9],
                'updated_at': to_iso(validate_date(task_row[8]))
            }
            socketio.emit('team_task_updated', task_data, room=f'team_{team_id}')
        
        return jsonify({'success': True, 'id': task_id, 'updated_by': user_id, 'updated_by_name': user_name, 'updated_at': updated_at})


@app.route('/<username>/api/teams/<int:team_id>/tasks/order', methods=['POST'])
@require_csrf_token
def team_tasks_order(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    
    data = request.get_json()
    if not data or 'orders' not in data:
        return jsonify({'error': 'Нет данных о порядке задач.'}), 400
    
    orders = data['orders']
    conn = get_db()
    cur = conn.cursor()
    
    try:
        # Обрабатываем каждую колонку (статус)
        for status, task_ids in orders.items():
            if not isinstance(task_ids, list):
                continue
            
            # Обновляем статус для каждой задачи в этой колонке
            for task_id in task_ids:
                if not isinstance(task_id, int):
                    continue
                
                cur.execute('''
                    UPDATE team_tasks 
                    SET status = %s 
                    WHERE id = %s AND team_id = %s 
                    AND team_id IN (
                        SELECT team_id 
                        FROM team_members tm 
                        JOIN users u ON tm.user_id = u.id 
                        WHERE u.username = %s
                    )
                ''', (status, task_id, team_id, username))
        
        conn.commit()
        
        # Отправляем уведомление через WebSocket
        if socketio:
            socketio.emit('team_tasks_reordered', {
                'team_id': team_id,
                'orders': orders
            }, room=f'team_{team_id}')
        
        return jsonify({'success': True})
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка обновления порядка задач.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/teams/list', methods=['GET'])
def api_list_teams(username):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT t.id, t.name, t.leader_id, u.username as leader_name
        FROM teams t
        JOIN users u ON t.leader_id = u.id
        JOIN team_members tm ON tm.team_id = t.id
        JOIN users me ON me.username = %s AND tm.user_id = me.id
        ORDER BY t.id
    ''', (username,))
    teams = [
        {'id': row[0], 'name': row[1], 'leader_id': row[2], 'leader_name': row[3]} for row in cur.fetchall()
    ]
    cur.close()
    conn.close()
    return jsonify({'teams': teams})


@app.route('/<username>/api/teams/<int:team_id>/info', methods=['GET'])
def api_team_info(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не найден.'}), 404
    user_id = row[0]
    cur.execute('SELECT id, name, leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда не найдена.'}), 404
    is_leader = (row[2] == user_id)
    leader_id = row[2]
    # Получаем username лидера
    cur.execute('SELECT username FROM users WHERE id=%s', (leader_id,))
    leader_name_row = cur.fetchone()
    leader_name = leader_name_row[0] if leader_name_row else None
    cur.execute(
        '''SELECT u.username FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = %s''', (team_id,))
    members = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify({'id': row[0], 'name': row[1], 'leader_id': leader_id, 'leader_name': leader_name, 'is_leader': is_leader, 'members': members})


@app.route('/<username>/api/teams/<int:team_id>/edit', methods=['POST'])
@require_csrf_token
def api_edit_team(username, team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    team_name = data.get('name', '').strip()
    if not team_name or len(team_name) < 2:
        return jsonify({'error': 'Название команды должно быть не короче 2 символов.'}), 400
    conn = get_db()
    cur = conn.cursor()
    # Проверяем, что текущий пользователь - лидер команды
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда не найдена.'}), 404
    leader_id = row[0]
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row or user_row[0] != leader_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Недостаточно прав.'}), 403
    
    # Проверка уникальности имени команды глобально (без учёта регистра), исключая текущую команду
    cur.execute('SELECT id FROM teams WHERE LOWER(name) = LOWER(%s) AND id != %s', (team_name, team_id))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда с таким названием уже существует.'}), 409
    
    cur.execute('UPDATE teams SET name=%s WHERE id=%s', (team_name, team_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/delete', methods=['POST'])
@require_csrf_token
def api_delete_team(username, team_id):
    conn = get_db()
    cur = conn.cursor()
    # Проверяем, что текущий пользователь - лидер команды
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда не найдена.'}), 404
    leader_id = row[0]
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row or user_row[0] != leader_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Недостаточно прав.'}), 403
    # Удаляем команду и все связанные данные
    # Сначала получаем все описания задач для очистки картинок
    cur.execute('SELECT description FROM team_tasks WHERE team_id=%s', (team_id,))
    task_descriptions = cur.fetchall()
    
    # Удаляем картинки из всех задач команды
    for task_desc in task_descriptions:
        if task_desc[0]:  # Если описание не пустое
            delete_task_images(task_desc[0])
    
    cur.execute('DELETE FROM team_tasks WHERE team_id=%s', (team_id,))
    cur.execute('DELETE FROM team_members WHERE team_id=%s', (team_id,))
    cur.execute('DELETE FROM team_statuses WHERE team_id=%s', (team_id,))
    cur.execute('DELETE FROM teams WHERE id=%s', (team_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/set_leader', methods=['POST'])
@require_csrf_token
def api_set_team_leader(username, team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    new_leader_username = data.get('username', '').strip()
    if not new_leader_username:
        return jsonify({'error': 'Не указано имя пользователя.'}), 400
    conn = get_db()
    cur = conn.cursor()
    # Проверяем, что текущий пользователь - лидер команды
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда не найдена.'}), 404
    leader_id = row[0]
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row or user_row[0] != leader_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Недостаточно прав.'}), 403
    # Находим нового лидера
    cur.execute('SELECT id FROM users WHERE username=%s', (new_leader_username,))
    new_leader_row = cur.fetchone()
    if not new_leader_row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не найден.'}), 404
    new_leader_id = new_leader_row[0]
    # Проверяем, что новый лидер в команде
    cur.execute('SELECT team_id FROM team_members WHERE team_id=%s AND user_id=%s', (team_id, new_leader_id))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не в команде.'}), 400
    # Передаём права
    cur.execute('UPDATE teams SET leader_id=%s WHERE id=%s', (new_leader_id, team_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/leave', methods=['POST'])
@require_csrf_token
def leave_team(username, team_id):
    conn = get_db()
    cur = conn.cursor()
    # Получаем id пользователя и id лидера
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user_row = cur.fetchone()
    if not user_row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Пользователь не найден.'}), 404
    user_id = user_row[0]
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Команда не найдена.'}), 404
    leader_id = row[0]
    # Нельзя покинуть команду, если ты лидер
    if user_id == leader_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'Лидер не может покинуть команду. Передайте права другому участнику.'}), 400
    
    # Снимаем все задачи с участника, который покидает команду
    cur.execute('UPDATE team_tasks SET assignee_id = NULL WHERE team_id = %s AND assignee_id = %s', (team_id, user_id))
    
    # Удаляем из команды
    cur.execute('DELETE FROM team_members WHERE team_id=%s AND user_id=%s', (team_id, user_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/statuses', methods=['POST'])
@require_csrf_token
def add_team_status(username, team_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    code = data.get('code') or ('s' + str(int(time.time())))
    title = data.get('title', '').strip()
    if not title or len(title) < 2:
        return jsonify({'error': 'Название статуса должно быть не короче 2 символов.'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO team_statuses (team_id, code, title) VALUES (%s, %s, %s)', (team_id, code, title))
    conn.commit()
    cur.close()
    conn.close()
    
    # Отправляем уведомление через WebSocket
    if socketio:
        socketio.emit('team_status_added', {
            'team_id': team_id,
            'code': code,
            'title': title
        }, room=f'team_{team_id}')
    
    return jsonify({'code': code, 'title': title})


@app.route('/<username>/api/teams/<int:team_id>/statuses/<code>', methods=['DELETE'])
@require_csrf_token
def delete_team_status(username, team_id, code):
    conn = get_db()
    cur = conn.cursor()
    # Проверяем, что это не последний статус
    cur.execute('SELECT COUNT(*) FROM team_statuses WHERE team_id=%s', (team_id,))
    count = cur.fetchone()[0]
    if count <= 1:
        cur.close()
        conn.close()
        return jsonify({'error': 'Нельзя удалить последний статус.'}), 400
    cur.execute('DELETE FROM team_statuses WHERE code=%s AND team_id=%s', (code, team_id))
    conn.commit()
    cur.close()
    conn.close()
    
    # Отправляем уведомление через WebSocket
    if socketio:
        socketio.emit('team_status_deleted', {
            'team_id': team_id,
            'code': code
        }, room=f'team_{team_id}')
    
    return jsonify({'success': True})


@socketio.on('join_team')
def on_join_team(data):
    team_id = data.get('team_id')
    join_room(f'team_{team_id}')


@socketio.on('leave_team')
def on_leave_team(data):
    team_id = data.get('team_id')
    leave_room(f'team_{team_id}')


@app.route('/api/check_user_id/<int:user_id>')
def api_check_user_id(user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT username FROM users WHERE id=%s', (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'Пользователь не найден.'}), 404
    return jsonify({'username': row[0]})


@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'Нет файла изображения.'}), 400
    file = request.files['image']
    if not file or not file.filename:
        return jsonify({'error': 'Не выбрано изображение.'}), 400
    if allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Используем app.root_path для правильного пути к файлу
        filepath = os.path.join(app.root_path, UPLOAD_FOLDER, filename)
        # Избегаем перезаписи файлов
        i = 1
        orig_filename = filename
        while os.path.exists(filepath):
            name, ext = os.path.splitext(orig_filename)
            filename = f"{name}_{i}{ext}"
            filepath = os.path.join(app.root_path, UPLOAD_FOLDER, filename)
            i += 1
        file.save(filepath)
        url = f"/static/uploads/{filename}"
        return jsonify({'url': url})
    return jsonify({'error': 'Неверный тип файла.'}), 400


def extract_image_paths(description):
    """Извлекает пути к изображениям из HTML описания"""
    if not description:
        return []
    
    import re
    # Ищем все img теги с src атрибутами
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'
    matches = re.findall(img_pattern, description)
    
    # Фильтруем только локальные изображения
    local_images = [match for match in matches if match.startswith('/static/')]
    return local_images


def cleanup_unused_images(old_description, new_description):
    """Удаляет картинки, которые были в старом описании, но исчезли в новом"""
    old_images = set(extract_image_paths(old_description))
    new_images = set(extract_image_paths(new_description))

    # Файлы, которые нужно удалить
    files_to_delete = old_images - new_images

    for image_path in files_to_delete:
        # Убираем /static/ из пути для получения относительного пути
        if image_path.startswith('/static/'):
            file_path = image_path[8:]  # Убираем '/static/' (8 символов)
            # Используем app.root_path для правильного пути к файлу
            full_path = os.path.join(app.root_path, 'static', file_path)

            try:
                if os.path.exists(full_path):
                    os.remove(full_path)
                    print(f"🗑️ Удален неиспользуемый файл: {full_path}")
                else:
                    print(f"⚠️ Файл не найден для удаления: {full_path}")
            except Exception as e:
                print(f"❌ Ошибка удаления файла {full_path}: {e}")


def delete_task_images(description):
    """Удаляет все картинки из описания задачи при её удалении"""
    app.logger.info("=== УДАЛЕНИЕ КАРТИНОК ===")
    app.logger.info("description: %s", repr(description))
    if not description:
        app.logger.info("Нет description")
        return

    image_paths = extract_image_paths(description)
    app.logger.info("🔍 Найдено %d изображений для удаления: %s", len(image_paths), image_paths)
    
    for image_path in image_paths:
        app.logger.info("Обрабатываем путь: %s", image_path)
        if image_path.startswith('/static/'):
            file_path = image_path[8:]  # Убираем '/static/' (8 символов)
            # Используем app.root_path для правильного пути к файлу
            app.logger.info("DEBUG: app.root_path = %s", app.root_path)
            app.logger.info("DEBUG: file_path = %s", file_path)
            full_path = os.path.join(app.root_path, 'static', file_path)
            app.logger.info("Полный путь к файлу: %s", full_path)
            app.logger.info("Файл существует: %s", os.path.exists(full_path))

            try:
                if os.path.exists(full_path):
                    os.remove(full_path)
                    app.logger.info("🗑️ Удален файл задачи: %s", full_path)
                else:
                    app.logger.info("⚠️ Файл задачи не найден: %s", full_path)
            except Exception as e:
                app.logger.error("❌ Ошибка удаления файла задачи %s: %s", full_path, e)
        else:
            app.logger.info("⚠️ Путь не начинается с /static/: %s", image_path)


@app.route('/<username>/task/<int:task_id>')
def task_view_page(username, task_id):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('task_view.html', username=username, task_id=task_id, csrf_token=csrf_token)


@app.route('/<username>/team_task/<int:task_id>')
def team_task_view_page(username, task_id):
    user = session.get('user')
    if not user or not is_authenticated(user):
        return redirect(url_for('home'))
    if user != username:
        return redirect(url_for('team_task_view_page', username=user, task_id=task_id))
    # Найти team_id по задаче
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT team_id FROM team_tasks WHERE id=%s', (task_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    team_id = row[0] if row else None
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('team_task_view.html', username=username, task_id=task_id, team_id=team_id, csrf_token=csrf_token)


@app.route('/<username>/team_task/<int:task_id>/edit')
def team_task_edit_page(username, task_id):
    user = session.get('user')
    if not user or not is_authenticated(user):
        return redirect(url_for('home'))
    if user != username:
        return redirect(url_for('team_task_edit_page', username=user, task_id=task_id))
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('team_task_edit.html', username=username, task_id=task_id, csrf_token=csrf_token)


@app.route('/<username>/task/<int:task_id>/edit')
def task_edit_page(username, task_id):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    csrf_token = session.get(f'csrf_token_{username}')
    return render_template('task_edit.html', username=username, task_id=task_id, csrf_token=csrf_token)


@app.route('/<username>/api/tasks/<int:task_id>/data', methods=['GET'])
def api_get_task_data(username, task_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT t.id, t.text, t.description, t.status, t.tags, t.due_date, t.updated_by, t.updated_at, u.username as updated_by_name '
            'FROM tasks t LEFT JOIN users u ON t.updated_by = u.id '
            'WHERE t.id=%s AND t.user_id=(SELECT id FROM users WHERE username=%s)', (task_id, username))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Задача не найдена.'}), 404
        task = {
            'id': row[0],
            'text': row[1],
            'description': row[2],
            'status': row[3],
            'tags': row[4] or [],
            'due_date': to_iso(validate_date(row[5])),
            'updated_by': row[6],
            'updated_by_name': row[8],
            'updated_at': to_iso(validate_date(row[7]))
        }
        return jsonify(task)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка базы данных.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/teams/<int:team_id>/tasks/<int:task_id>/data', methods=['GET'])
def api_get_team_task_data(username, team_id, task_id):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'SELECT tt.id, tt.text, tt.description, tt.status, tt.tags, tt.due_date, tt.assignee_id, tt.updated_by, tt.updated_at, u.username as updated_by_name, u2.username as assignee_name '
            'FROM team_tasks tt LEFT JOIN users u ON tt.updated_by = u.id LEFT JOIN users u2 ON tt.assignee_id = u2.id '
            'WHERE tt.id=%s AND tt.team_id=%s AND tt.team_id IN (SELECT team_id FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE u.username=%s)', 
            (task_id, team_id, username))
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Задача не найдена.'}), 404
        task = {
            'id': row[0],
            'text': row[1],
            'description': row[2],
            'status': row[3],
            'tags': row[4] or [],
            'due_date': to_iso(validate_date(row[5])),
            'assignee_id': row[6],
            'assignee_name': row[10],
            'updated_by': row[7],
            'updated_by_name': row[9],
            'updated_at': to_iso(validate_date(row[8]))
        }
        return jsonify(task)
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка базы данных.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/upload_avatar', methods=['POST'])
@require_csrf_token
def upload_avatar(username):
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    if 'avatar' not in request.files:
        return jsonify({'error': 'Нет файла.'}), 400
    file = request.files['avatar']
    if not file or not file.filename:
        return jsonify({'error': 'Файл не выбран.'}), 400
    # Проверка расширения
    allowed_ext = {'png', 'jpg', 'jpeg', 'gif'}
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in allowed_ext:
        return jsonify({'error': 'Недопустимый формат файла.'}), 400
    # Проверка размера (макс. 2 МБ)
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > 2 * 1024 * 1024:
        return jsonify({'error': 'Слишком большой файл (макс. 2 МБ).'}), 400
    # Имя файла: username.ext
    filename = f"{username}.{ext}"
    upload_dir = os.path.join(app.root_path, 'static', 'avatars')
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    # Добавляем timestamp для предотвращения кеширования
    timestamp = int(time.time())
    avatar_url = f"/static/avatars/{filename}?t={timestamp}"
    # Обновляем avatar_url в базе
    conn = get_db()
    cur = conn.cursor()
    cur.execute('UPDATE users SET avatar_url=%s WHERE username=%s', (avatar_url, username))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True, 'avatar_url': avatar_url})


@app.route('/api/avatar/<username>')
def get_user_avatar(username):
    """Получить аватар пользователя по username"""
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('SELECT avatar_url FROM users WHERE username=%s', (username,))
        row = cur.fetchone()
        if row and row[0]:
            # Добавляем timestamp для предотвращения кеширования
            avatar_url = row[0]
            if '?' not in avatar_url:  # Если timestamp еще не добавлен
                timestamp = int(time.time())
                avatar_url = f"{avatar_url}?t={timestamp}"
            return jsonify({'avatar_url': avatar_url})
        else:
            return jsonify({'avatar_url': None})
    except Exception as e:
        return jsonify({'error': 'Ошибка получения аватара.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/delete_avatar', methods=['POST'])
@require_csrf_token
def delete_avatar(username):
    """Удалить аватар пользователя"""
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Получаем текущий avatar_url
        cur.execute('SELECT avatar_url FROM users WHERE username=%s', (username,))
        row = cur.fetchone()
        if row and row[0]:
            # Удаляем файл аватара
            avatar_path = os.path.join(app.root_path, 'static', 'avatars', os.path.basename(row[0]))
            if os.path.exists(avatar_path):
                os.remove(avatar_path)
        
        # Очищаем avatar_url в базе
        cur.execute('UPDATE users SET avatar_url=NULL WHERE username=%s', (username,))
        conn.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка удаления аватара.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/<username>/api/update_profile', methods=['POST'])
@require_csrf_token
def api_update_profile(username):
    """Обновить профиль пользователя"""
    if not is_authenticated(username):
        return jsonify({'error': 'Требуется авторизация.'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных.'}), 400
    
    # Получаем значения полей
    email = data.get('email', '').strip()
    country = data.get('country', '').strip()
    fullname = data.get('fullname', '').strip()
    
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Валидация email
        if not email or '@' not in email:
            return jsonify({'error': 'Некорректный email.'}), 400
        
        # Проверяем уникальность email (если он изменился)
        cur.execute('SELECT email FROM users WHERE username=%s', (username,))
        current_email_row = cur.fetchone()
        if current_email_row and current_email_row[0] != email:
            cur.execute('SELECT id FROM users WHERE email=%s AND username!=%s', (email, username))
            if cur.fetchone():
                return jsonify({'error': 'Email уже используется другим пользователем.'}), 409
        
        # Валидация страны
        if not country or len(country) < 2:
            return jsonify({'error': 'Страна должна содержать минимум 2 символа.'}), 400
        
        # Обновляем все поля
        cur.execute('UPDATE users SET email=%s, country=%s, fullname=%s WHERE username=%s', 
                   (email, country, fullname, username))
        
        if cur.rowcount == 0:
            return jsonify({'error': 'Пользователь не найден.'}), 404
        
        conn.commit()
        return jsonify({'success': True, 'email': email, 'country': country, 'fullname': fullname})
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Ошибка обновления профиля.'}), 500
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# --- Безопасные cookie ---
app.config['SESSION_COOKIE_HTTPONLY'] = True
# SESSION_COOKIE_SECURE только для HTTPS (продакшен)
app.config['SESSION_COOKIE_SECURE'] = False  # Изменено для локальной разработки
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = SESSION_LIFETIME  # 30 минут

# --- Отключаем отображение ошибок пользователю и используем красивый шаблон ---
@app.errorhandler(500)
def internal_error(error):
    return render_template('error.html', code=500, message='Внутренняя ошибка сервера. Попробуйте позже.'), 500

@app.errorhandler(404)
def not_found_error(error):
    # Проверяем, есть ли авторизованный пользователь
    user = session.get('user')
    if user and is_authenticated(user):
        # Если пользователь авторизован, перенаправляем на его Kanban-доску
        return redirect(url_for('kanban', username=user))
    # Если не авторизован, показываем страницу ошибки
    return render_template('error.html', code=404, message="Страница не найдена"), 404

# --- CSP и XSS ---
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # CSP политика с более строгими ограничениями
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.socket.io; script-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.socket.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:;"
    return response

def validate_date(val):
    """Проверяет, что дата валидна и находится в разумном диапазоне (1900-2100). Если невалидна — возвращает None."""
    if not val:
        return None
    try:
        if isinstance(val, str):
            d = datetime.datetime.fromisoformat(val)
        elif isinstance(val, (datetime.date, datetime.datetime)):
            d = val
        else:
            return None
        if 1900 <= d.year <= 2100:
            return d
        return None
    except Exception:
        return None

if __name__ == '__main__':
    # Инициализируем базу данных при запуске
    try:
        init_db()
        cleanup_invalid_dates()  # Очищаем некорректные даты
        print("База данных инициализирована успешно")
    except Exception as e:
        print(f"Ошибка инициализации базы данных: {e}")
    
    # Отключаем debug-режим для продакшена
    socketio.run(app, debug=False, host='0.0.0.0')

