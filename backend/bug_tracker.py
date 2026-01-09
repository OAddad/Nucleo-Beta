"""
Sistema de Fila de Requisições com Prioridade e Log de Bugs
"""
import queue
import threading
import time
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Any, Optional
from enum import IntEnum
from dataclasses import dataclass, asdict
import uuid

# Caminho do arquivo de logs
LOGS_DIR = Path(__file__).parent / "data_backup"
BUGS_LOG_FILE = LOGS_DIR / "system_bugs.txt"
REQUESTS_LOG_FILE = LOGS_DIR / "requests_log.txt"

class Priority(IntEnum):
    """Prioridades das requisições (menor = mais prioritário)"""
    CRITICAL = 1    # Login, autenticação
    HIGH = 2        # Leitura de dados principais
    MEDIUM = 3      # Criação/atualização de dados
    LOW = 4         # Relatórios, exports
    BACKGROUND = 5  # Backups, logs

@dataclass
class BugReport:
    """Estrutura de um relatório de bug"""
    id: str
    timestamp: str
    error_type: str
    message: str
    endpoint: str
    user_id: Optional[str]
    stack_trace: str
    request_data: Optional[str]
    status: str  # 'new', 'investigating', 'fixed', 'ignored'
    
    def to_dict(self):
        return asdict(self)

@dataclass
class RequestLog:
    """Log de requisição"""
    id: str
    timestamp: str
    endpoint: str
    method: str
    priority: int
    duration_ms: float
    status: str  # 'success', 'error', 'timeout'
    error_message: Optional[str]

class RequestQueue:
    """Fila de requisições com prioridade"""
    
    def __init__(self, max_workers: int = 3):
        self.queue = queue.PriorityQueue()
        self.max_workers = max_workers
        self.workers = []
        self.running = False
        self.stats = {
            'total_requests': 0,
            'successful': 0,
            'failed': 0,
            'avg_response_time': 0
        }
        self._stats_lock = threading.Lock()
    
    def start(self):
        """Inicia os workers da fila"""
        if self.running:
            return
        self.running = True
        for i in range(self.max_workers):
            worker = threading.Thread(target=self._worker, daemon=True)
            worker.start()
            self.workers.append(worker)
    
    def stop(self):
        """Para os workers"""
        self.running = False
        # Adiciona itens None para desbloquear workers
        for _ in self.workers:
            self.queue.put((Priority.BACKGROUND, None, None, None))
    
    def _worker(self):
        """Worker que processa requisições da fila"""
        while self.running:
            try:
                priority, task_id, func, args = self.queue.get(timeout=1)
                if func is None:
                    continue
                
                start_time = time.time()
                try:
                    result = func(*args) if args else func()
                    duration = (time.time() - start_time) * 1000
                    self._update_stats(True, duration)
                except Exception as e:
                    duration = (time.time() - start_time) * 1000
                    self._update_stats(False, duration)
                    log_bug(
                        error_type=type(e).__name__,
                        message=str(e),
                        endpoint=f"queue_task_{task_id}",
                        stack_trace=traceback.format_exc()
                    )
                finally:
                    self.queue.task_done()
            except queue.Empty:
                continue
    
    def _update_stats(self, success: bool, duration: float):
        """Atualiza estatísticas"""
        with self._stats_lock:
            self.stats['total_requests'] += 1
            if success:
                self.stats['successful'] += 1
            else:
                self.stats['failed'] += 1
            # Média móvel
            n = self.stats['total_requests']
            self.stats['avg_response_time'] = (
                (self.stats['avg_response_time'] * (n - 1) + duration) / n
            )
    
    def enqueue(self, func: Callable, args: tuple = None, priority: Priority = Priority.MEDIUM):
        """Adiciona tarefa à fila"""
        task_id = str(uuid.uuid4())[:8]
        self.queue.put((priority, task_id, func, args))
        return task_id
    
    def get_stats(self):
        """Retorna estatísticas da fila"""
        with self._stats_lock:
            return {
                **self.stats,
                'queue_size': self.queue.qsize()
            }

# Instância global da fila
request_queue = RequestQueue()

# ==================== FUNÇÕES DE LOG DE BUGS ====================

def ensure_logs_dir():
    """Garante que o diretório de logs existe"""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

def log_bug(
    error_type: str,
    message: str,
    endpoint: str = "unknown",
    user_id: str = None,
    stack_trace: str = "",
    request_data: str = None
) -> BugReport:
    """Registra um bug no arquivo de logs"""
    ensure_logs_dir()
    
    bug = BugReport(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        error_type=error_type,
        message=message,
        endpoint=endpoint,
        user_id=user_id,
        stack_trace=stack_trace,
        request_data=request_data,
        status='new'
    )
    
    # Salvar no arquivo
    try:
        with open(BUGS_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"\n{'='*80}\n")
            f.write(f"BUG ID: {bug.id}\n")
            f.write(f"TIMESTAMP: {bug.timestamp}\n")
            f.write(f"TYPE: {bug.error_type}\n")
            f.write(f"ENDPOINT: {bug.endpoint}\n")
            f.write(f"USER: {bug.user_id or 'N/A'}\n")
            f.write(f"STATUS: {bug.status}\n")
            f.write(f"MESSAGE: {bug.message}\n")
            if bug.request_data:
                f.write(f"REQUEST DATA: {bug.request_data}\n")
            if bug.stack_trace:
                f.write(f"STACK TRACE:\n{bug.stack_trace}\n")
            f.write(f"{'='*80}\n")
    except Exception as e:
        print(f"[BUG_LOG] Erro ao salvar bug: {e}")
    
    return bug

def log_request(
    endpoint: str,
    method: str,
    priority: int,
    duration_ms: float,
    status: str,
    error_message: str = None
):
    """Registra uma requisição no log"""
    ensure_logs_dir()
    
    log = RequestLog(
        id=str(uuid.uuid4())[:8],
        timestamp=datetime.now(timezone.utc).isoformat(),
        endpoint=endpoint,
        method=method,
        priority=priority,
        duration_ms=round(duration_ms, 2),
        status=status,
        error_message=error_message
    )
    
    try:
        with open(REQUESTS_LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(f"{log.timestamp} | {log.method} {log.endpoint} | P{log.priority} | {log.duration_ms}ms | {log.status}")
            if log.error_message:
                f.write(f" | ERROR: {log.error_message}")
            f.write("\n")
    except Exception as e:
        print(f"[REQUEST_LOG] Erro ao salvar log: {e}")

def get_all_bugs(limit: int = 100) -> list:
    """Retorna todos os bugs registrados"""
    ensure_logs_dir()
    bugs = []
    
    if not BUGS_LOG_FILE.exists():
        return bugs
    
    try:
        with open(BUGS_LOG_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse dos bugs do arquivo
        bug_blocks = content.split('='*80)
        for block in bug_blocks:
            if 'BUG ID:' not in block:
                continue
            
            lines = block.strip().split('\n')
            bug_data = {}
            current_field = None
            stack_trace_lines = []
            in_stack_trace = False
            
            for line in lines:
                if line.startswith('BUG ID:'):
                    bug_data['id'] = line.replace('BUG ID:', '').strip()
                elif line.startswith('TIMESTAMP:'):
                    bug_data['timestamp'] = line.replace('TIMESTAMP:', '').strip()
                elif line.startswith('TYPE:'):
                    bug_data['error_type'] = line.replace('TYPE:', '').strip()
                elif line.startswith('ENDPOINT:'):
                    bug_data['endpoint'] = line.replace('ENDPOINT:', '').strip()
                elif line.startswith('USER:'):
                    bug_data['user_id'] = line.replace('USER:', '').strip()
                elif line.startswith('STATUS:'):
                    bug_data['status'] = line.replace('STATUS:', '').strip()
                elif line.startswith('MESSAGE:'):
                    bug_data['message'] = line.replace('MESSAGE:', '').strip()
                elif line.startswith('STACK TRACE:'):
                    in_stack_trace = True
                elif in_stack_trace:
                    stack_trace_lines.append(line)
            
            if bug_data.get('id'):
                bug_data['stack_trace'] = '\n'.join(stack_trace_lines)
                bug_data['request_data'] = None
                bugs.append(bug_data)
    except Exception as e:
        print(f"[BUG_LOG] Erro ao ler bugs: {e}")
    
    # Retorna os mais recentes primeiro
    bugs.reverse()
    return bugs[:limit]

def get_request_logs(limit: int = 200) -> list:
    """Retorna logs de requisições"""
    ensure_logs_dir()
    logs = []
    
    if not REQUESTS_LOG_FILE.exists():
        return logs
    
    try:
        with open(REQUESTS_LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for line in lines[-limit:]:
            line = line.strip()
            if not line:
                continue
            
            parts = line.split(' | ')
            if len(parts) >= 4:
                logs.append({
                    'timestamp': parts[0],
                    'endpoint': parts[1],
                    'priority': parts[2] if len(parts) > 2 else 'N/A',
                    'duration': parts[3] if len(parts) > 3 else 'N/A',
                    'status': parts[4] if len(parts) > 4 else 'N/A',
                    'error': parts[5] if len(parts) > 5 else None
                })
    except Exception as e:
        print(f"[REQUEST_LOG] Erro ao ler logs: {e}")
    
    logs.reverse()
    return logs

def get_system_info() -> dict:
    """Retorna informações do sistema"""
    import os
    import sys
    
    db_path = Path(__file__).parent / "data_backup" / "nucleo.db"
    bugs_count = len(get_all_bugs(limit=1000))
    
    return {
        'python_version': sys.version,
        'sqlite_path': str(db_path),
        'sqlite_exists': db_path.exists(),
        'sqlite_size_mb': round(db_path.stat().st_size / 1024 / 1024, 2) if db_path.exists() else 0,
        'bugs_log_path': str(BUGS_LOG_FILE),
        'bugs_log_exists': BUGS_LOG_FILE.exists(),
        'total_bugs': bugs_count,
        'requests_log_path': str(REQUESTS_LOG_FILE),
        'requests_log_exists': REQUESTS_LOG_FILE.exists(),
        'queue_stats': request_queue.get_stats()
    }

def clear_bugs(bug_ids: list = None):
    """Limpa bugs específicos ou todos"""
    ensure_logs_dir()
    
    if bug_ids is None:
        # Limpar todos - criar arquivo vazio
        with open(BUGS_LOG_FILE, 'w', encoding='utf-8') as f:
            f.write(f"# Sistema de Logs de Bugs - Iniciado em {datetime.now(timezone.utc).isoformat()}\n")
        return True
    
    # TODO: Implementar remoção seletiva se necessário
    return False

def update_bug_status(bug_id: str, new_status: str) -> bool:
    """Atualiza status de um bug"""
    # Por simplicidade, apenas registra a mudança
    log_bug(
        error_type="STATUS_UPDATE",
        message=f"Bug {bug_id} status alterado para: {new_status}",
        endpoint="bug_management"
    )
    return True

# Inicializar diretório de logs
ensure_logs_dir()
