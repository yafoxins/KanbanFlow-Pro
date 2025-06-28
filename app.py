import os
import time
import psycopg2
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date
from flask_socketio import SocketIO, emit, join_room, leave_room


app = Flask(__name__)
app.secret_key = 'super-strong-secret-key'
SESSION_LIFETIME = 1800  # 30 минут
socketio = SocketIO(app, cors_allowed_origins="*")

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
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL
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
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return jsonify({'error': 'not found'}), 404
    id = row[0]
    return jsonify({'exists': bool(row), 'id': id})


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    country = data.get('country', '').strip()
    fullname = data.get('fullname', '').strip()

    # Валидация
    if (len(username) < 2 or len(password) < 3 or not email or '@' not in email or not country):
        return jsonify({'error': 'bad'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('INSERT INTO users (username, password, email, country, fullname) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                    (username, generate_password_hash(password), email, country, fullname))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'not created'}), 400
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
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row and check_password_hash(row[0], password):
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
    tasks = [{'id': row[0], 'text': row[1], 'description': row[2],
              'status': row[3]} for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(tasks)


@app.route('/<username>/api/tasks', methods=['POST'])
def api_add_task(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO tasks (user_id, text, description, status) VALUES ((SELECT id FROM users WHERE username=%s), %s, %s, %s) RETURNING id',
                (username, data['text'], data.get('description', ''), data['status']))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'not found'}), 404
    task_id = row[0]
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
        data = request.get_json()
        if not data:
            return jsonify({'error': 'no data'}), 400
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
    orders = request.get_json().get('orders', {})
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
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
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
        if not data:
            return jsonify({'error': 'no data'}), 400
        text = data.get('text', '').strip()
        date_val = data.get('date', None)
        if not text:
            return jsonify({'error': 'empty text'}), 400
        # Логируем user_id
        cur.execute('SELECT id FROM users WHERE username=%s', (username,))
        user_row = cur.fetchone()
        if not user_row:
            return jsonify({'error': 'user not found'}), 400
        user_id = user_row[0]
        cur.execute('INSERT INTO todos (user_id, text, date) VALUES (%s, %s, %s) RETURNING id, date',
                    (user_id, text, date_val))
        row = cur.fetchone()
        conn.commit()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'not created'}), 400
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
        if not data:
            return jsonify({'error': 'no data'}), 400
        done = data.get('done')
        cur.execute('UPDATE todos SET done=%s WHERE id=%s AND user_id=(SELECT id FROM users WHERE username=%s)',
                    (done, todo_id, username))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})


@app.route('/<username>/team')
def team_page(username):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    return render_template('team_board.html', username=username)


@app.route('/<username>/api/teams', methods=['POST'])
def create_team(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'no name'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute(
        'INSERT INTO teams (name, leader_id) VALUES (%s, %s) RETURNING id', (name, user_id))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'not created'}), 400
    team_id = row[0]
    cur.execute(
        'INSERT INTO team_members (team_id, user_id) VALUES (%s, %s)', (team_id, user_id))
    # Добавим стандартные статусы
    for code, title in [("todo", "Запланировано"), ("progress", "В работе"), ("done", "Готово")]:
        cur.execute(
            'INSERT INTO team_statuses (team_id, code, title) VALUES (%s, %s, %s)', (team_id, code, title))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'team_id': team_id, 'name': name})


@app.route('/<username>/api/teams/<int:team_id>/members', methods=['POST'])
def add_team_member(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    member_username = data.get('username')
    remove = data.get('remove', False)
    conn = get_db()
    cur = conn.cursor()
    # Получаем id пользователя и id лидера
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'team not found'}), 404
    leader_id = row[0]
    # Удаление участника — только лидер
    if remove:
        if user_id != leader_id:
            cur.close()
            conn.close()
            return jsonify({'error': 'not leader'}), 403
        # Нельзя удалить лидера
        cur.execute('SELECT id FROM users WHERE username=%s',
                    (member_username,))
        row = cur.fetchone()
        if not row or row[0] == leader_id:
            cur.close()
            conn.close()
            return jsonify({'error': 'cannot remove leader'}), 400
        cur.execute(
            'DELETE FROM team_members WHERE team_id=%s AND user_id=%s', (team_id, row[0]))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({'success': True})
    # Добавление участника — только лидер
    if user_id != leader_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'not leader'}), 403
    cur.execute('SELECT id FROM users WHERE username=%s', (member_username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    cur.execute(
        'INSERT INTO team_members (team_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', (team_id, row[0]))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/members', methods=['GET'])
def get_team_members(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute('''
        SELECT u.username FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = %s
    ''', (team_id,))
    members = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify({'members': members})


@app.route('/<username>/api/teams/<int:team_id>/statuses', methods=['GET'])
def get_team_statuses(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        'SELECT code, title FROM team_statuses WHERE team_id=%s', (team_id,))
    statuses = [{'code': row[0], 'title': row[1]} for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(statuses)


@app.route('/<username>/api/teams/<int:team_id>/tasks', methods=['GET', 'POST'])
def team_tasks(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'GET':
        cur.execute(
            'SELECT t.id, t.text, t.description, t.status, t.assignee_id, u.username as assignee_name '
            'FROM team_tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.team_id=%s', (team_id,))
        tasks = [{'id': row[0], 'text': row[1], 'description': row[2],
                  'status': row[3], 'assignee_id': row[4], 'assignee_name': row[5]} for row in cur.fetchall()]
        cur.close()
        conn.close()
        return jsonify(tasks)
    else:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'no data'}), 400
        assignee_id = data.get('assignee_id')

        # Обработка assignee_id
        if assignee_id is not None and assignee_id != "":
            try:
                assignee_id = int(assignee_id)
            except (ValueError, TypeError):
                assignee_id = None
        else:
            assignee_id = None

        cur.execute('INSERT INTO team_tasks (team_id, text, description, status, assignee_id) VALUES (%s, %s, %s, %s, %s) RETURNING id',
                    (team_id, data['text'], data.get('description', ''), data['status'], assignee_id))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({'error': 'not found'}), 404
        task_id = row[0]
        conn.commit()
        cur.close()
        conn.close()
        # Реалтайм: уведомить всех в комнате team_{team_id}
        socketio.emit('team_task_added', {
            'id': task_id,
            'text': data['text'],
            'description': data.get('description', ''),
            'status': data['status'],
            'assignee_id': assignee_id
        }, to=f'team_{team_id}')
        return jsonify({'id': task_id, 'text': data['text'], 'description': data.get('description', ''), 'status': data['status'], 'assignee_id': assignee_id})


@app.route('/<username>/api/teams/<int:team_id>/tasks/<int:task_id>', methods=['PATCH', 'DELETE'])
def team_task_modify(username, team_id, task_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    if request.method == 'DELETE':
        cur.execute(
            'DELETE FROM team_tasks WHERE id=%s AND team_id=%s', (task_id, team_id))
        conn.commit()
        cur.close()
        conn.close()
        socketio.emit('team_task_deleted', {
                      'id': task_id}, to=f'team_{team_id}')
        return jsonify({'success': True})
    else:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'no data'}), 400
        assignee_id = data.get('assignee_id')

        # Обработка assignee_id
        if assignee_id is not None and assignee_id != "":
            try:
                assignee_id = int(assignee_id)
            except (ValueError, TypeError):
                assignee_id = None
        else:
            assignee_id = None

        cur.execute('UPDATE team_tasks SET text=%s, description=%s, status=%s, assignee_id=%s WHERE id=%s AND team_id=%s',
                    (data['text'], data.get('description', ''), data['status'], assignee_id, task_id, team_id))
        conn.commit()
        cur.close()
        conn.close()
        socketio.emit('team_task_updated', {
            'id': task_id,
            'text': data['text'],
            'description': data.get('description', ''),
            'status': data['status'],
            'assignee_id': assignee_id
        }, to=f'team_{team_id}')
        return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/tasks/order', methods=['POST'])
def team_tasks_order(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    orders = data.get('orders', {})
    move = data.get('move')
    conn = get_db()
    cur = conn.cursor()
    # Обновить порядок и статус задач
    for status, ids in orders.items():
        for idx, task_id in enumerate(ids):
            cur.execute(
                'UPDATE team_tasks SET status=%s WHERE id=%s AND team_id=%s', (status, task_id, team_id))
    # Если был перенос между колонками — обновить статус задачи
    if move:
        cur.execute('UPDATE team_tasks SET status=%s WHERE id=%s AND team_id=%s',
                    (move['status'], move['id'], team_id))
    conn.commit()
    cur.close()
    conn.close()
    # Реалтайм: уведомить всех о reorder
    socketio.emit('team_tasks_reordered', {
                  'team_id': team_id}, to=f'team_{team_id}')
    return jsonify({'success': True})


@app.route('/<username>/api/teams/list', methods=['GET'])
def api_list_teams(username):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
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
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute('SELECT id, name, leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'team not found'}), 404
    is_leader = (row[2] == user_id)
    cur.execute(
        '''SELECT u.username FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = %s''', (team_id,))
    members = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify({'id': row[0], 'name': row[1], 'leader_id': row[2], 'is_leader': is_leader, 'members': members})


@app.route('/<username>/api/teams/<int:team_id>/edit', methods=['POST'])
def api_edit_team(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    new_name = data.get('name', '').strip()
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row or row[0] != user_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'not leader'}), 403
    if new_name:
        cur.execute('UPDATE teams SET name=%s WHERE id=%s',
                    (new_name, team_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/delete', methods=['POST'])
def api_delete_team(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row or row[0] != user_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'not leader'}), 403
    cur.execute('DELETE FROM teams WHERE id=%s', (team_id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/set_leader', methods=['POST'])
def api_set_team_leader(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    new_leader = data.get('username')
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row or row[0] != user_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'not leader'}), 403
    cur.execute('SELECT id FROM users WHERE username=%s', (new_leader,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    cur.execute('UPDATE teams SET leader_id=%s WHERE id=%s',
                (row[0], team_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@app.route('/<username>/api/teams/<int:team_id>/leave', methods=['POST'])
def leave_team(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute('SELECT id FROM users WHERE username=%s', (username,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'user not found'}), 404
    user_id = row[0]
    cur.execute('SELECT leader_id FROM teams WHERE id=%s', (team_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'team not found'}), 404
    if row[0] == user_id:
        cur.close()
        conn.close()
        return jsonify({'error': 'leader_cannot_leave'}), 403
    cur.execute(
        'DELETE FROM team_members WHERE team_id=%s AND user_id=%s', (team_id, user_id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})


@socketio.on('join_team')
def on_join_team(data):
    team_id = data.get('team_id')
    join_room(f'team_{team_id}')


@socketio.on('leave_team')
def on_leave_team(data):
    team_id = data.get('team_id')
    leave_room(f'team_{team_id}')


@app.route('/<username>/api/teams/<int:team_id>/statuses', methods=['POST'])
def add_team_status(username, team_id):
    if not is_authenticated(username):
        return jsonify({'error': 'auth'}), 401
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no data'}), 400
    title = data.get('title', '').strip()
    code = data.get('code', '').strip()
    if not title or len(title) < 2 or not code:
        return jsonify({'error': 'Некорректные данные'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('INSERT INTO team_statuses (team_id, code, title) VALUES (%s, %s, %s)',
                (team_id, code, title))
    conn.commit()
    cur.close()
    conn.close()
    # Socket: уведомить всех о добавлении статуса
    socketio.emit('team_status_added', {
                  'team_id': team_id, 'code': code, 'title': title}, to=f'team_{team_id}')
    return jsonify({'code': code, 'title': title})


@app.route('/<username>/api/teams/<int:team_id>/statuses/<code>', methods=['DELETE'])
def delete_team_status(username, team_id, code):
    if not is_authenticated(username):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    cur = conn.cursor()
    # Найти первый доступный статус, отличный от удаляемого
    cur.execute(
        'SELECT code FROM team_statuses WHERE team_id=%s AND code!=%s ORDER BY id LIMIT 1', (team_id, code))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return jsonify({'error': 'Нельзя удалить последний статус'}), 400
    new_code = row[0]
    # Перевести задачи в новый статус
    cur.execute('UPDATE team_tasks SET status=%s WHERE team_id=%s AND status=%s',
                (new_code, team_id, code))
    # Удалить статус
    cur.execute(
        'DELETE FROM team_statuses WHERE team_id=%s AND code=%s', (team_id, code))
    conn.commit()
    cur.close()
    conn.close()
    # Socket: уведомить всех об удалении статуса
    socketio.emit('team_status_deleted', {
                  'team_id': team_id, 'code': code}, to=f'team_{team_id}')
    return jsonify({'success': True, 'moved_to': new_code})


if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=True, host='0.0.0.0')
