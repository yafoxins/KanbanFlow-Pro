import os
import json
import time
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'super-strong-secret-key'
SESSION_LIFETIME = 1800  # 30 минут

DATA_DIR = 'user_data'
os.makedirs(DATA_DIR, exist_ok=True)


def get_user_path(username):
    return os.path.join(DATA_DIR, f'{username}.json')


def load_user_board(username):
    path = get_user_path(username)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        "password": None,
        "statuses": [
            {"code": "todo", "title": "Запланировано"},
            {"code": "progress", "title": "В работе"},
            {"code": "done", "title": "Готово"}
        ],
        "tasks": []
    }


def save_user_board(username, board):
    path = get_user_path(username)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(board, f, ensure_ascii=False, indent=2)


def is_authenticated(username):
    user = session.get('user')
    ts = session.get('login_time')
    if user == username and ts and (time.time() - ts) < SESSION_LIFETIME:
        session['login_time'] = time.time()  # prolong session on activity
        return True
    session.pop('user', None)
    session.pop('login_time', None)
    return False


@app.route('/')
def home():
    return render_template('home.html')

# -------- API для модальных форм --------


@app.route('/api/check_user/<username>')
def api_check_user(username):
    exists = os.path.exists(get_user_path(username))
    return jsonify({'exists': exists})


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json(force=True)
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if not username or not password or len(password) < 3:
        return jsonify({'error': 'bad'}), 400
    path = get_user_path(username)
    if os.path.exists(path):
        return jsonify({'error': 'exists'}), 409
    board = load_user_board(username)
    board['password'] = generate_password_hash(password)
    save_user_board(username, board)
    session['user'] = username
    session['login_time'] = time.time()
    return jsonify({'success': True})


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json(force=True)
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    board = load_user_board(username)
    if not board['password']:
        return jsonify({'error': 'no-user'}), 404
    if not check_password_hash(board['password'], password):
        return jsonify({'error': 'badpass'}), 403
    session['user'] = username
    session['login_time'] = time.time()
    return jsonify({'success': True})


@app.route('/<username>/logout')
def logout(username):
    session.pop('user', None)
    session.pop('login_time', None)
    return redirect(url_for('home'))

# ---------- Основная доска ----------


@app.route('/<username>/kanban')
def kanban(username):
    if not is_authenticated(username):
        return redirect(url_for('home'))
    board = load_user_board(username)
    return render_template(
        'kanban.html',
        username=username,
        statuses=board.get('statuses', []),
        tasks=board.get('tasks', [])
    )

# --------------- API для Kanban ---------------


@app.route('/<username>/api/tasks', methods=['POST'])
def api_add_task(username):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    data = request.json
    text = data.get('text', '').strip()
    desc = data.get('desc', '').strip()
    status = data.get('status')
    if not text:
        return jsonify({'error': 'empty'}), 400
    task = {
        "id": max([t.get("id", 0) for t in board['tasks']] + [0]) + 1,
        "text": text,
        "desc": desc,
        "status": status,
    }
    board['tasks'].append(task)
    save_user_board(username, board)
    return jsonify(task)


@app.route('/<username>/api/tasks/<int:task_id>', methods=['DELETE'])
def api_delete_task(username, task_id):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    board['tasks'] = [t for t in board['tasks'] if t['id'] != task_id]
    save_user_board(username, board)
    return jsonify({"success": True})


@app.route('/<username>/api/tasks/<int:task_id>', methods=['PATCH'])
def api_update_task(username, task_id):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    data = request.json
    for t in board['tasks']:
        if t['id'] == task_id:
            t['text'] = data.get('text', t['text'])
            t['desc'] = data.get('desc', t.get('desc', ''))
            t['status'] = data.get('status', t['status'])
    save_user_board(username, board)
    return jsonify({"success": True})


@app.route('/<username>/api/tasks/order', methods=['POST'])
def api_reorder_tasks(username):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    orders = request.json.get('orders', {})
    id_to_task = {t['id']: t for t in board['tasks']}
    new_tasks = []
    for status in orders:
        for tid in orders[status]:
            task = id_to_task.get(tid)
            if task:
                task['status'] = status
                new_tasks.append(task)
    ids_in_order = {tid for tids in orders.values() for tid in tids}
    for t in board['tasks']:
        if t['id'] not in ids_in_order:
            new_tasks.append(t)
    board['tasks'] = new_tasks
    save_user_board(username, board)
    return jsonify({"success": True})


@app.route('/<username>/api/statuses', methods=['POST'])
def api_add_status(username):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    title = request.json.get('title', '').strip()
    if not title or len(title) < 2:
        return jsonify({'error': 'format'}), 400
    # Генерируем короткий code (todo-5, work-2 и т.п.)
    code_base = ''.join(e for e in title.lower() if e.isalnum())
    base = code_base[:8] if code_base else 'status'
    existing_codes = {s['code'] for s in board['statuses']}
    code = base
    i = 1
    while code in existing_codes:
        code = f"{base}{i}"
        i += 1
    board['statuses'].append({'code': code, 'title': title})
    save_user_board(username, board)
    return jsonify({'code': code, 'title': title})


@app.route('/<username>/api/statuses/<code>', methods=['DELETE'])
def api_delete_status(username, code):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    if len(board['statuses']) <= 1:
        return jsonify({'error': 'min1'}), 400
    board['statuses'] = [s for s in board['statuses'] if s['code'] != code]
    for t in board['tasks']:
        if t['status'] == code:
            t['status'] = board['statuses'][0]['code']
    save_user_board(username, board)
    return jsonify({'success': True})


@app.route('/<username>/api/statuses', methods=['GET'])
def api_get_statuses(username):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    return jsonify(board.get('statuses', []))


@app.route('/<username>/api/tasks', methods=['GET'])
def api_get_tasks(username):
    if not is_authenticated(username):
        return jsonify({"error": "auth"}), 401
    board = load_user_board(username)
    return jsonify(board.get('tasks', []))


if __name__ == '__main__':
    app.run(debug=True)
