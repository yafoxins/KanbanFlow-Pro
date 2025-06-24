import os
import time
import psycopg2
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date

app = Flask(__name__)
app.secret_key = 'super-strong-secret-key'
SESSION_LIFETIME = 1800  # 30 минут

DATABASE_URL = os.getenv(
    'DATABASE_URL', 'postgres://kanban_user:kanban_pass@localhost:5432/kanban_db')


def get_db():
    return psycopg2.connect(DATABASE_URL)


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
        fullname TEXT
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
        status TEXT NOT NULL
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


@app.route('/')
def home():
    return render_template('home.html')


@app.route('/api/check_user/<username>')
def api_check_user(username):
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({'exists': bool(user)})


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    country = data.get('country', '').strip()
    fullname = data.get('fullname', '').strip()

    # Валидация
    if (len(username) < 2 or len(password) < 3 or
        not email or '@' not in email or
            not country):
        return jsonify({'error': 'bad'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('INSERT INTO users (username, password, email, country, fullname) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                    (username, generate_password_hash(password), email, country, fullname))
        user_id = cur.fetchone()[0]
        statuses = [("todo", "Запланировано"),
                    ("progress", "В работе"),
                    ("done", "Готово")]
        for code, title in statuses:
            cur.execute(
                'INSERT INTO statuses (user_id, code, title) VALUES (%s, %s, %s)', (user_id, code, title))
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({'error': 'exists'}), 409
    cur.close()
    conn.close()
    session['user'] = username
    session['login_time'] = time.time()
    return jsonify({'success': True})


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username, password = data.get(
        'username', '').strip(), data.get('password', '').strip()
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT password FROM users WHERE username=%s', (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if user and check_password_hash(user[0], password):
        session['user'] = username
        session['login_time'] = time.time()
        return jsonify({'success': True})
    return jsonify({'error': 'badpass'}), 403


@app.route('/<username>/logout')
def logout(username):
    session.pop('user', None)
    session.pop('login_time', None)
    return redirect(url_for('home'))


@app.route('/<username>/kanban')
def kanban(username):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    return render_template('kanban.html', username=username, active_page="kanban")


@app.route('/<username>/api/statuses', methods=['GET'])
def api_get_statuses(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'SELECT code, title FROM statuses WHERE user_id=(SELECT id FROM users WHERE username=%s)', (username,))
    statuses = [{'code': row[0], 'title': row[1]} for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(statuses)


@app.route('/<username>/api/tasks', methods=['GET'])
def api_get_tasks(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'SELECT id, text, description, status FROM tasks WHERE user_id=(SELECT id FROM users WHERE username=%s)', (username,))
    tasks = [{'id': row[0], 'text': row[1], 'description': row[2], 'status': row[3]}
             for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(tasks)


@app.route('/<username>/api/tasks', methods=['POST'])
def api_add_task(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.json
    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO tasks (user_id, text, description, status) VALUES ((SELECT id FROM users WHERE username=%s), %s, %s, %s) RETURNING id',
                (username, data['text'], data.get('description', ''), data['status']))
    task_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'id': task_id, 'text': data['text'], 'description': data.get('description', ''), 'status': data['status']})


@app.route('/<username>/api/tasks/<int:task_id>', methods=['PATCH', 'DELETE'])
def api_modify_task(username, task_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'DELETE':
        cur.execute(
            'DELETE FROM tasks WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (task_id, username))
    else:
        data = request.json
        cur.execute('UPDATE tasks SET text=%s, description=%s, status=%s WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)',
                    (data['text'], data.get('description', ''), data['status'], task_id, username))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/tasks/order', methods=['POST'])
def api_reorder_tasks(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    orders = request.json.get('orders', {})
    conn = get_db()
    cur = conn.cursor()
    # обновляем статус для всех задач
    for status, ids in orders.items():
        for idx, task_id in enumerate(ids):
            cur.execute('UPDATE tasks SET status=%s WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)',
                        (status, task_id, username))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/statuses', methods=['POST'])
def api_add_status(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.json
    code = data.get('code') or ('s' + str(int(time.time())))
    title = data.get('title', '').strip()
    if not title or len(title) < 2:
        return jsonify({'error': 'format'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO statuses (user_id, code, title) VALUES ((SELECT id FROM users WHERE username=%s), %s, %s)', (username, code, title))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'code': code, 'title': title})


@app.route('/<username>/api/statuses/<code>', methods=['DELETE'])
def api_delete_status(username, code):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    # Переводим задачи из этого статуса в первый доступный
    cur.execute('SELECT code FROM statuses WHERE user_id=(SELECT id FROM users WHERE username=%s) AND code!=%s ORDER BY id LIMIT 1', (username, code))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'min1'}), 400
    new_code = row[0]
    cur.execute('UPDATE tasks SET status=%s WHERE user_id=(SELECT id FROM users WHERE username=%s) AND status=%s',
                (new_code, username, code))
    cur.execute(
        'DELETE FROM statuses WHERE user_id=(SELECT id FROM users WHERE username=%s) AND code=%s', (username, code))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/api/profile/<username>')
def api_profile(username):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'SELECT username, email, country, fullname FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'not found'}), 404
    return jsonify({
        'username': row[0],
        'email': row[1],
        'country': row[2],
        'fullname': row[3]
    })


@app.route('/<username>/api/change_password', methods=['POST'])
def api_change_password(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    old_password = data.get('old_password', '').strip()
    new_password = data.get('new_password', '').strip()
    if len(new_password) < 3:
        return jsonify({'error': 'Пароль слишком короткий'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT password FROM users WHERE username=%s', (username,))
    user = cur.fetchone()
    if not user or not check_password_hash(user[0], old_password):
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
    return render_template('todo.html', username=username, active_page="todo")


@app.route('/<username>/api/todos', methods=['GET', 'POST'])
def api_todos(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
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
        data = request.get_json()
        text = data.get('text', '').strip()
        date_val = data.get('date', None)
        cur.execute('INSERT INTO todos (user_id, text, date) VALUES ((SELECT id FROM users WHERE username=%s), %s, %s) RETURNING id, date',
                    (username, text, date_val))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'id': row[0], 'text': text, 'date': row[1].isoformat() if row[1] else None, 'done': False})


@app.route('/<username>/api/todos/<int:todo_id>', methods=['PATCH', 'DELETE'])
def api_todo_modify(username, todo_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'DELETE':
        cur.execute(
            'DELETE FROM todos WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)', (todo_id, username))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    else:
        data = request.get_json()
        done = data.get('done')
        cur.execute('UPDATE todos SET done=%s WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)',
                    (done, todo_id, username))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0')
