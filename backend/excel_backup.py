"""
Módulo de Backup em Excel
Salva e carrega dados automaticamente de uma planilha Excel
para garantir persistência mesmo após reinicializações do sistema.
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import json
import os

# Diretório para armazenar o backup
BACKUP_DIR = Path("/app/backend/data_backup")
BACKUP_FILE = BACKUP_DIR / "nucleo_backup.xlsx"

def ensure_backup_dir():
    """Garante que o diretório de backup existe"""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def save_ingredients(ingredients: list):
    """Salva ingredientes no Excel - NÃO sobrescreve se lista vazia e já existe backup"""
    ensure_backup_dir()
    
    # Se a lista está vazia e já existe backup, não sobrescrever
    if not ingredients and BACKUP_FILE.exists():
        try:
            existing_df = pd.read_excel(BACKUP_FILE, sheet_name='Ingredientes')
            if len(existing_df) > 0:
                print(f"[BACKUP] Ingredientes: lista vazia, mantendo backup existente com {len(existing_df)} itens")
                return
        except:
            pass
    
    df = pd.DataFrame(ingredients)
    
    # Carregar arquivo existente ou criar novo
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            existing_sheets = xls.sheet_names
    except FileNotFoundError:
        existing_sheets = []
    
    # Salvar mantendo outras abas
    if existing_sheets:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            all_data = {sheet: pd.read_excel(xls, sheet_name=sheet) for sheet in existing_sheets if sheet != 'Ingredientes'}
    else:
        all_data = {}
    
    all_data['Ingredientes'] = df
    
    with pd.ExcelWriter(BACKUP_FILE, engine='openpyxl') as writer:
        for sheet_name, data in all_data.items():
            data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"[BACKUP] Ingredientes salvos: {len(ingredients)} itens")

def save_products(products: list):
    """Salva produtos no Excel - NÃO sobrescreve se lista vazia e já existe backup"""
    ensure_backup_dir()
    
    # Se a lista está vazia e já existe backup, não sobrescrever
    if not products and BACKUP_FILE.exists():
        try:
            existing_df = pd.read_excel(BACKUP_FILE, sheet_name='Produtos')
            if len(existing_df) > 0:
                print(f"[BACKUP] Produtos: lista vazia, mantendo backup existente com {len(existing_df)} itens")
                return
        except:
            pass
    
    # Converter recipe e order_steps para JSON string para salvar no Excel
    products_to_save = []
    for p in products:
        p_copy = p.copy()
        if 'recipe' in p_copy and isinstance(p_copy['recipe'], list):
            p_copy['recipe'] = json.dumps(p_copy['recipe'])
        if 'order_steps' in p_copy and isinstance(p_copy['order_steps'], list):
            p_copy['order_steps'] = json.dumps(p_copy['order_steps'])
        products_to_save.append(p_copy)
    
    df = pd.DataFrame(products_to_save)
    
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            existing_sheets = xls.sheet_names
    except FileNotFoundError:
        existing_sheets = []
    
    if existing_sheets:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            all_data = {sheet: pd.read_excel(xls, sheet_name=sheet) for sheet in existing_sheets if sheet != 'Produtos'}
    else:
        all_data = {}
    
    all_data['Produtos'] = df
    
    with pd.ExcelWriter(BACKUP_FILE, engine='openpyxl') as writer:
        for sheet_name, data in all_data.items():
            data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"[BACKUP] Produtos salvos: {len(products)} itens")

def save_purchases(purchases: list):
    """Salva compras no Excel - NÃO sobrescreve se lista vazia e já existe backup"""
    ensure_backup_dir()
    
    # Se a lista está vazia e já existe backup, não sobrescrever
    if not purchases and BACKUP_FILE.exists():
        try:
            existing_df = pd.read_excel(BACKUP_FILE, sheet_name='Compras')
            if len(existing_df) > 0:
                print(f"[BACKUP] Compras: lista vazia, mantendo backup existente com {len(existing_df)} itens")
                return
        except:
            pass
    df = pd.DataFrame(purchases)
    
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            existing_sheets = xls.sheet_names
    except FileNotFoundError:
        existing_sheets = []
    
    if existing_sheets:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            all_data = {sheet: pd.read_excel(xls, sheet_name=sheet) for sheet in existing_sheets if sheet != 'Compras'}
    else:
        all_data = {}
    
    all_data['Compras'] = df
    
    with pd.ExcelWriter(BACKUP_FILE, engine='openpyxl') as writer:
        for sheet_name, data in all_data.items():
            data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"[BACKUP] Compras salvas: {len(purchases)} itens")

def save_categories(categories: list):
    """Salva categorias no Excel"""
    ensure_backup_dir()
    df = pd.DataFrame(categories)
    
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            existing_sheets = xls.sheet_names
    except FileNotFoundError:
        existing_sheets = []
    
    if existing_sheets:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            all_data = {sheet: pd.read_excel(xls, sheet_name=sheet) for sheet in existing_sheets if sheet != 'Categorias'}
    else:
        all_data = {}
    
    all_data['Categorias'] = df
    
    with pd.ExcelWriter(BACKUP_FILE, engine='openpyxl') as writer:
        for sheet_name, data in all_data.items():
            data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"[BACKUP] Categorias salvas: {len(categories)} itens")

def save_users(users: list):
    """Salva usuários no Excel (sem senhas em texto claro por segurança)"""
    ensure_backup_dir()
    df = pd.DataFrame(users)
    
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            existing_sheets = xls.sheet_names
    except FileNotFoundError:
        existing_sheets = []
    
    if existing_sheets:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            all_data = {sheet: pd.read_excel(xls, sheet_name=sheet) for sheet in existing_sheets if sheet != 'Usuarios'}
    else:
        all_data = {}
    
    all_data['Usuarios'] = df
    
    with pd.ExcelWriter(BACKUP_FILE, engine='openpyxl') as writer:
        for sheet_name, data in all_data.items():
            data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"[BACKUP] Usuários salvos: {len(users)} itens")

def load_ingredients() -> list:
    """Carrega ingredientes do Excel"""
    try:
        df = pd.read_excel(BACKUP_FILE, sheet_name='Ingredientes')
        df = df.fillna('')
        # Converter NaN para valores apropriados
        for col in df.columns:
            if df[col].dtype == 'float64':
                df[col] = df[col].apply(lambda x: None if pd.isna(x) or x == '' else x)
        ingredients = df.to_dict('records')
        print(f"[BACKUP] Ingredientes carregados: {len(ingredients)} itens")
        return ingredients
    except Exception as e:
        print(f"[BACKUP] Nenhum ingrediente encontrado no backup: {e}")
        return []

def load_products() -> list:
    """Carrega produtos do Excel"""
    try:
        df = pd.read_excel(BACKUP_FILE, sheet_name='Produtos')
        df = df.fillna('')
        products = df.to_dict('records')
        
        for p in products:
            # Converter recipe de JSON string de volta para lista
            if 'recipe' in p and isinstance(p['recipe'], str) and p['recipe']:
                try:
                    p['recipe'] = json.loads(p['recipe'])
                except:
                    p['recipe'] = []
            elif 'recipe' not in p or not p['recipe']:
                p['recipe'] = []
            
            # Converter order_steps de JSON string de volta para lista
            if 'order_steps' in p and isinstance(p['order_steps'], str) and p['order_steps']:
                try:
                    p['order_steps'] = json.loads(p['order_steps'])
                except:
                    p['order_steps'] = []
            elif 'order_steps' not in p or not p['order_steps']:
                p['order_steps'] = []
            
            # Garantir que code seja string
            if 'code' in p and p['code']:
                p['code'] = str(p['code'])
        
        print(f"[BACKUP] Produtos carregados: {len(products)} itens")
        return products
    except Exception as e:
        print(f"[BACKUP] Nenhum produto encontrado no backup: {e}")
        return []

def load_purchases() -> list:
    """Carrega compras do Excel"""
    try:
        df = pd.read_excel(BACKUP_FILE, sheet_name='Compras')
        df = df.fillna('')
        purchases = df.to_dict('records')
        print(f"[BACKUP] Compras carregadas: {len(purchases)} itens")
        return purchases
    except Exception as e:
        print(f"[BACKUP] Nenhuma compra encontrada no backup: {e}")
        return []

def load_categories() -> list:
    """Carrega categorias do Excel"""
    try:
        df = pd.read_excel(BACKUP_FILE, sheet_name='Categorias')
        df = df.fillna('')
        categories = df.to_dict('records')
        print(f"[BACKUP] Categorias carregadas: {len(categories)} itens")
        return categories
    except Exception as e:
        print(f"[BACKUP] Nenhuma categoria encontrada no backup: {e}")
        return []

def load_users() -> list:
    """Carrega usuários do Excel"""
    try:
        df = pd.read_excel(BACKUP_FILE, sheet_name='Usuarios')
        df = df.fillna('')
        users = df.to_dict('records')
        print(f"[BACKUP] Usuários carregados: {len(users)} itens")
        return users
    except Exception as e:
        print(f"[BACKUP] Nenhum usuário encontrado no backup: {e}")
        return []

def save_audit_logs(audit_logs: list):
    """Salva histórico de auditoria no Excel"""
    ensure_backup_dir()
    
    # Se a lista está vazia e já existe backup, não sobrescrever
    if not audit_logs and BACKUP_FILE.exists():
        try:
            existing_df = pd.read_excel(BACKUP_FILE, sheet_name='AuditLogs')
            if len(existing_df) > 0:
                print(f"[BACKUP] AuditLogs: lista vazia, mantendo backup existente com {len(existing_df)} itens")
                return
        except:
            pass
    
    # Converter details para JSON string
    logs_to_save = []
    for log in audit_logs:
        log_copy = log.copy()
        if 'details' in log_copy and isinstance(log_copy['details'], dict):
            log_copy['details'] = json.dumps(log_copy['details'])
        logs_to_save.append(log_copy)
    
    df = pd.DataFrame(logs_to_save)
    
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            existing_sheets = xls.sheet_names
    except FileNotFoundError:
        existing_sheets = []
    
    if existing_sheets:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            all_data = {sheet: pd.read_excel(xls, sheet_name=sheet) for sheet in existing_sheets if sheet != 'AuditLogs'}
    else:
        all_data = {}
    
    all_data['AuditLogs'] = df
    
    with pd.ExcelWriter(BACKUP_FILE, engine='openpyxl') as writer:
        for sheet_name, data in all_data.items():
            data.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"[BACKUP] AuditLogs salvos: {len(audit_logs)} itens")

def load_audit_logs() -> list:
    """Carrega histórico de auditoria do Excel"""
    try:
        df = pd.read_excel(BACKUP_FILE, sheet_name='AuditLogs')
        df = df.fillna('')
        logs = df.to_dict('records')
        
        # Converter details de JSON string de volta para dict
        for log in logs:
            if 'details' in log and isinstance(log['details'], str) and log['details']:
                try:
                    log['details'] = json.loads(log['details'])
                except:
                    log['details'] = None
            elif 'details' not in log or not log['details']:
                log['details'] = None
        
        print(f"[BACKUP] AuditLogs carregados: {len(logs)} itens")
        return logs
    except Exception as e:
        print(f"[BACKUP] Nenhum log de auditoria encontrado no backup: {e}")
        return []

def backup_exists() -> bool:
    """Verifica se o arquivo de backup existe"""
    return BACKUP_FILE.exists()

def get_backup_info() -> dict:
    """Retorna informações sobre o backup"""
    if not backup_exists():
        return {"exists": False, "path": str(BACKUP_FILE)}
    
    try:
        with pd.ExcelFile(BACKUP_FILE) as xls:
            sheets = xls.sheet_names
            info = {
                "exists": True,
                "path": str(BACKUP_FILE),
                "sheets": sheets,
                "last_modified": datetime.fromtimestamp(os.path.getmtime(BACKUP_FILE)).isoformat()
            }
            for sheet in sheets:
                df = pd.read_excel(xls, sheet_name=sheet)
                info[f"{sheet}_count"] = len(df)
        return info
    except Exception as e:
        return {"exists": True, "path": str(BACKUP_FILE), "error": str(e)}
