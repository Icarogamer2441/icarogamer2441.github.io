from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# Conexão com o banco de dados SQLite3
conn = sqlite3.connect('database.db')
print("Banco de dados aberto com sucesso")

# Criando a tabela se ainda não existir
conn.execute('CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)')
print("Tabela criada com sucesso")
conn.close()

@app.route('/')
def index():
    conn = sqlite3.connect('database.db')
    cur = conn.cursor()
    cur.execute('SELECT * FROM entries ORDER BY id DESC')
    entries = cur.fetchall()
    conn.close()
    return render_template('index.html', entries=entries)

@app.route('/add', methods=['POST'])
def add_entry():
    if request.method == 'POST':
        content = request.form['content']
        conn = sqlite3.connect('database.db')
        cur = conn.cursor()
        cur.execute('INSERT INTO entries (content) VALUES (?)', (content,))
        conn.commit()
        conn.close()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
