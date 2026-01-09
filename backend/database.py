"""
SQLite Database Module
Gerencia todas as operações de banco de dados usando SQLite
"""
import sqlite3
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
import threading
from contextlib import contextmanager

# Caminho do banco de dados
DB_PATH = Path(__file__).parent / "data_backup" / "nucleo.db"

# Lock para thread safety
db_lock = threading.RLock()

# Conexão global para evitar múltiplas aberturas/fechamentos
_connection = None
_connection_lock = threading.Lock()

def get_connection():
    """Retorna uma conexão com o banco SQLite"""
    global _connection
    with _connection_lock:
        if _connection is None:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            _connection = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=30.0)
            _connection.row_factory = sqlite3.Row
            # Habilitar WAL mode para melhor concorrência
            _connection.execute("PRAGMA journal_mode=WAL")
            _connection.execute("PRAGMA busy_timeout=30000")
        return _connection

@contextmanager
def get_db():
    """Context manager para operações com banco"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e

def init_database():
    """Inicializa o banco de dados criando as tabelas"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Tabela de Usuários (senha em texto simples)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'observador',
                created_at TEXT
            )
        ''')
        
        # Tabela de Ingredientes
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                unit TEXT,
                unit_weight REAL DEFAULT 0,
                units_per_package INTEGER DEFAULT 0,
                average_price REAL DEFAULT 0,
                category TEXT,
                stock_quantity REAL DEFAULT 0,
                stock_min REAL DEFAULT 0,
                stock_max REAL DEFAULT 0,
                created_at TEXT
            )
        ''')
        
        # Tabela de Produtos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                product_type TEXT DEFAULT 'produto',
                sale_price REAL,
                photo_url TEXT,
                recipe TEXT,
                cmv REAL DEFAULT 0,
                profit_margin REAL,
                is_insumo INTEGER DEFAULT 0,
                is_divisible INTEGER DEFAULT 0,
                order_steps TEXT,
                created_at TEXT
            )
        ''')
        
        # Tabela de Compras
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchases (
                id TEXT PRIMARY KEY,
                batch_id TEXT,
                supplier TEXT,
                ingredient_id TEXT,
                ingredient_name TEXT,
                ingredient_unit TEXT,
                quantity REAL,
                price REAL,
                unit_price REAL,
                purchase_date TEXT
            )
        ''')
        
        # Tabela de Categorias
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT
            )
        ''')
        
        # Tabela de Logs de Auditoria
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                action TEXT,
                resource_type TEXT,
                resource_name TEXT,
                user_id TEXT,
                username TEXT,
                priority TEXT DEFAULT 'normal',
                timestamp TEXT,
                details TEXT
            )
        ''')
        
        conn.commit()
        
        print(f"[DATABASE] SQLite inicializado em: {DB_PATH}")

# ==================== USERS ====================

def get_user_by_username(username: str) -> Optional[Dict]:
    """Busca usuário pelo username"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Busca usuário pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None

def get_all_users() -> List[Dict]:
    """Retorna todos os usuários"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users ORDER BY created_at")
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]

def count_users() -> int:
    """Conta total de usuários"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        
        return count

def create_user(user_data: Dict) -> Dict:
    """Cria novo usuário"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        user_id = user_data.get('id', str(uuid.uuid4()))
        created_at = user_data.get('created_at', datetime.now(timezone.utc).isoformat())
        
        cursor.execute('''
            INSERT INTO users (id, username, password, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user_id,
            user_data['username'],
            user_data['password'],  # Texto simples!
            user_data.get('role', 'observador'),
            created_at
        ))
        conn.commit()
        
        
        return get_user_by_id(user_id)

def update_user(user_id: str, user_data: Dict) -> Optional[Dict]:
    """Atualiza usuário"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        updates = []
        values = []
        
        if 'password' in user_data:
            updates.append("password = ?")
            values.append(user_data['password'])
        if 'role' in user_data:
            updates.append("role = ?")
            values.append(user_data['role'])
        
        if updates:
            values.append(user_id)
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
            conn.commit()
        
        
        return get_user_by_id(user_id)

def delete_user(user_id: str) -> bool:
    """Deleta usuário"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        
        return deleted

def verify_password(username: str, password: str) -> bool:
    """Verifica senha do usuário (texto simples)"""
    user = get_user_by_username(username)
    if user and user.get('password') == password:
        return True
    return False

# ==================== INGREDIENTS ====================

def get_all_ingredients() -> List[Dict]:
    """Retorna todos os ingredientes"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ingredients ORDER BY name")
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]

def get_ingredient_by_id(ingredient_id: str) -> Optional[Dict]:
    """Busca ingrediente pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ingredients WHERE id = ?", (ingredient_id,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None

def create_ingredient(data: Dict) -> Dict:
    """Cria novo ingrediente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        ing_id = data.get('id', str(uuid.uuid4()))
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        
        cursor.execute('''
            INSERT INTO ingredients (id, name, unit, unit_weight, units_per_package, 
                                    average_price, category, stock_quantity, stock_min, stock_max, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            ing_id,
            data['name'],
            data.get('unit', 'kg'),
            data.get('unit_weight', 0),
            data.get('units_per_package', 0),
            data.get('average_price', 0),
            data.get('category'),
            data.get('stock_quantity', 0),
            data.get('stock_min', 0),
            data.get('stock_max', 0),
            created_at
        ))
        conn.commit()
        
        
        return get_ingredient_by_id(ing_id)

def update_ingredient(ingredient_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza ingrediente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE ingredients SET 
                name = COALESCE(?, name),
                unit = COALESCE(?, unit),
                unit_weight = COALESCE(?, unit_weight),
                units_per_package = COALESCE(?, units_per_package),
                average_price = COALESCE(?, average_price),
                category = COALESCE(?, category),
                stock_quantity = COALESCE(?, stock_quantity),
                stock_min = COALESCE(?, stock_min),
                stock_max = COALESCE(?, stock_max)
            WHERE id = ?
        ''', (
            data.get('name'),
            data.get('unit'),
            data.get('unit_weight'),
            data.get('units_per_package'),
            data.get('average_price'),
            data.get('category'),
            data.get('stock_quantity'),
            data.get('stock_min'),
            data.get('stock_max'),
            ingredient_id
        ))
        conn.commit()
        
        
        return get_ingredient_by_id(ingredient_id)

def delete_ingredient(ingredient_id: str) -> bool:
    """Deleta ingrediente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        
        return deleted

def count_ingredients() -> int:
    """Conta total de ingredientes"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM ingredients")
        count = cursor.fetchone()[0]
        
        return count

# ==================== PRODUCTS ====================

def get_all_products() -> List[Dict]:
    """Retorna todos os produtos"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products ORDER BY name")
        rows = cursor.fetchall()
        
        
        products = []
        for row in rows:
            p = dict(row)
            # Converter JSON strings para listas com tratamento de erro
            try:
                p['recipe'] = json.loads(p['recipe']) if p['recipe'] else []
            except (json.JSONDecodeError, TypeError):
                print(f"[DATABASE] Erro ao parsear recipe para produto {p.get('name', 'Unknown')}: {p.get('recipe', 'None')}")
                p['recipe'] = []
            
            try:
                p['order_steps'] = json.loads(p['order_steps']) if p['order_steps'] else []
            except (json.JSONDecodeError, TypeError):
                print(f"[DATABASE] Erro ao parsear order_steps para produto {p.get('name', 'Unknown')}: {p.get('order_steps', 'None')}")
                p['order_steps'] = []
            
            p['is_insumo'] = bool(p['is_insumo'])
            p['is_divisible'] = bool(p['is_divisible'])
            products.append(p)
        
        return products

def get_product_by_id(product_id: str) -> Optional[Dict]:
    """Busca produto pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = cursor.fetchone()
        
        
        if row:
            p = dict(row)
            try:
                p['recipe'] = json.loads(p['recipe']) if p['recipe'] else []
            except (json.JSONDecodeError, TypeError):
                print(f"[DATABASE] Erro ao parsear recipe para produto {p.get('name', 'Unknown')}: {p.get('recipe', 'None')}")
                p['recipe'] = []
            
            try:
                p['order_steps'] = json.loads(p['order_steps']) if p['order_steps'] else []
            except (json.JSONDecodeError, TypeError):
                print(f"[DATABASE] Erro ao parsear order_steps para produto {p.get('name', 'Unknown')}: {p.get('order_steps', 'None')}")
                p['order_steps'] = []
            
            p['is_insumo'] = bool(p['is_insumo'])
            p['is_divisible'] = bool(p['is_divisible'])
            return p
        return None

def get_next_product_code() -> str:
    """Gera próximo código de produto"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(CAST(code AS INTEGER)) FROM products WHERE code IS NOT NULL")
        max_code = cursor.fetchone()[0]
        
        
        if max_code:
            return str(int(max_code) + 1).zfill(5)
        return "10001"

def create_product(data: Dict) -> Dict:
    """Cria novo produto"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        prod_id = data.get('id', str(uuid.uuid4()))
        code = data.get('code', get_next_product_code())
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        
        cursor.execute('''
            INSERT INTO products (id, code, name, description, category, product_type,
                                 sale_price, photo_url, recipe, cmv, profit_margin,
                                 is_insumo, is_divisible, order_steps, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            prod_id,
            code,
            data['name'],
            data.get('description'),
            data.get('category'),
            data.get('product_type', 'produto'),
            data.get('sale_price'),
            data.get('photo_url'),
            json.dumps(data.get('recipe', [])),
            data.get('cmv', 0),
            data.get('profit_margin'),
            1 if data.get('is_insumo') else 0,
            1 if data.get('is_divisible') else 0,
            json.dumps(data.get('order_steps', [])),
            created_at
        ))
        conn.commit()
        
        
        return get_product_by_id(prod_id)

def update_product(product_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza produto"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Buscar produto atual
        current = get_product_by_id(product_id)
        if not current:
            return None
        
        cursor.execute('''
            UPDATE products SET 
                name = ?,
                description = ?,
                category = ?,
                product_type = ?,
                sale_price = ?,
                photo_url = ?,
                recipe = ?,
                cmv = ?,
                profit_margin = ?,
                is_insumo = ?,
                is_divisible = ?,
                order_steps = ?
            WHERE id = ?
        ''', (
            data.get('name', current['name']),
            data.get('description', current.get('description')),
            data.get('category', current.get('category')),
            data.get('product_type', current.get('product_type', 'produto')),
            data.get('sale_price', current.get('sale_price')),
            data.get('photo_url', current.get('photo_url')),
            json.dumps(data.get('recipe', current.get('recipe', []))),
            data.get('cmv', current.get('cmv', 0)),
            data.get('profit_margin', current.get('profit_margin')),
            1 if data.get('is_insumo', current.get('is_insumo')) else 0,
            1 if data.get('is_divisible', current.get('is_divisible')) else 0,
            json.dumps(data.get('order_steps', current.get('order_steps', []))),
            product_id
        ))
        conn.commit()
        
        
        return get_product_by_id(product_id)

def delete_product(product_id: str) -> bool:
    """Deleta produto"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        
        return deleted

def count_products() -> int:
    """Conta total de produtos"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM products")
        count = cursor.fetchone()[0]
        
        return count

# ==================== PURCHASES ====================

def get_all_purchases() -> List[Dict]:
    """Retorna todas as compras"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM purchases ORDER BY purchase_date DESC")
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]

def create_purchase(data: Dict) -> Dict:
    """Cria nova compra"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        purchase_id = data.get('id', str(uuid.uuid4()))
        
        cursor.execute('''
            INSERT INTO purchases (id, batch_id, supplier, ingredient_id, ingredient_name,
                                  ingredient_unit, quantity, price, unit_price, purchase_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            purchase_id,
            data.get('batch_id'),
            data.get('supplier'),
            data.get('ingredient_id'),
            data.get('ingredient_name'),
            data.get('ingredient_unit'),
            data.get('quantity'),
            data.get('price'),
            data.get('unit_price'),
            data.get('purchase_date', datetime.now(timezone.utc).isoformat())
        ))
        conn.commit()
        
        
        return data

def delete_purchases_by_batch(batch_id: str) -> bool:
    """Deleta compras por batch_id"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM purchases WHERE batch_id = ?", (batch_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        
        return deleted

def count_purchases() -> int:
    """Conta total de compras"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM purchases")
        count = cursor.fetchone()[0]
        
        return count

def get_purchases_by_ingredient(ingredient_id: str) -> List[Dict]:
    """Retorna compras de um ingrediente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM purchases WHERE ingredient_id = ? ORDER BY purchase_date", (ingredient_id,))
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]

# ==================== CATEGORIES ====================

def get_all_categories() -> List[Dict]:
    """Retorna todas as categorias"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories ORDER BY name")
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]

def get_category_by_id(category_id: str) -> Optional[Dict]:
    """Busca categoria pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None

def get_category_by_name(name: str) -> Optional[Dict]:
    """Busca categoria pelo nome"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE name = ?", (name,))
        row = cursor.fetchone()
        
        if row:
            return dict(row)
        return None

def create_category(data: Dict) -> Dict:
    """Cria nova categoria"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        cat_id = data.get('id', str(uuid.uuid4()))
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        
        cursor.execute('''
            INSERT INTO categories (id, name, created_at)
            VALUES (?, ?, ?)
        ''', (cat_id, data['name'], created_at))
        conn.commit()
        
        
        return get_category_by_id(cat_id)

def update_category(category_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza categoria"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE categories SET name = ? WHERE id = ?", (data['name'], category_id))
        conn.commit()
        
        return get_category_by_id(category_id)

def delete_category(category_id: str) -> bool:
    """Deleta categoria"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        
        return deleted

# ==================== AUDIT LOGS ====================

def get_all_audit_logs() -> List[Dict]:
    """Retorna todos os logs de auditoria"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]

def create_audit_log(data: Dict) -> Dict:
    """Cria novo log de auditoria"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        log_id = data.get('id', str(uuid.uuid4()))
        
        cursor.execute('''
            INSERT INTO audit_logs (id, action, resource_type, resource_name, user_id,
                                   username, priority, timestamp, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            log_id,
            data.get('action'),
            data.get('resource_type'),
            data.get('resource_name'),
            data.get('user_id'),
            data.get('username'),
            data.get('priority', 'normal'),
            data.get('timestamp', datetime.now(timezone.utc).isoformat()),
            data.get('details')
        ))
        conn.commit()
        
        
        return data

# ==================== MIGRATION ====================

def migrate_from_mongo(mongo_db):
    """Migra dados do MongoDB para SQLite"""
    import asyncio
    
    async def _migrate():
        print("[MIGRATION] Iniciando migração do MongoDB para SQLite...")
        
        # Migrar usuários
        users = await mongo_db.users.find({}, {"_id": 0}).to_list(1000)
        for u in users:
            if not get_user_by_id(u.get('id')):
                # Converter senha hash para texto simples (padrão: Admin123)
                create_user({
                    'id': u.get('id'),
                    'username': u.get('username'),
                    'password': 'Admin123',  # Senha padrão em texto simples
                    'role': u.get('role', 'observador'),
                    'created_at': u.get('created_at')
                })
        print(f"[MIGRATION] {len(users)} usuários migrados")
        
        # Migrar ingredientes
        ingredients = await mongo_db.ingredients.find({}, {"_id": 0}).to_list(1000)
        for ing in ingredients:
            if not get_ingredient_by_id(ing.get('id')):
                create_ingredient(ing)
        print(f"[MIGRATION] {len(ingredients)} ingredientes migrados")
        
        # Migrar produtos
        products = await mongo_db.products.find({}, {"_id": 0}).to_list(1000)
        for p in products:
            if not get_product_by_id(p.get('id')):
                create_product(p)
        print(f"[MIGRATION] {len(products)} produtos migrados")
        
        # Migrar compras
        purchases = await mongo_db.purchases.find({}, {"_id": 0}).to_list(10000)
        for pur in purchases:
            create_purchase(pur)
        print(f"[MIGRATION] {len(purchases)} compras migradas")
        
        # Migrar categorias
        categories = await mongo_db.categories.find({}, {"_id": 0}).to_list(1000)
        for cat in categories:
            if not get_category_by_name(cat.get('name')):
                create_category(cat)
        print(f"[MIGRATION] {len(categories)} categorias migradas")
        
        # Migrar logs de auditoria
        logs = await mongo_db.audit_logs.find({}, {"_id": 0}).to_list(10000)
        for log in logs:
            create_audit_log(log)
        print(f"[MIGRATION] {len(logs)} logs migrados")
        
        print("[MIGRATION] Migração concluída!")
    
    asyncio.get_event_loop().run_until_complete(_migrate())

# Inicializar banco ao importar o módulo
init_database()
