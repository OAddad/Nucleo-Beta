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
import random
import sys
from datetime import datetime, timezone, timedelta
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
        
        # Tabela de endereços do cliente (múltiplos endereços)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS client_addresses (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                label TEXT DEFAULT 'Casa',
                endereco TEXT NOT NULL,
                numero TEXT,
                complemento TEXT,
                bairro TEXT,
                cidade TEXT DEFAULT 'São Paulo',
                estado TEXT DEFAULT 'SP',
                cep TEXT,
                is_default INTEGER DEFAULT 0,
                created_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clientes(id)
            )
        ''')
        
        # Criar tabela de pedidos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pedidos (
                id TEXT PRIMARY KEY,
                codigo TEXT UNIQUE NOT NULL,
                cliente_id TEXT,
                cliente_nome TEXT,
                cliente_telefone TEXT,
                cliente_email TEXT,
                items TEXT,
                total REAL DEFAULT 0,
                status TEXT DEFAULT 'aguardando_aceite',
                forma_pagamento TEXT,
                troco_precisa INTEGER DEFAULT 0,
                troco_valor REAL,
                tipo_entrega TEXT,
                endereco_label TEXT,
                endereco_rua TEXT,
                endereco_numero TEXT,
                endereco_complemento TEXT,
                endereco_bairro TEXT,
                endereco_cep TEXT,
                modulo TEXT DEFAULT 'Cardapio',
                observacao TEXT,
                entregador_id TEXT,
                entregador_nome TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Criar tabela de entregadores
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entregadores (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                telefone TEXT,
                ativo INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Criar tabela de funcionários (liga clientes a cargos)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS funcionarios (
                id TEXT PRIMARY KEY,
                cliente_id TEXT NOT NULL,
                cargo TEXT NOT NULL,
                ativo INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id)
            )
        ''')
        
        # Criar tabela de bairros para delivery
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bairros (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL UNIQUE,
                valor_entrega REAL DEFAULT 0,
                cep TEXT,
                ativo INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Criar tabela de ruas para delivery
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ruas (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                bairro_id TEXT,
                cep TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (bairro_id) REFERENCES bairros(id)
            )
        ''')
        
        # Tabela de analytics de palavras do WhatsApp
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS word_analytics (
                id TEXT PRIMARY KEY,
                word TEXT NOT NULL,
                type TEXT DEFAULT 'word',
                count INTEGER DEFAULT 1,
                last_used TEXT,
                first_used TEXT,
                sender_phones TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Tabela de mensagens do WhatsApp (histórico)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id TEXT PRIMARY KEY,
                sender_phone TEXT NOT NULL,
                sender_name TEXT,
                message TEXT NOT NULL,
                response TEXT,
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
        
        # Migração: Adicionar colunas de entregador na tabela pedidos
        try:
            cursor.execute("SELECT entregador_id FROM pedidos LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE pedidos ADD COLUMN entregador_id TEXT")
            cursor.execute("ALTER TABLE pedidos ADD COLUMN entregador_nome TEXT")
            print("[DATABASE] Colunas de entregador adicionadas em pedidos")
        
        # Migração: Adicionar coluna motivo_cancelamento na tabela pedidos
        try:
            cursor.execute("SELECT motivo_cancelamento FROM pedidos LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE pedidos ADD COLUMN motivo_cancelamento TEXT")
            print("[DATABASE] Coluna motivo_cancelamento adicionada em pedidos")
        
        # Migração: Adicionar coluna valor_entrega na tabela pedidos
        try:
            cursor.execute("SELECT valor_entrega FROM pedidos LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE pedidos ADD COLUMN valor_entrega REAL DEFAULT 0")
            print("[DATABASE] Coluna valor_entrega adicionada em pedidos")
        
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
                has_second_period INTEGER DEFAULT 0,
                opening_time_2 TEXT DEFAULT '18:00',
                closing_time_2 TEXT DEFAULT '23:59',
                updated_at TEXT
            )
        ''')
        conn.commit()
        
        # Tabela para árvore de decisão do ChatBot WhatsApp
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS decision_tree (
                id TEXT PRIMARY KEY,
                trigger TEXT NOT NULL,
                response TEXT NOT NULL,
                parent_id TEXT,
                "order" INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (parent_id) REFERENCES decision_tree(id)
            )
        ''')
        conn.commit()
        
        # Tabela para nós do fluxograma visual do ChatBot
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_flow_nodes (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT,
                position_x REAL DEFAULT 0,
                position_y REAL DEFAULT 0,
                config TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        conn.commit()
        
        # Tabela para conexões entre nós do fluxograma
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_flow_edges (
                id TEXT PRIMARY KEY,
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                condition TEXT,
                label TEXT,
                created_at TEXT,
                FOREIGN KEY (source_id) REFERENCES chatbot_flow_nodes(id),
                FOREIGN KEY (target_id) REFERENCES chatbot_flow_nodes(id)
            )
        ''')
        conn.commit()
        
        # Tabela para histórico de conversas do WhatsApp
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_conversations (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                client_name TEXT,
                client_id TEXT,
                status TEXT DEFAULT 'active',
                current_node_id TEXT,
                context TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clientes(id)
            )
        ''')
        conn.commit()
        
        # Tabela para mensagens das conversas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                node_id TEXT,
                created_at TEXT,
                FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id)
            )
        ''')
        conn.commit()
        
        # Tabela para configurações do chatbot
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chatbot_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        ''')
        conn.commit()
        
        # Tabela para respostas automáticas por palavras-chave
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS keyword_responses (
                id TEXT PRIMARY KEY,
                keywords TEXT NOT NULL,
                response TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                priority INTEGER DEFAULT 0,
                match_type TEXT DEFAULT 'contains',
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        conn.commit()
        
        # Tabela para estatísticas do WhatsApp/ChatBot
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS whatsapp_stats (
                id TEXT PRIMARY KEY DEFAULT 'main',
                messages_received INTEGER DEFAULT 0,
                messages_sent INTEGER DEFAULT 0,
                updated_at TEXT
            )
        ''')
        conn.commit()
        
        # Tabela para clientes atendidos pelo WhatsApp
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS whatsapp_clients (
                phone TEXT PRIMARY KEY,
                name TEXT,
                first_contact TEXT,
                last_contact TEXT,
                messages_count INTEGER DEFAULT 0
            )
        ''')
        conn.commit()
        
        # Inicializar registro de estatísticas se não existir
        cursor.execute("SELECT COUNT(*) FROM whatsapp_stats WHERE id = 'main'")
        if cursor.fetchone()[0] == 0:
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("INSERT INTO whatsapp_stats (id, messages_received, messages_sent, updated_at) VALUES ('main', 0, 0, ?)", (now,))
            conn.commit()
        
        # Verificar se precisa adicionar novas colunas (migração)
        try:
            cursor.execute("SELECT has_second_period FROM business_hours LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute("ALTER TABLE business_hours ADD COLUMN has_second_period INTEGER DEFAULT 0")
            cursor.execute("ALTER TABLE business_hours ADD COLUMN opening_time_2 TEXT DEFAULT '18:00'")
            cursor.execute("ALTER TABLE business_hours ADD COLUMN closing_time_2 TEXT DEFAULT '23:59'")
            conn.commit()
            print("[DATABASE] Colunas de segundo período adicionadas em business_hours")
        
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
                    INSERT INTO business_hours (id, day_of_week, day_name, is_open, opening_time, closing_time, has_second_period, opening_time_2, closing_time_2, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (str(uuid.uuid4()), day_num, day_name, is_open, '08:00', '22:00', 0, '18:00', '23:59', now))
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


def get_cliente_by_telefone(telefone: str) -> Optional[Dict]:
    """Retorna um cliente pelo telefone"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        # Remover formatação para busca
        telefone_limpo = ''.join(filter(str.isdigit, telefone))
        cursor.execute('''
            SELECT * FROM clientes 
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
            OR telefone = ?
        ''', (telefone_limpo, telefone))
        columns = [desc[0] for desc in cursor.description]
        row = cursor.fetchone()
        return dict(zip(columns, row)) if row else None


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
        
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        new_pedidos_count = (cliente.get('pedidos_count') or 0) + 1
        new_total_gasto = (cliente.get('total_gasto') or 0) + order_value
        
        # Calcular pedidos nos últimos 30 dias
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        cursor.execute('''
            SELECT COUNT(*) FROM pedidos 
            WHERE cliente_id = ? AND created_at >= ?
        ''', (cliente_id, thirty_days_ago))
        orders_last_30 = cursor.fetchone()[0] + 1  # +1 para incluir o pedido atual
        
        cursor.execute('''
            UPDATE clientes 
            SET pedidos_count = ?, total_gasto = ?, last_order_date = ?, orders_last_30_days = ?
            WHERE id = ?
        ''', (new_pedidos_count, new_total_gasto, now_iso, orders_last_30, cliente_id))
        conn.commit()
        
        return get_cliente_by_id(cliente_id)



def recalculate_all_cliente_stats() -> int:
    """Recalcula estatísticas de todos os clientes baseado nos pedidos reais"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        now = datetime.now(timezone.utc)
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        
        # Buscar todos os clientes
        cursor.execute("SELECT id FROM clientes")
        clientes = cursor.fetchall()
        
        updated_count = 0
        for (cliente_id,) in clientes:
            # Contar pedidos totais
            cursor.execute("SELECT COUNT(*), COALESCE(SUM(total), 0) FROM pedidos WHERE cliente_id = ?", (cliente_id,))
            total_row = cursor.fetchone()
            pedidos_count = total_row[0] or 0
            total_gasto = total_row[1] or 0
            
            # Último pedido
            cursor.execute("SELECT created_at FROM pedidos WHERE cliente_id = ? ORDER BY created_at DESC LIMIT 1", (cliente_id,))
            last_order_row = cursor.fetchone()
            last_order_date = last_order_row[0] if last_order_row else None
            
            # Pedidos nos últimos 30 dias
            cursor.execute("SELECT COUNT(*) FROM pedidos WHERE cliente_id = ? AND created_at >= ?", (cliente_id, thirty_days_ago))
            orders_last_30 = cursor.fetchone()[0] or 0
            
            # Atualizar cliente
            cursor.execute('''
                UPDATE clientes 
                SET pedidos_count = ?, total_gasto = ?, last_order_date = ?, orders_last_30_days = ?
                WHERE id = ?
            ''', (pedidos_count, total_gasto, last_order_date, orders_last_30, cliente_id))
            updated_count += 1
        
        conn.commit()
        return updated_count


# ==================== CLIENT ADDRESSES ====================
def get_client_addresses(client_id: str) -> List[Dict]:
    """Retorna todos os endereços de um cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM client_addresses WHERE client_id = ? ORDER BY is_default DESC, created_at DESC", (client_id,))
        return [dict(row) for row in cursor.fetchall()]


def get_address_by_id(address_id: str) -> Optional[Dict]:
    """Retorna um endereço pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM client_addresses WHERE id = ?", (address_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_client_address(data: Dict) -> Dict:
    """Cria um novo endereço para o cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        address_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        
        # Se é o primeiro endereço ou marcado como padrão, atualizar outros
        if data.get('is_default', False):
            cursor.execute("UPDATE client_addresses SET is_default = 0 WHERE client_id = ?", (data['client_id'],))
        
        # Verificar se é o primeiro endereço do cliente
        cursor.execute("SELECT COUNT(*) FROM client_addresses WHERE client_id = ?", (data['client_id'],))
        is_first = cursor.fetchone()[0] == 0
        
        cursor.execute('''
            INSERT INTO client_addresses (id, client_id, label, endereco, numero, complemento, bairro, cidade, estado, cep, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            address_id,
            data['client_id'],
            data.get('label', 'Casa'),
            data['endereco'],
            data.get('numero'),
            data.get('complemento'),
            data.get('bairro'),
            data.get('cidade', 'São Paulo'),
            data.get('estado', 'SP'),
            data.get('cep'),
            1 if (data.get('is_default') or is_first) else 0,
            created_at
        ))
        conn.commit()
        
        return get_address_by_id(address_id)


def update_client_address(address_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um endereço existente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        current = get_address_by_id(address_id)
        if not current:
            return None
        
        # Se marcado como padrão, desmarcar outros
        if data.get('is_default', False):
            cursor.execute("UPDATE client_addresses SET is_default = 0 WHERE client_id = ?", (current['client_id'],))
        
        cursor.execute('''
            UPDATE client_addresses SET
                label = ?, endereco = ?, numero = ?, complemento = ?, 
                bairro = ?, cidade = ?, estado = ?, cep = ?, is_default = ?
            WHERE id = ?
        ''', (
            data.get('label', current.get('label')),
            data.get('endereco', current.get('endereco')),
            data.get('numero', current.get('numero')),
            data.get('complemento', current.get('complemento')),
            data.get('bairro', current.get('bairro')),
            data.get('cidade', current.get('cidade')),
            data.get('estado', current.get('estado')),
            data.get('cep', current.get('cep')),
            1 if data.get('is_default') else current.get('is_default', 0),
            address_id
        ))
        conn.commit()
        
        return get_address_by_id(address_id)


def delete_client_address(address_id: str) -> bool:
    """Deleta um endereço"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM client_addresses WHERE id = ?", (address_id,))
        conn.commit()
        return cursor.rowcount > 0


# ==================== PEDIDOS ====================
def get_all_pedidos() -> List[Dict]:
    """Retorna todos os pedidos ordenados por data (mais recente primeiro)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos ORDER BY created_at DESC")
        pedidos = []
        for row in cursor.fetchall():
            p = dict(row)
            # Converter items de JSON string para lista
            if p.get('items'):
                try:
                    p['items'] = json.loads(p['items'])
                except:
                    p['items'] = []
            p['troco_precisa'] = bool(p.get('troco_precisa', 0))
            pedidos.append(p)
        return pedidos


def get_pedido_by_id(pedido_id: str) -> Optional[Dict]:
    """Retorna um pedido pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos WHERE id = ?", (pedido_id,))
        row = cursor.fetchone()
        if row:
            p = dict(row)
            if p.get('items'):
                try:
                    p['items'] = json.loads(p['items'])
                except:
                    p['items'] = []
            p['troco_precisa'] = bool(p.get('troco_precisa', 0))
            return p
        return None


def get_pedido_by_codigo(codigo: str) -> Optional[Dict]:
    """Retorna um pedido pelo código"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos WHERE codigo = ?", (codigo,))
        row = cursor.fetchone()
        if row:
            p = dict(row)
            if p.get('items'):
                try:
                    p['items'] = json.loads(p['items'])
                except:
                    p['items'] = []
            p['troco_precisa'] = bool(p.get('troco_precisa', 0))
            return p
        return None


def generate_pedido_codigo() -> str:
    """Gera um código único de 5 dígitos para o pedido"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        for _ in range(1000):  # Máximo de tentativas
            num = random.randint(0, 99999)
            codigo = f"#{num:05d}"
            cursor.execute("SELECT id FROM pedidos WHERE codigo = ?", (codigo,))
            if not cursor.fetchone():
                return codigo
        
        # Fallback com timestamp
        return f"#T{int(datetime.now().timestamp()) % 100000:05d}"


def create_pedido(data: Dict) -> Dict:
    """Cria um novo pedido"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        pedido_id = str(uuid.uuid4())
        codigo = data.get('codigo') or generate_pedido_codigo()
        created_at = datetime.now(timezone.utc).isoformat()
        
        # Converter items para JSON string
        items_json = json.dumps(data.get('items', []))
        
        cursor.execute('''
            INSERT INTO pedidos (
                id, codigo, cliente_id, cliente_nome, cliente_telefone, cliente_email,
                items, total, status, forma_pagamento,
                troco_precisa, troco_valor, tipo_entrega,
                endereco_label, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cep,
                modulo, observacao, valor_entrega, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            pedido_id,
            codigo,
            data.get('cliente_id'),
            data.get('cliente_nome'),
            data.get('cliente_telefone'),
            data.get('cliente_email'),
            items_json,
            data.get('total', 0),
            data.get('status', 'producao'),
            data.get('forma_pagamento'),
            1 if data.get('troco_precisa') else 0,
            data.get('troco_valor'),
            data.get('tipo_entrega'),
            data.get('endereco_label'),
            data.get('endereco_rua'),
            data.get('endereco_numero'),
            data.get('endereco_complemento'),
            data.get('endereco_bairro'),
            data.get('endereco_cep'),
            data.get('modulo', 'Cardapio'),
            data.get('observacao'),
            data.get('valor_entrega', 0),
            created_at,
            created_at
        ))
        conn.commit()
        
        return get_pedido_by_id(pedido_id)


def update_pedido(pedido_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um pedido existente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        current = get_pedido_by_id(pedido_id)
        if not current:
            return None
        
        updated_at = datetime.now(timezone.utc).isoformat()
        
        # Campos que podem ser atualizados
        status = data.get('status', current.get('status'))
        observacao = data.get('observacao', current.get('observacao'))
        
        cursor.execute('''
            UPDATE pedidos SET status = ?, observacao = ?, updated_at = ?
            WHERE id = ?
        ''', (status, observacao, updated_at, pedido_id))
        conn.commit()
        
        return get_pedido_by_id(pedido_id)


def update_pedido_status(pedido_id: str, status: str) -> Optional[Dict]:
    """Atualiza o status de um pedido"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        updated_at = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            UPDATE pedidos SET status = ?, updated_at = ?
            WHERE id = ?
        ''', (status, updated_at, pedido_id))
        conn.commit()
        
        return get_pedido_by_id(pedido_id)


def delete_pedido(pedido_id: str) -> bool:
    """Deleta um pedido"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pedidos WHERE id = ?", (pedido_id,))
        conn.commit()
        return cursor.rowcount > 0


def cancel_pedido(pedido_id: str, motivo: str) -> Optional[Dict]:
    """Cancela um pedido com motivo obrigatório"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute('''
            UPDATE pedidos SET status = 'cancelado', motivo_cancelamento = ?, updated_at = ?
            WHERE id = ?
        ''', (motivo, now, pedido_id))
        conn.commit()
        return get_pedido_by_id(pedido_id)


def count_pedidos() -> int:
    """Conta o total de pedidos"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM pedidos")
        return cursor.fetchone()[0]


def get_pedidos_by_cliente(cliente_id: str) -> List[Dict]:
    """Retorna todos os pedidos de um cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY created_at DESC", (cliente_id,))
        pedidos = []
        for row in cursor.fetchall():
            p = dict(row)
            if p.get('items'):
                try:
                    p['items'] = json.loads(p['items'])
                except:
                    p['items'] = []
            p['troco_precisa'] = bool(p.get('troco_precisa', 0))
            pedidos.append(p)
        return pedidos


def get_pedidos_by_status(status: str) -> List[Dict]:
    """Retorna pedidos por status"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos WHERE status = ? ORDER BY created_at DESC", (status,))
        pedidos = []
        for row in cursor.fetchall():
            p = dict(row)
            if p.get('items'):
                try:
                    p['items'] = json.loads(p['items'])
                except:
                    p['items'] = []
            p['troco_precisa'] = bool(p.get('troco_precisa', 0))
            pedidos.append(p)
        return pedidos


def update_pedido_entregador(pedido_id: str, entregador_id: str, entregador_nome: str) -> Optional[Dict]:
    """Atribui um entregador a um pedido"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute('''
            UPDATE pedidos SET entregador_id = ?, entregador_nome = ?, updated_at = ?
            WHERE id = ?
        ''', (entregador_id, entregador_nome, now, pedido_id))
        conn.commit()
        return get_pedido_by_id(pedido_id)


# ==================== ENTREGADORES ====================
def get_all_entregadores() -> List[Dict]:
    """Retorna todos os entregadores ativos"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM entregadores WHERE ativo = 1 ORDER BY nome")
        return [dict(row) for row in cursor.fetchall()]


def get_entregador_by_id(entregador_id: str) -> Optional[Dict]:
    """Retorna um entregador pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM entregadores WHERE id = ?", (entregador_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_entregador(data: Dict) -> Dict:
    """Cria um novo entregador"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        entregador_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO entregadores (id, nome, telefone, ativo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            entregador_id,
            data.get('nome'),
            data.get('telefone'),
            1,
            created_at,
            created_at
        ))
        conn.commit()
        return get_entregador_by_id(entregador_id)


def update_entregador(entregador_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um entregador"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            UPDATE entregadores SET nome = ?, telefone = ?, updated_at = ?
            WHERE id = ?
        ''', (data.get('nome'), data.get('telefone'), now, entregador_id))
        conn.commit()
        return get_entregador_by_id(entregador_id)


def delete_entregador(entregador_id: str) -> bool:
    """Desativa um entregador (soft delete)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("UPDATE entregadores SET ativo = 0, updated_at = ? WHERE id = ?", (now, entregador_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_pedidos_by_entregador(entregador_id: str) -> List[Dict]:
    """Retorna todos os pedidos de um entregador"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM pedidos 
            WHERE entregador_id = ? AND status IN ('na_bag', 'em_rota')
            ORDER BY created_at DESC
        """, (entregador_id,))
        pedidos = []
        for row in cursor.fetchall():
            p = dict(row)
            if p.get('items'):
                try:
                    p['items'] = json.loads(p['items'])
                except:
                    p['items'] = []
            p['troco_precisa'] = bool(p.get('troco_precisa', 0))
            pedidos.append(p)
        return pedidos


# ==================== FUNCIONÁRIOS ====================
def get_all_funcionarios() -> List[Dict]:
    """Retorna todos os funcionários ativos com dados do cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT f.*, c.nome, c.telefone, c.email, c.foto
            FROM funcionarios f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE f.ativo = 1
            ORDER BY c.nome
        ''')
        return [dict(row) for row in cursor.fetchall()]


def get_funcionario_by_id(funcionario_id: str) -> Optional[Dict]:
    """Retorna um funcionário pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT f.*, c.nome, c.telefone, c.email, c.foto
            FROM funcionarios f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE f.id = ?
        ''', (funcionario_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_funcionario_by_cliente_id(cliente_id: str) -> Optional[Dict]:
    """Retorna um funcionário pelo ID do cliente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT f.*, c.nome, c.telefone, c.email, c.foto
            FROM funcionarios f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE f.cliente_id = ? AND f.ativo = 1
        ''', (cliente_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_funcionario(data: Dict) -> Dict:
    """Cria um novo funcionário"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        funcionario_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO funcionarios (id, cliente_id, cargo, ativo, created_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?)
        ''', (funcionario_id, data['cliente_id'], data['cargo'], now, now))
        conn.commit()
        
        # Se o cargo for Entregador, criar também na tabela de entregadores
        if data['cargo'].lower() == 'entregador':
            # Buscar dados do cliente
            cursor.execute("SELECT nome, telefone FROM clientes WHERE id = ?", (data['cliente_id'],))
            cliente = cursor.fetchone()
            if cliente:
                # Verificar se já existe um entregador com esse cliente_id
                cursor.execute("SELECT id FROM entregadores WHERE id = ?", (data['cliente_id'],))
                if not cursor.fetchone():
                    # Criar entregador usando o cliente_id como ID para fácil referência
                    cursor.execute('''
                        INSERT INTO entregadores (id, nome, telefone, ativo, created_at, updated_at)
                        VALUES (?, ?, ?, 1, ?, ?)
                    ''', (data['cliente_id'], cliente['nome'], cliente['telefone'], now, now))
                    conn.commit()
                else:
                    # Reativar entregador existente
                    cursor.execute("UPDATE entregadores SET ativo = 1, updated_at = ? WHERE id = ?", (now, data['cliente_id']))
                    conn.commit()
        
        return get_funcionario_by_id(funcionario_id)


def update_funcionario(funcionario_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um funcionário"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        # Buscar funcionário atual
        funcionario = get_funcionario_by_id(funcionario_id)
        if not funcionario:
            return None
        
        cargo_antigo = funcionario['cargo']
        novo_cargo = data.get('cargo', cargo_antigo)
        
        cursor.execute('''
            UPDATE funcionarios SET cargo = ?, updated_at = ?
            WHERE id = ?
        ''', (novo_cargo, now, funcionario_id))
        conn.commit()
        
        # Se mudou de/para Entregador, atualizar tabela de entregadores
        cliente_id = funcionario['cliente_id']
        
        if cargo_antigo.lower() == 'entregador' and novo_cargo.lower() != 'entregador':
            # Remover dos entregadores
            cursor.execute("UPDATE entregadores SET ativo = 0, updated_at = ? WHERE id = ?", (now, cliente_id))
            conn.commit()
        elif cargo_antigo.lower() != 'entregador' and novo_cargo.lower() == 'entregador':
            # Adicionar aos entregadores
            cursor.execute("SELECT nome, telefone FROM clientes WHERE id = ?", (cliente_id,))
            cliente = cursor.fetchone()
            if cliente:
                cursor.execute("SELECT id FROM entregadores WHERE id = ?", (cliente_id,))
                if not cursor.fetchone():
                    cursor.execute('''
                        INSERT INTO entregadores (id, nome, telefone, ativo, created_at, updated_at)
                        VALUES (?, ?, ?, 1, ?, ?)
                    ''', (cliente_id, cliente['nome'], cliente['telefone'], now, now))
                else:
                    cursor.execute("UPDATE entregadores SET ativo = 1, updated_at = ? WHERE id = ?", (now, cliente_id))
                conn.commit()
        
        return get_funcionario_by_id(funcionario_id)


def delete_funcionario(funcionario_id: str) -> bool:
    """Desativa um funcionário (soft delete)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        # Buscar funcionário
        funcionario = get_funcionario_by_id(funcionario_id)
        if not funcionario:
            return False
        
        # Se for entregador, desativar também na tabela de entregadores
        if funcionario['cargo'].lower() == 'entregador':
            cursor.execute("UPDATE entregadores SET ativo = 0, updated_at = ? WHERE id = ?", (now, funcionario['cliente_id']))
        
        cursor.execute("UPDATE funcionarios SET ativo = 0, updated_at = ? WHERE id = ?", (now, funcionario_id))
        conn.commit()
        return cursor.rowcount > 0


def get_funcionarios_by_cargo(cargo: str) -> List[Dict]:
    """Retorna todos os funcionários de um cargo específico"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT f.*, c.nome, c.telefone, c.email, c.foto
            FROM funcionarios f
            JOIN clientes c ON f.cliente_id = c.id
            WHERE f.cargo = ? AND f.ativo = 1
            ORDER BY c.nome
        ''', (cargo,))
        return [dict(row) for row in cursor.fetchall()]


# ==================== BAIRROS ====================
def get_all_bairros() -> List[Dict]:
    """Retorna todos os bairros ativos"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bairros WHERE ativo = 1 ORDER BY nome")
        return [dict(row) for row in cursor.fetchall()]


def get_bairro_by_id(bairro_id: str) -> Optional[Dict]:
    """Retorna um bairro pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bairros WHERE id = ?", (bairro_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_bairro_by_nome(nome: str) -> Optional[Dict]:
    """Retorna um bairro pelo nome"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bairros WHERE nome = ? AND ativo = 1", (nome,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_bairro(data: Dict) -> Dict:
    """Cria um novo bairro"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        bairro_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO bairros (id, nome, valor_entrega, cep, ativo, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?)
        ''', (bairro_id, data['nome'], data.get('valor_entrega', 0), data.get('cep'), now, now))
        conn.commit()
        
        return get_bairro_by_id(bairro_id)


def update_bairro(bairro_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um bairro"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        updates = []
        values = []
        
        if 'nome' in data:
            updates.append("nome = ?")
            values.append(data['nome'])
        if 'valor_entrega' in data:
            updates.append("valor_entrega = ?")
            values.append(data['valor_entrega'])
        if 'cep' in data:
            updates.append("cep = ?")
            values.append(data['cep'])
        
        if updates:
            updates.append("updated_at = ?")
            values.append(now)
            values.append(bairro_id)
            
            cursor.execute(f"UPDATE bairros SET {', '.join(updates)} WHERE id = ?", values)
            conn.commit()
        
        return get_bairro_by_id(bairro_id)


def update_all_bairros_valor(valor_entrega: float) -> int:
    """Atualiza o valor de entrega de todos os bairros"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute("UPDATE bairros SET valor_entrega = ?, updated_at = ? WHERE ativo = 1", (valor_entrega, now))
        conn.commit()
        return cursor.rowcount


def update_all_bairros_cep(cep: str) -> int:
    """Atualiza o CEP de todos os bairros (CEP único)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute("UPDATE bairros SET cep = ?, updated_at = ? WHERE ativo = 1", (cep, now))
        conn.commit()
        return cursor.rowcount


def delete_bairro(bairro_id: str) -> bool:
    """Remove um bairro (soft delete)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        # Verificar se tem ruas ou clientes usando este bairro
        cursor.execute("SELECT COUNT(*) FROM ruas WHERE bairro_id = ?", (bairro_id,))
        ruas_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM clientes WHERE endereco_bairro = (SELECT nome FROM bairros WHERE id = ?)", (bairro_id,))
        clientes_count = cursor.fetchone()[0]
        
        if ruas_count > 0 or clientes_count > 0:
            return False  # Não pode deletar bairro em uso
        
        cursor.execute("UPDATE bairros SET ativo = 0, updated_at = ? WHERE id = ?", (now, bairro_id))
        conn.commit()
        return cursor.rowcount > 0


def check_bairros_have_cep() -> bool:
    """Verifica se algum bairro tem CEP preenchido"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM bairros WHERE cep IS NOT NULL AND cep != '' AND ativo = 1")
        return cursor.fetchone()[0] > 0


# ==================== RUAS ====================
def get_all_ruas() -> List[Dict]:
    """Retorna todas as ruas com dados do bairro"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.*, b.nome as bairro_nome, b.valor_entrega, b.cep as bairro_cep
            FROM ruas r
            LEFT JOIN bairros b ON r.bairro_id = b.id
            ORDER BY r.nome
        ''')
        return [dict(row) for row in cursor.fetchall()]


def get_rua_by_id(rua_id: str) -> Optional[Dict]:
    """Retorna uma rua pelo ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.*, b.nome as bairro_nome, b.valor_entrega, b.cep as bairro_cep
            FROM ruas r
            LEFT JOIN bairros b ON r.bairro_id = b.id
            WHERE r.id = ?
        ''', (rua_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_rua_by_nome(nome: str) -> Optional[Dict]:
    """Retorna uma rua pelo nome"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.*, b.nome as bairro_nome, b.valor_entrega, b.cep as bairro_cep
            FROM ruas r
            LEFT JOIN bairros b ON r.bairro_id = b.id
            WHERE r.nome = ?
        ''', (nome,))
        row = cursor.fetchone()
        return dict(row) if row else None


def search_ruas(termo: str) -> List[Dict]:
    """Busca ruas pelo nome"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT r.*, b.nome as bairro_nome, b.valor_entrega, b.cep as bairro_cep
            FROM ruas r
            LEFT JOIN bairros b ON r.bairro_id = b.id
            WHERE r.nome LIKE ?
            ORDER BY r.nome
            LIMIT 10
        ''', (f"%{termo}%",))
        return [dict(row) for row in cursor.fetchall()]


def create_rua(data: Dict) -> Dict:
    """Cria uma nova rua"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        rua_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute('''
            INSERT INTO ruas (id, nome, bairro_id, cep, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (rua_id, data['nome'], data.get('bairro_id'), data.get('cep'), now, now))
        conn.commit()
        
        return get_rua_by_id(rua_id)


def update_rua(rua_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza uma rua"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        updates = []
        values = []
        
        if 'nome' in data:
            updates.append("nome = ?")
            values.append(data['nome'])
        if 'bairro_id' in data:
            updates.append("bairro_id = ?")
            values.append(data['bairro_id'])
        if 'cep' in data:
            updates.append("cep = ?")
            values.append(data['cep'])
        
        if updates:
            updates.append("updated_at = ?")
            values.append(now)
            values.append(rua_id)
            
            cursor.execute(f"UPDATE ruas SET {', '.join(updates)} WHERE id = ?", values)
            conn.commit()
        
        return get_rua_by_id(rua_id)


def delete_rua(rua_id: str) -> bool:
    """Remove uma rua"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM ruas WHERE id = ?", (rua_id,))
        conn.commit()
        return cursor.rowcount > 0


def get_or_create_rua(nome: str, bairro_id: str = None, cep: str = None) -> Dict:
    """Obtém ou cria uma rua pelo nome"""
    existing = get_rua_by_nome(nome)
    if existing:
        return existing
    return create_rua({'nome': nome, 'bairro_id': bairro_id, 'cep': cep})


def get_or_create_bairro(nome: str, valor_entrega: float = 0, cep: str = None) -> Dict:
    """Obtém ou cria um bairro pelo nome"""
    existing = get_bairro_by_nome(nome)
    if existing:
        return existing
    return create_bairro({'nome': nome, 'valor_entrega': valor_entrega, 'cep': cep})


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
                SET is_open = ?, opening_time = ?, closing_time = ?, 
                    has_second_period = ?, opening_time_2 = ?, closing_time_2 = ?,
                    updated_at = ?
                WHERE day_of_week = ?
            ''', (
                1 if hour.get('is_open', True) else 0,
                hour.get('opening_time', '08:00'),
                hour.get('closing_time', '22:00'),
                1 if hour.get('has_second_period', False) else 0,
                hour.get('opening_time_2', '18:00'),
                hour.get('closing_time_2', '23:59'),
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
            SET is_open = ?, opening_time = ?, closing_time = ?, 
                has_second_period = ?, opening_time_2 = ?, closing_time_2 = ?,
                updated_at = ?
            WHERE day_of_week = ?
        ''', (
            1 if data.get('is_open', True) else 0,
            data.get('opening_time', '08:00'),
            data.get('closing_time', '22:00'),
            1 if data.get('has_second_period', False) else 0,
            data.get('opening_time_2', '18:00'),
            data.get('closing_time_2', '23:59'),
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


# ==================== DECISION TREE (ÁRVORE DE DECISÃO) ====================
def get_all_decision_nodes() -> List[Dict]:
    """Retorna todos os nós da árvore de decisão"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM decision_tree ORDER BY parent_id NULLS FIRST, "order" ASC')
        return [dict(row) for row in cursor.fetchall()]


def get_decision_node(node_id: str) -> Optional[Dict]:
    """Retorna um nó específico"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM decision_tree WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_decision_nodes_by_parent(parent_id: Optional[str]) -> List[Dict]:
    """Retorna nós filhos de um nó pai"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        if parent_id is None:
            cursor.execute('SELECT * FROM decision_tree WHERE parent_id IS NULL ORDER BY "order" ASC')
        else:
            cursor.execute('SELECT * FROM decision_tree WHERE parent_id = ? ORDER BY "order" ASC', (parent_id,))
        return [dict(row) for row in cursor.fetchall()]


def create_decision_node(data: Dict) -> Dict:
    """Cria um novo nó na árvore de decisão"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO decision_tree (id, trigger, response, parent_id, "order", is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['trigger'],
            data['response'],
            data.get('parent_id'),
            data.get('order', 0),
            1 if data.get('is_active', True) else 0,
            data.get('created_at'),
            data.get('updated_at')
        ))
        conn.commit()
        return get_decision_node(data['id'])


def update_decision_node(node_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um nó existente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        set_parts = []
        values = []
        
        if 'trigger' in data:
            set_parts.append('trigger = ?')
            values.append(data['trigger'])
        if 'response' in data:
            set_parts.append('response = ?')
            values.append(data['response'])
        if 'parent_id' in data:
            set_parts.append('parent_id = ?')
            values.append(data['parent_id'])
        if 'order' in data:
            set_parts.append('"order" = ?')
            values.append(data['order'])
        if 'is_active' in data:
            set_parts.append('is_active = ?')
            values.append(1 if data['is_active'] else 0)
        if 'updated_at' in data:
            set_parts.append('updated_at = ?')
            values.append(data['updated_at'])
        
        if not set_parts:
            return get_decision_node(node_id)
        
        values.append(node_id)
        cursor.execute(f"UPDATE decision_tree SET {', '.join(set_parts)} WHERE id = ?", values)
        conn.commit()
        return get_decision_node(node_id)


def delete_decision_node(node_id: str) -> bool:
    """Deleta um nó (sem filhos)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM decision_tree WHERE id = ?", (node_id,))
        conn.commit()
        return cursor.rowcount > 0


def delete_decision_node_and_children(node_id: str) -> bool:
    """Deleta um nó e todos os seus filhos recursivamente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Função recursiva para coletar IDs de filhos
        def get_all_children_ids(parent_id):
            cursor.execute("SELECT id FROM decision_tree WHERE parent_id = ?", (parent_id,))
            children = [row[0] for row in cursor.fetchall()]
            all_ids = list(children)
            for child_id in children:
                all_ids.extend(get_all_children_ids(child_id))
            return all_ids
        
        # Coletar todos os IDs a serem deletados
        ids_to_delete = [node_id] + get_all_children_ids(node_id)
        
        # Deletar todos
        for id_to_delete in ids_to_delete:
            cursor.execute("DELETE FROM decision_tree WHERE id = ?", (id_to_delete,))
        
        conn.commit()
        return True


def find_decision_node_by_trigger(trigger: str) -> Optional[Dict]:
    """Encontra um nó pelo gatilho (trigger) - para uso no chatbot"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        # Busca case-insensitive


# ==================== KEYWORD RESPONSES ====================
def get_all_keyword_responses() -> List[Dict]:
    """Retorna todas as respostas por palavras-chave"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM keyword_responses ORDER BY priority DESC, created_at ASC")
        return [dict(row) for row in cursor.fetchall()]


def get_keyword_response(response_id: str) -> Optional[Dict]:
    """Retorna uma resposta específica por ID"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM keyword_responses WHERE id = ?", (response_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_keyword_response(data: Dict) -> Dict:
    """Cria uma nova resposta por palavra-chave"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        response_id = data.get('id', str(uuid.uuid4()))
        
        cursor.execute('''
            INSERT INTO keyword_responses (id, keywords, response, is_active, priority, match_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            response_id,
            data['keywords'],
            data['response'],
            1 if data.get('is_active', True) else 0,
            data.get('priority', 0),
            data.get('match_type', 'contains'),
            now,
            now
        ))
        conn.commit()
        return get_keyword_response(response_id)


def update_keyword_response(response_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza uma resposta existente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        # Construir update dinâmico
        updates = []
        values = []
        
        if 'keywords' in data:
            updates.append("keywords = ?")
            values.append(data['keywords'])
        if 'response' in data:
            updates.append("response = ?")
            values.append(data['response'])
        if 'is_active' in data:
            updates.append("is_active = ?")
            values.append(1 if data['is_active'] else 0)
        if 'priority' in data:
            updates.append("priority = ?")
            values.append(data['priority'])
        if 'match_type' in data:
            updates.append("match_type = ?")
            values.append(data['match_type'])
        
        updates.append("updated_at = ?")
        values.append(now)
        values.append(response_id)
        
        cursor.execute(f'''
            UPDATE keyword_responses SET {', '.join(updates)} WHERE id = ?
        ''', values)
        conn.commit()
        
        return get_keyword_response(response_id)


def delete_keyword_response(response_id: str) -> bool:
    """Deleta uma resposta por palavra-chave"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM keyword_responses WHERE id = ?", (response_id,))
        conn.commit()
        return cursor.rowcount > 0


def find_keyword_response_for_message(message: str) -> Optional[Dict]:
    """
    Busca uma resposta automática baseada nas palavras-chave da mensagem.
    Retorna a resposta com maior prioridade que corresponda.
    """
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM keyword_responses 
            WHERE is_active = 1 
            ORDER BY priority DESC, created_at ASC
        """)
        responses = [dict(row) for row in cursor.fetchall()]
        
        message_lower = message.lower().strip()
        
        for resp in responses:
            keywords = [k.strip().lower() for k in resp['keywords'].split(',')]
            match_type = resp.get('match_type', 'contains')
            
            for keyword in keywords:
                if not keyword:
                    continue
                    
                if match_type == 'exact':
                    # Correspondência exata da mensagem inteira
                    if message_lower == keyword:
                        return resp
                elif match_type == 'word':
                    # Palavra inteira presente na mensagem
                    import re
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, message_lower):
                        return resp
                else:  # contains (padrão)
                    # Palavra-chave contida na mensagem
                    if keyword in message_lower:
                        return resp
        
        return None


# ==================== WHATSAPP STATS ====================
def get_whatsapp_stats() -> Dict:
    """Retorna as estatísticas do WhatsApp"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Buscar estatísticas gerais
        cursor.execute("SELECT * FROM whatsapp_stats WHERE id = 'main'")
        row = cursor.fetchone()
        stats = dict(row) if row else {"messages_received": 0, "messages_sent": 0}
        
        # Contar clientes únicos atendidos
        cursor.execute("SELECT COUNT(*) FROM whatsapp_clients")
        stats["clients_served"] = cursor.fetchone()[0]
        
        return stats


def increment_whatsapp_stat(stat_type: str, amount: int = 1) -> bool:
    """Incrementa uma estatística do WhatsApp (messages_received ou messages_sent)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        if stat_type == "messages_received":
            cursor.execute("""
                UPDATE whatsapp_stats 
                SET messages_received = messages_received + ?, updated_at = ?
                WHERE id = 'main'
            """, (amount, now))
        elif stat_type == "messages_sent":
            cursor.execute("""
                UPDATE whatsapp_stats 
                SET messages_sent = messages_sent + ?, updated_at = ?
                WHERE id = 'main'
            """, (amount, now))
        
        conn.commit()
        return cursor.rowcount > 0


def register_whatsapp_client(phone: str, name: str = None) -> Dict:
    """Registra ou atualiza um cliente do WhatsApp"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        # Verificar se cliente já existe
        cursor.execute("SELECT * FROM whatsapp_clients WHERE phone = ?", (phone,))
        existing = cursor.fetchone()
        
        if existing:
            # Atualizar cliente existente
            cursor.execute("""
                UPDATE whatsapp_clients 
                SET last_contact = ?, messages_count = messages_count + 1, name = COALESCE(?, name)
                WHERE phone = ?
            """, (now, name, phone))
        else:
            # Criar novo cliente
            cursor.execute("""
                INSERT INTO whatsapp_clients (phone, name, first_contact, last_contact, messages_count)
                VALUES (?, ?, ?, ?, 1)
            """, (phone, name, now, now))
        
        conn.commit()
        
        # Retornar dados do cliente
        cursor.execute("SELECT * FROM whatsapp_clients WHERE phone = ?", (phone,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_all_whatsapp_clients() -> List[Dict]:
    """Retorna todos os clientes do WhatsApp"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM whatsapp_clients ORDER BY last_contact DESC")
        return [dict(row) for row in cursor.fetchall()]


def reset_whatsapp_stats() -> bool:
    """Reseta as estatísticas do WhatsApp"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        
        cursor.execute("""
            UPDATE whatsapp_stats 
            SET messages_received = 0, messages_sent = 0, updated_at = ?
            WHERE id = 'main'
        """, (now,))
        
        cursor.execute("DELETE FROM whatsapp_clients")
        conn.commit()
        return True


# ==================== CHATBOT FLOW NODES ====================
def get_all_flow_nodes() -> List[Dict]:
    """Retorna todos os nós do fluxograma"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chatbot_flow_nodes ORDER BY created_at ASC")
        return [dict(row) for row in cursor.fetchall()]


def get_flow_node(node_id: str) -> Optional[Dict]:
    """Retorna um nó específico"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chatbot_flow_nodes WHERE id = ?", (node_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_flow_node(data: Dict) -> Dict:
    """Cria um novo nó no fluxograma"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO chatbot_flow_nodes (id, type, title, content, position_x, position_y, config, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['type'],
            data['title'],
            data.get('content', ''),
            data.get('position_x', 0),
            data.get('position_y', 0),
            data.get('config', '{}'),
            1 if data.get('is_active', True) else 0,
            data.get('created_at'),
            data.get('updated_at')
        ))
        conn.commit()
        return get_flow_node(data['id'])


def update_flow_node(node_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza um nó existente"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        set_parts = []
        values = []
        
        for key in ['type', 'title', 'content', 'position_x', 'position_y', 'config', 'updated_at']:
            if key in data:
                set_parts.append(f'{key} = ?')
                values.append(data[key])
        
        if 'is_active' in data:
            set_parts.append('is_active = ?')
            values.append(1 if data['is_active'] else 0)
        
        if not set_parts:
            return get_flow_node(node_id)
        
        values.append(node_id)
        cursor.execute(f"UPDATE chatbot_flow_nodes SET {', '.join(set_parts)} WHERE id = ?", values)
        conn.commit()
        return get_flow_node(node_id)


def delete_flow_node(node_id: str) -> bool:
    """Deleta um nó e suas conexões"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        # Deletar conexões relacionadas
        cursor.execute("DELETE FROM chatbot_flow_edges WHERE source_id = ? OR target_id = ?", (node_id, node_id))
        cursor.execute("DELETE FROM chatbot_flow_nodes WHERE id = ?", (node_id,))
        conn.commit()
        return cursor.rowcount > 0


# ==================== CHATBOT FLOW EDGES ====================
def get_all_flow_edges() -> List[Dict]:
    """Retorna todas as conexões do fluxograma"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chatbot_flow_edges")
        return [dict(row) for row in cursor.fetchall()]


def create_flow_edge(data: Dict) -> Dict:
    """Cria uma nova conexão"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO chatbot_flow_edges (id, source_id, target_id, condition, label, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['source_id'],
            data['target_id'],
            data.get('condition', ''),
            data.get('label', ''),
            data.get('created_at')
        ))
        conn.commit()
        return data


def delete_flow_edge(edge_id: str) -> bool:
    """Deleta uma conexão"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chatbot_flow_edges WHERE id = ?", (edge_id,))
        conn.commit()
        return cursor.rowcount > 0


# ==================== CHATBOT CONVERSATIONS ====================
def get_conversation_by_phone(phone: str) -> Optional[Dict]:
    """Busca conversa ativa por telefone"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM chatbot_conversations 
            WHERE phone = ? AND status = 'active'
            ORDER BY updated_at DESC LIMIT 1
        """, (phone,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_conversation(data: Dict) -> Dict:
    """Cria uma nova conversa"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO chatbot_conversations (id, phone, client_name, client_id, status, current_node_id, context, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['phone'],
            data.get('client_name', ''),
            data.get('client_id'),
            data.get('status', 'active'),
            data.get('current_node_id'),
            data.get('context', '{}'),
            data.get('created_at'),
            data.get('updated_at')
        ))
        conn.commit()
        return data


def update_conversation(conv_id: str, data: Dict) -> Optional[Dict]:
    """Atualiza uma conversa"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        set_parts = []
        values = []
        
        for key in ['client_name', 'client_id', 'status', 'current_node_id', 'context', 'updated_at']:
            if key in data:
                set_parts.append(f'{key} = ?')
                values.append(data[key])
        
        if not set_parts:
            return None
        
        values.append(conv_id)
        cursor.execute(f"UPDATE chatbot_conversations SET {', '.join(set_parts)} WHERE id = ?", values)
        conn.commit()
        
        cursor.execute("SELECT * FROM chatbot_conversations WHERE id = ?", (conv_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_conversation_messages(conv_id: str, limit: int = 20) -> List[Dict]:
    """Retorna mensagens de uma conversa"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM chatbot_messages 
            WHERE conversation_id = ?
            ORDER BY created_at DESC LIMIT ?
        """, (conv_id, limit))
        messages = [dict(row) for row in cursor.fetchall()]
        messages.reverse()  # Ordenar do mais antigo para o mais recente
        return messages


def add_conversation_message(data: Dict) -> Dict:
    """Adiciona mensagem a uma conversa"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO chatbot_messages (id, conversation_id, role, content, node_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['id'],
            data['conversation_id'],
            data['role'],
            data['content'],
            data.get('node_id'),
            data.get('created_at')
        ))
        conn.commit()
        return data


# ==================== CHATBOT SETTINGS ====================
def get_chatbot_setting(key: str) -> Optional[str]:
    """Retorna uma configuração do chatbot"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM chatbot_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        return row[0] if row else None


def set_chatbot_setting(key: str, value: str) -> bool:
    """Define uma configuração do chatbot"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO chatbot_settings (key, value, updated_at)
            VALUES (?, ?, ?)
        ''', (key, value, datetime.now(timezone.utc).isoformat()))
        conn.commit()
        return True


def get_all_chatbot_settings() -> Dict[str, str]:
    """Retorna todas as configurações do chatbot"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM chatbot_settings")
        return {row[0]: row[1] for row in cursor.fetchall()}


# ==================== ANALYTICS DE PALAVRAS E FRASES ====================
def process_message_words(message: str, sender_phone: str, sender_name: str = None) -> None:
    """Processa uma mensagem e contabiliza palavras e frases"""
    import re
    from datetime import datetime
    import uuid
    
    # Limpar e tokenizar a mensagem
    # Remove pontuação e converte para minúsculas
    words = re.findall(r'\b[a-záàâãéèêíïóôõöúçñ]+\b', message.lower())
    
    # Palavras comuns a ignorar (stop words em português)
    stop_words = {
        'a', 'o', 'e', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com', 'não', 'nao',
        'que', 'os', 'as', 'dos', 'das', 'no', 'na', 'por', 'mais', 'se', 'já', 'ja',
        'ou', 'quando', 'muito', 'nos', 'nas', 'esse', 'essa', 'isso', 'este', 'esta',
        'isto', 'aquele', 'aquela', 'aquilo', 'ele', 'ela', 'eles', 'elas', 'você', 'voce',
        'eu', 'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa', 'me', 'te', 'lhe', 'nos',
        'mas', 'como', 'qual', 'quais', 'onde', 'porque', 'pq', 'tb', 'tbm', 'vc',
        'ai', 'aí', 'la', 'lá', 'aqui', 'ali', 'sim', 'nao', 'ok', 'ta', 'tá',
        'oi', 'ola', 'olá', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado', 'obrigada',
        'por', 'favor', 'pfv', 'pf', 'blz', 'beleza', 'né', 'ne', 'então', 'entao'
    }
    
    # Filtrar palavras curtas e stop words
    filtered_words = [w for w in words if len(w) > 2 and w not in stop_words]
    
    # Gerar bigramas (2 palavras) e trigramas (3 palavras)
    bigrams = []
    trigrams = []
    
    # Para frases, usar todas as palavras (não filtradas) para manter contexto
    all_words = [w for w in words if len(w) > 1]
    
    for i in range(len(all_words) - 1):
        bigram = f"{all_words[i]} {all_words[i+1]}"
        # Só adicionar se pelo menos uma palavra não for stop word
        if all_words[i] not in stop_words or all_words[i+1] not in stop_words:
            bigrams.append(bigram)
    
    for i in range(len(all_words) - 2):
        trigram = f"{all_words[i]} {all_words[i+1]} {all_words[i+2]}"
        # Só adicionar se pelo menos uma palavra não for stop word
        if any(w not in stop_words for w in [all_words[i], all_words[i+1], all_words[i+2]]):
            trigrams.append(trigram)
    
    now = datetime.utcnow().isoformat() + "Z"
    
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Salvar mensagem no histórico
        msg_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO whatsapp_messages (id, sender_phone, sender_name, message, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (msg_id, sender_phone, sender_name, message, now))
        
        # Processar palavras individuais
        for word in filtered_words:
            _update_word_count(cursor, word, "word", sender_phone, now)
        
        # Processar bigramas
        for bigram in bigrams:
            _update_word_count(cursor, bigram, "bigram", sender_phone, now)
        
        # Processar trigramas
        for trigram in trigrams:
            _update_word_count(cursor, trigram, "trigram", sender_phone, now)
        
        conn.commit()


def _update_word_count(cursor, text: str, text_type: str, sender_phone: str, now: str):
    """Atualiza contagem de uma palavra/frase"""
    import uuid
    
    cursor.execute(
        "SELECT id, count, sender_phones FROM word_analytics WHERE word = ? AND type = ?", 
        (text, text_type)
    )
    row = cursor.fetchone()
    
    if row:
        word_id = row[0]
        new_count = row[1] + 1
        phones = row[2] or ""
        if sender_phone not in phones:
            phones = f"{phones},{sender_phone}" if phones else sender_phone
        
        cursor.execute('''
            UPDATE word_analytics 
            SET count = ?, last_used = ?, sender_phones = ?, updated_at = ?
            WHERE id = ?
        ''', (new_count, now, phones, now, word_id))
    else:
        word_id = str(uuid.uuid4())
        cursor.execute('''
            INSERT INTO word_analytics (id, word, type, count, first_used, last_used, sender_phones, created_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
        ''', (word_id, text, text_type, now, now, sender_phone, now, now))


def get_word_analytics(limit: int = 100, order_by: str = "count", text_type: str = "all") -> List[Dict]:
    """Retorna analytics de palavras/frases ordenadas"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        valid_orders = {"count": "count DESC", "word": "word ASC", "last_used": "last_used DESC"}
        order = valid_orders.get(order_by, "count DESC")
        
        if text_type == "all":
            cursor.execute(f'''
                SELECT id, word, COALESCE(type, 'word') as type, count, first_used, last_used, sender_phones, created_at
                FROM word_analytics
                ORDER BY {order}
                LIMIT ?
            ''', (limit,))
        else:
            cursor.execute(f'''
                SELECT id, word, COALESCE(type, 'word') as type, count, first_used, last_used, sender_phones, created_at
                FROM word_analytics
                WHERE type = ?
                ORDER BY {order}
                LIMIT ?
            ''', (text_type, limit))
        
        results = []
        for row in cursor.fetchall():
            phones = row[6].split(",") if row[6] else []
            results.append({
                "id": row[0],
                "word": row[1],
                "type": row[2],
                "count": row[3],
                "first_used": row[4],
                "last_used": row[5],
                "unique_senders": len(set(phones)),
                "created_at": row[7]
            })
        return results


def get_word_analytics_summary() -> Dict:
    """Retorna resumo geral das analytics"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Total de palavras únicas
        cursor.execute("SELECT COUNT(*) FROM word_analytics WHERE type = 'word' OR type IS NULL")
        total_words = cursor.fetchone()[0]
        
        # Total de frases únicas (bigramas + trigramas)
        cursor.execute("SELECT COUNT(*) FROM word_analytics WHERE type IN ('bigram', 'trigram')")
        total_phrases = cursor.fetchone()[0]
        
        # Total de ocorrências
        cursor.execute("SELECT SUM(count) FROM word_analytics")
        total_occurrences = cursor.fetchone()[0] or 0
        
        # Total de mensagens
        cursor.execute("SELECT COUNT(*) FROM whatsapp_messages")
        total_messages = cursor.fetchone()[0]
        
        # Clientes únicos
        cursor.execute("SELECT COUNT(DISTINCT sender_phone) FROM whatsapp_messages")
        unique_senders = cursor.fetchone()[0]
        
        # Top 10 palavras
        cursor.execute('''
            SELECT word, count FROM word_analytics
            WHERE type = 'word' OR type IS NULL
            ORDER BY count DESC
            LIMIT 10
        ''')
        top_words = [{"word": row[0], "count": row[1]} for row in cursor.fetchall()]
        
        # Top 10 frases (bigramas e trigramas)
        cursor.execute('''
            SELECT word, count, type FROM word_analytics
            WHERE type IN ('bigram', 'trigram')
            ORDER BY count DESC
            LIMIT 10
        ''')
        top_phrases = [{"phrase": row[0], "count": row[1], "type": row[2]} for row in cursor.fetchall()]
        
        # Palavras por dia (últimos 7 dias)
        cursor.execute('''
            SELECT DATE(created_at) as day, COUNT(*) as messages
            FROM whatsapp_messages
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY day DESC
        ''')
        messages_by_day = [{"day": row[0], "count": row[1]} for row in cursor.fetchall()]
        
        return {
            "total_unique_words": total_words,
            "total_unique_phrases": total_phrases,
            "total_word_occurrences": total_occurrences,
            "total_messages": total_messages,
            "unique_senders": unique_senders,
            "top_words": top_words,
            "top_phrases": top_phrases,
            "messages_by_day": messages_by_day
        }


def get_recent_messages(limit: int = 50) -> List[Dict]:
    """Retorna mensagens recentes"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, sender_phone, sender_name, message, response, created_at
            FROM whatsapp_messages
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
        return [dict(row) for row in cursor.fetchall()]


def clear_word_analytics() -> int:
    """Limpa todos os dados de analytics"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM word_analytics")
        count = cursor.fetchone()[0]
        
        cursor.execute("DELETE FROM word_analytics")
        cursor.execute("DELETE FROM whatsapp_messages")
        conn.commit()
        
        return count


# ==================== FUNÇÕES DE LIMPEZA DE DADOS ====================
def clear_products_and_ingredients() -> int:
    """Limpa produtos, ingredientes e dados relacionados"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        total = 0
        
        # Contar antes de deletar
        cursor.execute("SELECT COUNT(*) FROM products")
        total += cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM ingredients")
        total += cursor.fetchone()[0]
        
        # Deletar em ordem correta (dependências primeiro)
        cursor.execute("DELETE FROM purchase_items")
        cursor.execute("DELETE FROM purchases")
        cursor.execute("DELETE FROM price_history")
        cursor.execute("DELETE FROM ingredient_history")
        cursor.execute("DELETE FROM product_ingredients")
        cursor.execute("DELETE FROM products")
        cursor.execute("DELETE FROM ingredients")
        cursor.execute("DELETE FROM categories")
        
        conn.commit()
        return total


def clear_sales_data() -> int:
    """Limpa vendas e pedidos"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        total = 0
        
        # Contar antes de deletar
        cursor.execute("SELECT COUNT(*) FROM pedidos")
        total += cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM pedido_items")
        total += cursor.fetchone()[0]
        
        # Deletar
        cursor.execute("DELETE FROM pedido_items")
        cursor.execute("DELETE FROM pedidos")
        
        conn.commit()
        return total


def clear_people_data() -> int:
    """Limpa clientes, fornecedores e entregadores"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        total = 0
        
        # Contar antes de deletar
        cursor.execute("SELECT COUNT(*) FROM clientes")
        total += cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM fornecedores")
        total += cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM entregadores")
        total += cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM funcionarios")
        total += cursor.fetchone()[0]
        
        # Deletar (manter apenas usuários do sistema)
        cursor.execute("DELETE FROM client_addresses")
        cursor.execute("DELETE FROM clientes")
        cursor.execute("DELETE FROM fornecedores")
        cursor.execute("DELETE FROM entregadores")
        cursor.execute("DELETE FROM funcionarios")
        
        conn.commit()
        return total


def clear_financial_data() -> int:
    """Limpa dados financeiros (despesas, classificações)"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        total = 0
        
        # Contar antes de deletar
        cursor.execute("SELECT COUNT(*) FROM expenses")
        total += cursor.fetchone()[0]
        
        # Deletar
        cursor.execute("DELETE FROM expenses")
        # Manter classificações de despesas como estrutura base
        
        conn.commit()
        return total


def clear_locations_data() -> int:
    """Limpa bairros e ruas"""
    with db_lock:
        conn = get_connection()
        cursor = conn.cursor()
        total = 0
        
        # Contar antes de deletar
        cursor.execute("SELECT COUNT(*) FROM bairros")
        total += cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM ruas")
        total += cursor.fetchone()[0]
        
        # Deletar
        cursor.execute("DELETE FROM ruas")
        cursor.execute("DELETE FROM bairros")
        
        conn.commit()
        return total


# Inicializar banco ao importar o módulo
init_database()
