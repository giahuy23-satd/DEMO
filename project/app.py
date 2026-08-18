from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'graduation2026-the-last-chapter'
DB_PATH = os.path.join(app.instance_path, 'graduation.db')

def get_db():
    os.makedirs(app.instance_path, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS rsvp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            status TEXT DEFAULT 'attending',
            message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            memory_id TEXT,
            response TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/invitation')
def invitation():
    return render_template('invitation.html')

@app.route('/api/rsvp', methods=['POST'])
def rsvp():
    data = request.get_json()
    name  = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    status  = data.get('status', 'attending')
    message = data.get('message', '').strip()
    if not name:
        return jsonify({'success': False, 'error': 'Name is required'}), 400
    conn = get_db()
    conn.execute(
        'INSERT INTO rsvp (name, email, phone, status, message) VALUES (?, ?, ?, ?, ?)',
        (name, email, phone, status, message)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'RSVP confirmed!'})

@app.route('/api/memory', methods=['POST'])
def save_memory():
    data = request.get_json()
    session_id = data.get('session_id', '')
    memory_id  = data.get('memory_id', '')
    response   = data.get('response', '')
    conn = get_db()
    conn.execute(
        'INSERT INTO memories (session_id, memory_id, response) VALUES (?, ?, ?)',
        (session_id, memory_id, response)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/guests')
def guests():
    conn = get_db()
    rows = conn.execute('SELECT name, status, created_at FROM rsvp ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)
