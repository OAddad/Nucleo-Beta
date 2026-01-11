"""
SQLite Database Module para Núcleo Desktop
Gerencia todas as operações de banco de dados usando SQLite

REGRAS FUNDAMENTAIS (produção):
- SOMENTE usar NUCLEO_DB_PATH (de userData)
- Se DB não existe em userData: copiar seed empacotado
- NUNCA usar fallback silencioso para data_backup em produção
"""
import sqlite3
import json
import uuid
import os
import hashlib
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any
import threading
from contextlib import contextmanager

# ==================== CONFIGURAÇÃO ====================
db_lock = threading.RLock()
_connection = None
_connection_lock = threading.Lock()
_initialized = False
DB_PATH = None


# ==================== DETECÇÃO DE AMBIENTE ====================
def is_production():
    """Verifica se está rodando em produção (PyInstaller)"""
    return getattr(sys, 'frozen', False)


def get_seed_db_path():
    """Retorna o caminho do banco seed (empacotado no app)"""
    if is_production():
        # PyInstaller: seed está em _MEIPASS/data_backup
        if hasattr(sys, '_MEIPASS'):
            seed_path = Path(sys._MEIPASS) / "data_backup" / "nucleo.db"
            if seed_path.exists():
                return seed_path
        
        # Fallback: ao lado do executável
        exe_dir = Path(sys.executable).parent
        seed_path = exe_dir / "data_backup" / "nucleo.db"
        if seed_path.exists():
            return seed_path
    
    # Desenvolvimento: no projeto
    dev_path = Path(__file__).parent / "data_backup" / "nucleo.db"
    if dev_path.exists():
        return dev_path
    
    return None


def get_db_path():
    """
    Retorna o caminho do banco de dados.
    
    REGRA OBRIGATÓRIA:
    - Em produção: SOMENTE usar NUCLEO_DB_PATH (userData)
    - Em desenvolvimento: pode usar data_backup local
    """
    # Verificar variável de ambiente (definida pelo Electron)
    env_db_path = os.environ.get('NUCLEO_DB_PATH')
    
    if env_db_path:
        # Produção: usar caminho do userData
        print(f"[DATABASE] Usando NUCLEO_DB_PATH: {env_db_path}")
        return Path(env_db_path)
    
    if is_production():
        # ERRO: produção sem NUCLEO_DB_PATH definido
        print("[DATABASE] ERRO CRÍTICO: NUCLEO_DB_PATH não definido em produção!")
        # Fallback para evitar crash, mas logar erro
        return Path(os.environ.get('APPDATA', '')) / 'nucleo' / 'nucleo.db'
    
    # Desenvolvimento: usar data_backup local
    dev_path = Path(__file__).parent / "data_backup" / "nucleo.db"
    print(f"[DATABASE] Modo desenvolvimento, usando: {dev_path}")
    return dev_path


def bootstrap_database():
    """
    Bootstrap do banco de dados:
    - Se NUCLEO_DB_PATH não existe: copia o seed
    - Se existe: NÃO sobrescreve
    
    Retorna o caminho final do banco.
    """
    target_path = get_db_path()
    
    print(f"[DATABASE] Bootstrap - Target: {target_path}")
    print(f"[DATABASE] Bootstrap - Produção: {is_production()}")
    
    # Criar diretório pai
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Se o banco já existe, usar ele
    if target_path.exists():
        print(f"[DATABASE] Banco existente encontrado: {target_path}")
        print(f"[DATABASE] Tamanho: {target_path.stat().st_size} bytes")
        return target_path
    
    # Banco não existe - tentar copiar seed
    seed_path = get_seed_db_path()
    
    if seed_path and seed_path.exists():
        print(f"[DATABASE] Copiando seed: {seed_path} -> {target_path}")
        try:
            shutil.copy2(seed_path, target_path)
            print("[DATABASE] Seed copiado com sucesso!")
            print(f"[DATABASE] Novo tamanho: {target_path.stat().st_size} bytes")
            return target_path
        except Exception as e:
            print(f"[DATABASE] ERRO ao copiar seed: {e}")
    else:
        print(f"[DATABASE] Seed não encontrado em: {seed_path}")
    
    # Criar banco vazio (será inicializado depois)
    print(f"[DATABASE] Criando banco vazio em: {target_path}")
    return target_path


# ==================== CONEXÃO ====================
def get_connection():
    """Retorna uma conexão com o banco SQLite"""
    global _connection, DB_PATH
    
    with _connection_lock:
        if _connection is None:
            # Bootstrap do banco
            DB_PATH = bootstrap_database()
            
            print(f"[DATABASE] Conectando ao banco: {DB_PATH}")
            _connection = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=30.0)
            _connection.row_factory = sqlite3.Row
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


# ==================== HASH DE SENHA ====================
def hash_password(password: str) -> str:
    """Hash de senha usando SHA256 com salt"""
    salt = "nucleo_salt_2025"
    salted = f"{salt}{password}{salt}"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()


def verify_password(stored_hash: str, password: str) -> bool:
    """
    Verifica se a senha corresponde ao hash.
    Suporta tanto senhas hasheadas quanto texto puro (legado).
    """
    # Se o hash armazenado tem 64 chars hex, é SHA256
    if len(stored_hash) == 64 and all(c in '0123456789abcdef' for c in stored_hash.lower()):
        return hash_password(password) == stored_hash
    
    # Senha em texto puro (legado)
    return password == stored_hash


# ==================== INICIALIZAÇÃO ====================
def init_database():
    """Inicializa o banco de dados criando as tabelas e usuário admin padrão"""
    global _initialized, DB_PATH
    
    if _initialized:
        return
    
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Criar tabelas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'observador',
                must_change_password INTEGER DEFAULT 0,
                created_at TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                code TEXT,
                name TEXT NOT NULL,
                unit TEXT,
                unit_weight REAL DEFAULT 0,
                units_per_package INTEGER DEFAULT 0,
                average_price REAL DEFAULT 0,
                category TEXT,
                stock_quantity REAL DEFAULT 0,
                stock_min REAL DEFAULT 0,
                stock_max REAL DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT
            )
        ''')
        
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
                purchase_date TEXT,
                is_paid INTEGER DEFAULT 1,
                due_date TEXT,
                expense_id TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT
            )
        ''')
        
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
        
        # Tabela de classificações de despesas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expense_classifications (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT
            )
        ''')
        
        # Tabela de despesas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                classification_id TEXT,
                classification_name TEXT,
                supplier TEXT,
                value REAL NOT NULL,
                due_date TEXT NOT NULL,
                is_paid INTEGER DEFAULT 0,
                paid_date TEXT,
                is_recurring INTEGER DEFAULT 0,
                recurring_period TEXT,
                installments_total INTEGER DEFAULT 0,
                installment_number INTEGER DEFAULT 0,
                parent_expense_id TEXT,
                attachment_url TEXT,
                notes TEXT,
                created_at TEXT,
                FOREIGN KEY (classification_id) REFERENCES expense_classifications(id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clientes (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                telefone TEXT,
                email TEXT,
                cpf TEXT,
                data_nascimento TEXT,
                genero TEXT,
                foto TEXT,
                endereco TEXT,
                numero TEXT,
                complemento TEXT,
                bairro TEXT,
                cep TEXT,
                pedidos_count INTEGER DEFAULT 0,
                total_gasto REAL DEFAULT 0,
                last_order_date TEXT,
                orders_last_30_days INTEGER DEFAULT 0,
                pontuacao INTEGER DEFAULT 0,
                created_at TEXT
            )
        ''')
        
        # Migrações
        try:
            cursor.execute("SELECT code FROM ingredients LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE ingredients ADD COLUMN code TEXT")
        
        try:
            cursor.execute("SELECT must_change_password FROM users LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0")
        
        conn.commit()
        
        # Criar admin se não existir nenhum usuário
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            admin_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc).isoformat()
            admin_hash = hash_password("admin")
            
            cursor.execute('''
                INSERT INTO users (id, username, password, role, must_change_password, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (admin_id, 'admin', admin_hash, 'proprietario', 1, created_at))
            conn.commit()
            print("[DATABASE] Usuário admin criado (admin/admin)")
        
        # Configurações padrão
        cursor.execute("SELECT value FROM system_settings WHERE key = 'skip_login'")
        if not cursor.fetchone():
            cursor.execute('''
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ('skip_login', 'false', ?)
            ''', (datetime.now(timezone.utc).isoformat(),))
            conn.commit()
        
        # Migração: Adicionar colunas de receita na tabela products
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN linked_ingredient_id TEXT")
            conn.commit()
            print("[DATABASE] Coluna linked_ingredient_id adicionada em products")
        except:
            pass  # Coluna já existe
        
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN recipe_yield REAL")
            conn.commit()
            print("[DATABASE] Coluna recipe_yield adicionada em products")
        except:
            pass  # Coluna já existe
        
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN recipe_yield_unit TEXT")
            conn.commit()
            print("[DATABASE] Coluna recipe_yield_unit adicionada em products")
        except:
            pass  # Coluna já existe
        
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN unit_cost REAL")
            conn.commit()
            print("[DATABASE] Coluna unit_cost adicionada em products")
        except:
            pass  # Coluna já existe
        
        # Migração: Adicionar coluna recipe_cost_history na tabela ingredients
        try:
            cursor.execute("ALTER TABLE ingredients ADD COLUMN recipe_cost_history TEXT")
            conn.commit()
            print("[DATABASE] Coluna recipe_cost_history adicionada em ingredients")
        except:
            pass  # Coluna já existe
        
        # Migração: Adicionar colunas de pagamento na tabela purchases
        try:
            cursor.execute("ALTER TABLE purchases ADD COLUMN is_paid INTEGER DEFAULT 1")
            conn.commit()
            print("[DATABASE] Coluna is_paid adicionada em purchases")
        except:
            pass  # Coluna já existe
        
        try:
            cursor.execute("ALTER TABLE purchases ADD COLUMN due_date TEXT")
            conn.commit()
            print("[DATABASE] Coluna due_date adicionada em purchases")
        except:
            pass  # Coluna já existe
        
        try:
            cursor.execute("ALTER TABLE purchases ADD COLUMN expense_id TEXT")
            conn.commit()
            print("[DATABASE] Coluna expense_id adicionada em purchases")
        except:
            pass  # Coluna já existe
        
        # Migração: Adicionar coluna is_active na tabela ingredients
        try:
            cursor.execute("ALTER TABLE ingredients ADD COLUMN is_active INTEGER DEFAULT 1")
            conn.commit()
            print("[DATABASE] Coluna is_active adicionada em ingredients")
        except:
            pass  # Coluna já existe
        
        # Migração: Adicionar coluna is_active na tabela products
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1")
            conn.commit()
            print("[DATABASE] Coluna is_active adicionada em products")
        except:
            pass  # Coluna já existe
        
        # Migração: Adicionar coluna pontuacao na tabela clientes
        try:
            cursor.execute("ALTER TABLE clientes ADD COLUMN pontuacao INTEGER DEFAULT 0")
            conn.commit()
            print("[DATABASE] Coluna pontuacao adicionada em clientes")
        except:
            pass  # Coluna já existe
        
        # Criar tabela de horários de funcionamento
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS business_hours (
                id TEXT PRIMARY KEY,
                day_of_week INTEGER NOT NULL,
                day_name TEXT NOT NULL,
                is_open INTEGER DEFAULT 1,
                opening_time TEXT DEFAULT '08:00',
                closing_time TEXT DEFAULT '22:00',
                updated_at TEXT
            )
        ''')
        conn.commit()
        
        # Inicializar horários padrão se tabela vazia
        cursor.execute("SELECT COUNT(*) FROM business_hours")
        if cursor.fetchone()[0] == 0:
            days = [
                (0, "Segunda-feira"),
                (1, "Terça-feira"),
                (2, "Quarta-feira"),
                (3, "Quinta-feira"),
                (4, "Sexta-feira"),
                (5, "Sábado"),
                (6, "Domingo")
            ]
            now = datetime.now(timezone.utc).isoformat()
            for day_num, day_name in days:
                # Domingo fechado por padrão
                is_open = 0 if day_num == 6 else 1
                cursor.execute('''
                    INSERT INTO business_hours (id, day_of_week, day_name, is_open, opening_time, closing_time, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), day_num, day_name, is_open, '08:00', '22:00', now))
            conn.commit()
            print("[DATABASE] Horários de funcionamento padrão criados")
        
        _initialized = True
        print(f"[DATABASE] Inicializado em: {DB_PATH}")


# ==================== SYSTEM SETTINGS ====================
def get_setting(key: str) -> Optional[str]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row[0] if row else None


def set_setting(key: str, value: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO system_settings (key, value, updated_at)
            VALUES (?, ?, ?)
        ''', (key, value, datetime.now(timezone.utc).isoformat()))
        conn.commit()
        return True


def get_all_settings() -> Dict[str, str]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM system_settings")
        return {row[0]: row[1] for row in cursor.fetchall()}


# ==================== USERS ====================
def get_user_by_username(username: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_users() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users ORDER BY created_at")
        return [dict(row) for row in cursor.fetchall()]


def count_users() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        return cursor.fetchone()[0]


def create_user(user_data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        user_id = user_data.get('id', str(uuid.uuid4()))
        created_at = user_data.get('created_at', datetime.now(timezone.utc).isoformat())
        must_change = user_data.get('must_change_password', 0)
        
        # Hash da senha
        password = user_data['password']
        if len(password) != 64 or not all(c in '0123456789abcdef' for c in password.lower()):
            password = hash_password(password)
        
        cursor.execute('''
            INSERT INTO users (id, username, password, role, must_change_password, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, user_data['username'], password, user_data.get('role', 'observador'), must_change, created_at))
        conn.commit()
        
        return get_user_by_id(user_id)


def update_user(user_id: str, user_data: Dict) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        updates = []
        values = []
        
        if 'password' in user_data:
            password = user_data['password']
            if len(password) != 64 or not all(c in '0123456789abcdef' for c in password.lower()):
                password = hash_password(password)
            updates.append("password = ?")
            values.append(password)
        
        if 'role' in user_data:
            updates.append("role = ?")
            values.append(user_data['role'])
        
        if 'must_change_password' in user_data:
            updates.append("must_change_password = ?")
            values.append(user_data['must_change_password'])
        
        if updates:
            values.append(user_id)
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
            conn.commit()
        
        return get_user_by_id(user_id)


def delete_user(user_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


# ==================== INGREDIENTS ====================
def get_next_ingredient_code() -> str:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(CAST(code AS INTEGER)) FROM ingredients WHERE code IS NOT NULL AND code != ''")
        max_code = cursor.fetchone()[0]
        if max_code and int(max_code) >= 20000:
            return str(int(max_code) + 1).zfill(5)
        return "20001"


def get_all_ingredients() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ingredients ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]


def get_ingredient_by_id(ingredient_id: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ingredients WHERE id = ?", (ingredient_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_ingredient(data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        ing_id = data.get('id', str(uuid.uuid4()))
        code = data.get('code', get_next_ingredient_code())
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        
        cursor.execute('''
            INSERT INTO ingredients (id, code, name, unit, unit_weight, units_per_package, 
                                    average_price, category, stock_quantity, stock_min, stock_max, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (ing_id, code, data['name'], data.get('unit', 'kg'), data.get('unit_weight', 0),
              data.get('units_per_package', 0), data.get('average_price', 0), data.get('category'),
              data.get('stock_quantity', 0), data.get('stock_min', 0), data.get('stock_max', 0), created_at))
        conn.commit()
        
        return get_ingredient_by_id(ing_id)


def update_ingredient(ingredient_id: str, data: Dict) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Construir query dinamicamente para incluir is_active quando necessário
        set_clauses = []
        params = []
        
        if 'name' in data:
            set_clauses.append("name = ?")
            params.append(data['name'])
        if 'unit' in data:
            set_clauses.append("unit = ?")
            params.append(data['unit'])
        if 'unit_weight' in data:
            set_clauses.append("unit_weight = ?")
            params.append(data['unit_weight'])
        if 'units_per_package' in data:
            set_clauses.append("units_per_package = ?")
            params.append(data['units_per_package'])
        if 'average_price' in data:
            set_clauses.append("average_price = ?")
            params.append(data['average_price'])
        if 'category' in data:
            set_clauses.append("category = ?")
            params.append(data['category'])
        if 'stock_quantity' in data:
            set_clauses.append("stock_quantity = ?")
            params.append(data['stock_quantity'])
        if 'stock_min' in data:
            set_clauses.append("stock_min = ?")
            params.append(data['stock_min'])
        if 'stock_max' in data:
            set_clauses.append("stock_max = ?")
            params.append(data['stock_max'])
        if 'is_active' in data:
            set_clauses.append("is_active = ?")
            params.append(1 if data['is_active'] else 0)
        
        if not set_clauses:
            return get_ingredient_by_id(ingredient_id)
        
        params.append(ingredient_id)
        query = f"UPDATE ingredients SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        
        return get_ingredient_by_id(ingredient_id)


def delete_ingredient(ingredient_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def count_ingredients() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM ingredients")
        return cursor.fetchone()[0]


# ==================== PRODUCTS ====================
def get_all_products() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products ORDER BY name")
        
        products = []
        for row in cursor.fetchall():
            p = dict(row)
            try:
                p['recipe'] = json.loads(p['recipe']) if p['recipe'] else []
            except (json.JSONDecodeError, TypeError):
                p['recipe'] = []
            try:
                p['order_steps'] = json.loads(p['order_steps']) if p['order_steps'] else []
            except (json.JSONDecodeError, TypeError):
                p['order_steps'] = []
            p['is_insumo'] = bool(p['is_insumo'])
            p['is_divisible'] = bool(p['is_divisible'])
            products.append(p)
        
        return products


def get_product_by_id(product_id: str) -> Optional[Dict]:
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
                p['recipe'] = []
            try:
                p['order_steps'] = json.loads(p['order_steps']) if p['order_steps'] else []
            except (json.JSONDecodeError, TypeError):
                p['order_steps'] = []
            p['is_insumo'] = bool(p['is_insumo'])
            p['is_divisible'] = bool(p['is_divisible'])
            return p
        return None


def get_next_product_code() -> str:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(CAST(code AS INTEGER)) FROM products WHERE code IS NOT NULL")
        max_code = cursor.fetchone()[0]
        if max_code:
            return str(int(max_code) + 1).zfill(5)
        return "10001"


def create_product(data: Dict) -> Dict:
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
        ''', (prod_id, code, data['name'], data.get('description'), data.get('category'),
              data.get('product_type', 'produto'), data.get('sale_price'), data.get('photo_url'),
              json.dumps(data.get('recipe', [])), data.get('cmv', 0), data.get('profit_margin'),
              1 if data.get('is_insumo') else 0, 1 if data.get('is_divisible') else 0,
              json.dumps(data.get('order_steps', [])), created_at))
        conn.commit()
        
        return get_product_by_id(prod_id)


def update_product(product_id: str, data: Dict) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        current = get_product_by_id(product_id)
        if not current:
            return None
        
        cursor.execute('''
            UPDATE products SET 
                name = ?, description = ?, category = ?, product_type = ?,
                sale_price = ?, photo_url = ?, recipe = ?, cmv = ?, profit_margin = ?,
                is_insumo = ?, is_divisible = ?, order_steps = ?,
                linked_ingredient_id = ?, recipe_yield = ?, recipe_yield_unit = ?, unit_cost = ?
            WHERE id = ?
        ''', (data.get('name', current['name']), data.get('description', current.get('description')),
              data.get('category', current.get('category')), data.get('product_type', current.get('product_type', 'produto')),
              data.get('sale_price', current.get('sale_price')), data.get('photo_url', current.get('photo_url')),
              json.dumps(data.get('recipe', current.get('recipe', []))), data.get('cmv', current.get('cmv', 0)),
              data.get('profit_margin', current.get('profit_margin')),
              1 if data.get('is_insumo', current.get('is_insumo')) else 0,
              1 if data.get('is_divisible', current.get('is_divisible')) else 0,
              json.dumps(data.get('order_steps', current.get('order_steps', []))),
              data.get('linked_ingredient_id', current.get('linked_ingredient_id')),
              data.get('recipe_yield', current.get('recipe_yield')),
              data.get('recipe_yield_unit', current.get('recipe_yield_unit')),
              data.get('unit_cost', current.get('unit_cost')),
              product_id))
        conn.commit()
        
        return get_product_by_id(product_id)


def delete_product(product_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def count_products() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM products")
        return cursor.fetchone()[0]


# ==================== PURCHASES ====================
def get_all_purchases() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM purchases ORDER BY purchase_date DESC")
        rows = []
        for row in cursor.fetchall():
            r = dict(row)
            r['is_paid'] = bool(r.get('is_paid', 1))
            rows.append(r)
        return rows


def get_purchase_by_id(purchase_id: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM purchases WHERE id = ?", (purchase_id,))
        row = cursor.fetchone()
        if row:
            r = dict(row)
            r['is_paid'] = bool(r.get('is_paid', 1))
            return r
        return None


def create_purchase(data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        purchase_id = data.get('id', str(uuid.uuid4()))
        
        cursor.execute('''
            INSERT INTO purchases (id, batch_id, supplier, ingredient_id, ingredient_name,
                                  ingredient_unit, quantity, price, unit_price, purchase_date,
                                  is_paid, due_date, expense_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (purchase_id, data.get('batch_id'), data.get('supplier'), data.get('ingredient_id'),
              data.get('ingredient_name'), data.get('ingredient_unit'), data.get('quantity'),
              data.get('price'), data.get('unit_price'),
              data.get('purchase_date', datetime.now(timezone.utc).isoformat()),
              1 if data.get('is_paid', True) else 0,
              data.get('due_date'),
              data.get('expense_id')))
        conn.commit()
        
        return data


def update_purchase_payment(batch_id: str, is_paid: bool, due_date: str = None, expense_id: str = None) -> bool:
    """Atualiza status de pagamento de todas as compras de um lote"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE purchases SET is_paid = ?, due_date = ?, expense_id = ?
            WHERE batch_id = ?
        ''', (1 if is_paid else 0, due_date, expense_id, batch_id))
        conn.commit()
        return cursor.rowcount > 0


def get_purchases_by_batch(batch_id: str) -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM purchases WHERE batch_id = ?", (batch_id,))
        rows = []
        for row in cursor.fetchall():
            r = dict(row)
            r['is_paid'] = bool(r.get('is_paid', 1))
            rows.append(r)
        return rows


def delete_purchases_by_batch(batch_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM purchases WHERE batch_id = ?", (batch_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def count_purchases() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM purchases")
        return cursor.fetchone()[0]


def get_purchases_by_ingredient(ingredient_id: str) -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM purchases WHERE ingredient_id = ? ORDER BY purchase_date", (ingredient_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_average_price_last_5_purchases(ingredient_id: str) -> float:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT unit_price FROM purchases 
            WHERE ingredient_id = ? 
            ORDER BY purchase_date DESC 
            LIMIT 5
        """, (ingredient_id,))
        
        prices = [row[0] for row in cursor.fetchall() if row[0] is not None]
        return sum(prices) / len(prices) if prices else 0.0


# ==================== CATEGORIES ====================
def get_all_categories() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]


def get_category_by_id(category_id: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_category_by_name(name: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM categories WHERE name = ?", (name,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_category(data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cat_id = data.get('id', str(uuid.uuid4()))
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        cursor.execute('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)',
                      (cat_id, data['name'], created_at))
        conn.commit()
        return get_category_by_id(cat_id)


def update_category(category_id: str, data: Dict) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE categories SET name = ? WHERE id = ?", (data['name'], category_id))
        conn.commit()
        return get_category_by_id(category_id)


def delete_category(category_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def count_categories() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM categories")
        return cursor.fetchone()[0]


# ==================== AUDIT LOGS ====================
def get_all_audit_logs() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC")
        return [dict(row) for row in cursor.fetchall()]


def create_audit_log(data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        log_id = data.get('id', str(uuid.uuid4()))
        cursor.execute('''
            INSERT INTO audit_logs (id, action, resource_type, resource_name, user_id,
                                   username, priority, timestamp, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (log_id, data.get('action'), data.get('resource_type'), data.get('resource_name'),
              data.get('user_id'), data.get('username'), data.get('priority', 'normal'),
              data.get('timestamp', datetime.now(timezone.utc).isoformat()), data.get('details')))
        conn.commit()
        return data


# ==================== EXPENSE CLASSIFICATIONS ====================
def get_all_expense_classifications() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expense_classifications ORDER BY name")
        return [dict(row) for row in cursor.fetchall()]


def get_expense_classification_by_id(classification_id: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expense_classifications WHERE id = ?", (classification_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_expense_classification_by_name(name: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expense_classifications WHERE name = ?", (name,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_expense_classification(data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        class_id = data.get('id', str(uuid.uuid4()))
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        cursor.execute('INSERT INTO expense_classifications (id, name, created_at) VALUES (?, ?, ?)',
                      (class_id, data['name'], created_at))
        conn.commit()
        return get_expense_classification_by_id(class_id)


def update_expense_classification(classification_id: str, data: Dict) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE expense_classifications SET name = ? WHERE id = ?", (data['name'], classification_id))
        conn.commit()
        return get_expense_classification_by_id(classification_id)


def delete_expense_classification(classification_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM expense_classifications WHERE id = ?", (classification_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def count_expense_classifications() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM expense_classifications")
        return cursor.fetchone()[0]


# ==================== EXPENSES ====================
def get_all_expenses() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expenses ORDER BY due_date DESC")
        return [dict(row) for row in cursor.fetchall()]


def get_expense_by_id(expense_id: str) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_expense(data: Dict) -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        expense_id = data.get('id', str(uuid.uuid4()))
        created_at = data.get('created_at', datetime.now(timezone.utc).isoformat())
        
        cursor.execute('''
            INSERT INTO expenses (id, name, classification_id, classification_name, supplier, value, 
                                 due_date, is_paid, paid_date, is_recurring, recurring_period,
                                 installments_total, installment_number, parent_expense_id, 
                                 attachment_url, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (expense_id, data['name'], data.get('classification_id'), data.get('classification_name'),
              data.get('supplier'), data['value'], data['due_date'],
              1 if data.get('is_paid') else 0, data.get('paid_date'),
              1 if data.get('is_recurring') else 0, data.get('recurring_period'),
              data.get('installments_total', 0), data.get('installment_number', 0),
              data.get('parent_expense_id'), data.get('attachment_url'),
              data.get('notes'), created_at))
        conn.commit()
        
        return get_expense_by_id(expense_id)


def update_expense(expense_id: str, data: Dict) -> Optional[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        current = get_expense_by_id(expense_id)
        if not current:
            return None
        
        cursor.execute('''
            UPDATE expenses SET 
                name = ?, classification_id = ?, classification_name = ?, supplier = ?, 
                value = ?, due_date = ?, is_paid = ?, paid_date = ?, is_recurring = ?,
                recurring_period = ?, installments_total = ?, installment_number = ?,
                attachment_url = ?, notes = ?
            WHERE id = ?
        ''', (data.get('name', current['name']), 
              data.get('classification_id', current.get('classification_id')),
              data.get('classification_name', current.get('classification_name')),
              data.get('supplier', current.get('supplier')),
              data.get('value', current['value']),
              data.get('due_date', current['due_date']),
              1 if data.get('is_paid', current.get('is_paid')) else 0,
              data.get('paid_date', current.get('paid_date')),
              1 if data.get('is_recurring', current.get('is_recurring')) else 0,
              data.get('recurring_period', current.get('recurring_period')),
              data.get('installments_total', current.get('installments_total', 0)),
              data.get('installment_number', current.get('installment_number', 0)),
              data.get('attachment_url', current.get('attachment_url')),
              data.get('notes', current.get('notes')),
              expense_id))
        conn.commit()
        
        return get_expense_by_id(expense_id)


def delete_expense(expense_id: str) -> bool:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted


def count_expenses() -> int:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM expenses")
        return cursor.fetchone()[0]


def get_expenses_by_classification(classification_id: str) -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expenses WHERE classification_id = ? ORDER BY due_date DESC", 
                      (classification_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_pending_expenses() -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expenses WHERE is_paid = 0 ORDER BY due_date ASC")
        return [dict(row) for row in cursor.fetchall()]


def get_expenses_by_month(year: int, month: int) -> List[Dict]:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        month_str = f"{year}-{str(month).zfill(2)}"
        cursor.execute("""
            SELECT * FROM expenses 
            WHERE due_date LIKE ? 
            ORDER BY due_date ASC
        """, (f"{month_str}%",))
        return [dict(row) for row in cursor.fetchall()]


def get_expenses_stats() -> Dict:
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Total de despesas
        cursor.execute("SELECT COUNT(*) FROM expenses")
        total = cursor.fetchone()[0]
        
        # Total pendente
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(value), 0) FROM expenses WHERE is_paid = 0")
        row = cursor.fetchone()
        pending_count, pending_value = row[0], row[1]
        
        # Total pago
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(value), 0) FROM expenses WHERE is_paid = 1")
        row = cursor.fetchone()
        paid_count, paid_value = row[0], row[1]
        
        return {
            "total": total,
            "pending_count": pending_count,
            "pending_value": pending_value,
            "paid_count": paid_count,
            "paid_value": paid_value
        }


# ==================== CLIENTES ====================
def get_all_clientes() -> List[Dict]:
    """Retorna todos os clientes"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clientes ORDER BY nome")
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_cliente_by_id(cliente_id: str) -> Optional[Dict]:
    """Retorna um cliente pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clientes WHERE id = ?", (cliente_id,))
        row = cursor.fetchone()
        if row:
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))
        return None


def create_cliente(data: Dict) -> Dict:
    """Cria um novo cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        cliente_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO clientes (id, nome, telefone, email, cpf, data_nascimento, genero, foto,
                                  endereco, numero, complemento, bairro, cep,
                                  pedidos_count, total_gasto, last_order_date, orders_last_30_days, pontuacao, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            cliente_id,
            data.get('nome'),
            data.get('telefone'),
            data.get('email'),
            data.get('cpf'),
            data.get('data_nascimento'),
            data.get('genero'),
            data.get('foto'),
            data.get('endereco'),
            data.get('numero'),
            data.get('complemento'),
            data.get('bairro'),
            data.get('cep'),
            data.get('pedidos_count', 0),
            data.get('total_gasto', 0),
            data.get('last_order_date'),
            data.get('orders_last_30_days', 0),
            data.get('pontuacao', 0),
            created_at
        ))
        conn.commit()
        
        return get_cliente_by_id(cliente_id)


def update_cliente(cliente_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um cliente existente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        set_clauses = []
        params = []
        
        fields = ['nome', 'telefone', 'email', 'cpf', 'data_nascimento', 'genero', 'foto',
                  'endereco', 'numero', 'complemento', 'bairro', 'cep',
                  'pedidos_count', 'total_gasto', 'last_order_date', 'orders_last_30_days', 'pontuacao']
        
        for field in fields:
            if field in data:
                set_clauses.append(f"{field} = ?")
                params.append(data[field])
        
        if not set_clauses:
            return get_cliente_by_id(cliente_id)
        
        params.append(cliente_id)
        query = f"UPDATE clientes SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        
        return get_cliente_by_id(cliente_id)


def delete_cliente(cliente_id: str) -> bool:
    """Deleta um cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))
        conn.commit()
        return cursor.rowcount > 0


def search_clientes(term: str) -> List[Dict]:
    """Busca clientes por nome, telefone, email ou CPF"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        search_term = f"%{term}%"
        cursor.execute('''
            SELECT * FROM clientes 
            WHERE nome LIKE ? OR telefone LIKE ? OR email LIKE ? OR cpf LIKE ?
            ORDER BY nome
        ''', (search_term, search_term, search_term, search_term))
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def count_clientes() -> int:
    """Conta total de clientes"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clientes")
        return cursor.fetchone()[0]


def get_total_pontuacao() -> int:
    """Retorna o total de pontos distribuídos para todos os clientes"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COALESCE(SUM(pontuacao), 0) FROM clientes")
        return cursor.fetchone()[0]


def update_cliente_pedido_stats(cliente_id: str, order_value: float) -> Optional[Dict]:
    """Atualiza estatísticas de pedido do cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Buscar cliente atual
        cliente = get_cliente_by_id(cliente_id)
        if not cliente:
            return None
        
        now = datetime.now(timezone.utc).isoformat()
        new_pedidos_count = (cliente.get('pedidos_count') or 0) + 1
        new_total_gasto = (cliente.get('total_gasto') or 0) + order_value
        
        cursor.execute('''
            UPDATE clientes 
            SET pedidos_count = ?, total_gasto = ?, last_order_date = ?
            WHERE id = ?
        ''', (new_pedidos_count, new_total_gasto, now, cliente_id))
        conn.commit()
        
        return get_cliente_by_id(cliente_id)


# ==================== BUSINESS HOURS ====================
def get_all_business_hours() -> List[Dict]:
    """Retorna todos os horários de funcionamento ordenados por dia da semana"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM business_hours ORDER BY day_of_week")
        return [dict(row) for row in cursor.fetchall()]


def get_business_hours_by_day(day_of_week: int) -> Optional[Dict]:
    """Retorna horário de funcionamento de um dia específico (0=Segunda, 6=Domingo)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM business_hours WHERE day_of_week = ?", (day_of_week,))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_business_hours(hours_list: List[Dict]) -> List[Dict]:
    """Atualiza todos os horários de funcionamento"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        for hour in hours_list:
            cursor.execute('''
                UPDATE business_hours 
                SET is_open = ?, opening_time = ?, closing_time = ?, updated_at = ?
                WHERE day_of_week = ?
            ''', (
                1 if hour.get('is_open', True) else 0,
                hour.get('opening_time', '08:00'),
                hour.get('closing_time', '22:00'),
                now,
                hour.get('day_of_week')
            ))
        
        conn.commit()
        return get_all_business_hours()


def update_single_business_hour(day_of_week: int, data: Dict) -> Optional[Dict]:
    """Atualiza horário de funcionamento de um único dia"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            UPDATE business_hours 
            SET is_open = ?, opening_time = ?, closing_time = ?, updated_at = ?
            WHERE day_of_week = ?
        ''', (
            1 if data.get('is_open', True) else 0,
            data.get('opening_time', '08:00'),
            data.get('closing_time', '22:00'),
            now,
            day_of_week
        ))
        
        conn.commit()
        return get_business_hours_by_day(day_of_week)


# ==================== UTILITY ====================
def get_database_info() -> Dict:
    """Retorna informações do banco de dados"""
    global DB_PATH
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        db_path = DB_PATH or get_db_path()
        
        info = {
            "path": str(db_path),
            "size_bytes": db_path.stat().st_size if db_path.exists() else 0,
            "is_production": is_production(),
            "tables": {}
        }
        
        for table in ["users", "ingredients", "products", "purchases", "categories", "audit_logs", 
                      "expense_classifications", "expenses", "clientes"]:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                info["tables"][table] = cursor.fetchone()[0]
            except:
                info["tables"][table] = 0
        
        return info


# Inicializar banco ao importar o módulo
init_database()
