from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
import os
import logging
import time
import traceback
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from PIL import Image
import shutil

# Banco de dados SQLite - ÚNICA fonte de dados
import database as sqlite_db

# Sistema de bugs e fila de requisições
import bug_tracker

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Inicializar o banco SQLite
sqlite_db.init_database()

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# Helper para chamar funções SQLite síncronas em contexto async
async def db_call(fn, *args, **kwargs):
    """Executa função SQLite síncrona em thread pool"""
    start_time = time.time()
    try:
        result = await run_in_threadpool(fn, *args, **kwargs)
        duration = (time.time() - start_time) * 1000
        bug_tracker.log_request(
            endpoint=fn.__name__,
            method="DB_CALL",
            priority=3,
            duration_ms=duration,
            status="success"
        )
        return result
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        bug_tracker.log_request(
            endpoint=fn.__name__,
            method="DB_CALL",
            priority=3,
            duration_ms=duration,
            status="error",
            error_message=str(e)
        )
        bug_tracker.log_bug(
            error_type=type(e).__name__,
            message=str(e),
            endpoint=fn.__name__,
            stack_trace=traceback.format_exc()
        )
        raise

# Models
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str = "observador"  # proprietario, administrador, observador
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str  # CREATE, UPDATE, DELETE
    resource_type: str  # ingredient, product, purchase, user
    resource_name: str
    user_id: str
    username: str
    priority: str  # baixa, media, alta
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[dict] = None

class UserManagementCreate(BaseModel):
    username: str
    password: str
    role: str  # proprietario, administrador, observador

class UserManagementUpdate(BaseModel):
    role: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class UserWithPassword(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime
    password: str

class IngredientCreate(BaseModel):
    name: str
    unit: str
    category: Optional[str] = None
    units_per_package: Optional[int] = None
    unit_weight: Optional[float] = None
    stock_quantity: Optional[float] = 0.0
    stock_min: Optional[float] = 0.0
    stock_max: Optional[float] = 0.0
    is_recipe: Optional[bool] = False

class Ingredient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: Optional[str] = ""  # Código de 5 dígitos (série 20000)
    name: str
    unit: str
    category: Optional[str] = None
    units_per_package: Optional[int] = None
    unit_weight: Optional[float] = None
    average_price: float = 0.0
    stock_quantity: float = 0.0
    stock_min: float = 0.0
    stock_max: float = 0.0
    is_recipe: bool = False
    recipe_cost_history: Optional[List[dict]] = []  # Histórico dos últimos 5 custos de receita
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchaseItemCreate(BaseModel):
    ingredient_id: str
    quantity: float
    price: float

class PurchaseBatchCreate(BaseModel):
    supplier: str
    purchase_date: Optional[str] = None
    items: List[PurchaseItemCreate]
    is_paid: Optional[bool] = True  # Por padrão, compras são consideradas pagas
    due_date: Optional[str] = None  # Data de vencimento se não foi paga

class PurchaseCreate(BaseModel):
    ingredient_id: str
    quantity: float
    price: float
    purchase_date: Optional[str] = None

class Purchase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: Optional[str] = None
    supplier: Optional[str] = ""
    ingredient_id: str
    ingredient_name: str
    ingredient_unit: Optional[str] = ""
    quantity: float
    price: float
    unit_price: float
    purchase_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_paid: bool = True
    due_date: Optional[str] = None
    expense_id: Optional[str] = None  # ID da despesa vinculada

class PurchaseBatch(BaseModel):
    batch_id: str
    supplier: str
    purchase_date: datetime
    total_quantity: float
    total_price: float
    items: List[Purchase]
    is_paid: bool = True
    due_date: Optional[str] = None
    expense_id: Optional[str] = None

class RecipeIngredient(BaseModel):
    ingredient_id: str
    quantity: float
    item_type: Optional[str] = "ingredient"


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str


# ========== EXPENSE CLASSIFICATION MODELS ==========
class ExpenseClassificationCreate(BaseModel):
    name: str


class ExpenseClassification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ========== EXPENSE MODELS ==========
class ExpenseCreate(BaseModel):
    name: str
    classification_id: Optional[str] = None
    classification_name: Optional[str] = None
    supplier: Optional[str] = None
    value: float
    due_date: str  # Data de vencimento (YYYY-MM-DD)
    is_paid: Optional[bool] = False
    paid_date: Optional[str] = None
    is_recurring: Optional[bool] = False
    recurring_period: Optional[str] = None  # monthly, weekly, yearly
    recurring_count: Optional[int] = 12  # Quantas vezes vai se repetir
    installments_total: Optional[int] = 0  # Total de parcelas
    installment_number: Optional[int] = 0  # Número da parcela atual
    parent_expense_id: Optional[str] = None  # ID da despesa pai (para parcelas)
    attachment_url: Optional[str] = None
    notes: Optional[str] = None


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    classification_id: Optional[str] = None
    classification_name: Optional[str] = None
    supplier: Optional[str] = None
    value: float
    due_date: str
    is_paid: bool = False
    paid_date: Optional[str] = None
    is_recurring: bool = False
    recurring_period: Optional[str] = None
    installments_total: int = 0
    installment_number: int = 0
    parent_expense_id: Optional[str] = None
    attachment_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExpenseStats(BaseModel):
    total: int
    pending_count: int
    pending_value: float
    paid_count: int
    paid_value: float


class OrderStepItem(BaseModel):
    product_id: str  # ID do produto
    product_name: Optional[str] = ""  # Nome do produto (para exibição)
    price_override: Optional[float] = None  # Preço customizado (se diferente do produto)

class OrderStep(BaseModel):
    name: str
    calculation_type: str = "soma"  # "minimo", "medio", "maximo", "soma", "subtracao"
    min_selections: int = 0  # 0 = sem limitador
    max_selections: int = 0  # 0 = sem limitador
    items: List[OrderStepItem] = []

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[str] = "produto"  # "produto", "combo" ou "receita"
    sale_price: Optional[float] = None
    photo_url: Optional[str] = None
    recipe: List[RecipeIngredient]
    is_insumo: Optional[bool] = False
    is_divisible: Optional[bool] = False
    order_steps: Optional[List[OrderStep]] = []
    linked_ingredient_id: Optional[str] = None  # ID do ingrediente linkado (para receitas)
    recipe_yield: Optional[float] = None  # Rendimento da receita (quantidade produzida)
    recipe_yield_unit: Optional[str] = None  # Unidade do rendimento (kg ou un)

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str = ""  # Código de 5 dígitos
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    product_type: str = "produto"  # "produto", "combo" ou "receita"
    sale_price: Optional[float] = None
    photo_url: Optional[str] = None
    recipe: List[RecipeIngredient]
    cmv: float = 0.0
    profit_margin: Optional[float] = None
    is_insumo: bool = False
    is_divisible: bool = False
    order_steps: List[OrderStep] = []
    linked_ingredient_id: Optional[str] = None  # ID do ingrediente linkado (para receitas)
    recipe_yield: Optional[float] = None  # Rendimento da receita (quantidade produzida)
    recipe_yield_unit: Optional[str] = None  # Unidade do rendimento (kg ou un)
    unit_cost: Optional[float] = None  # Custo por unidade/kg (CMV / rendimento)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PriceHistory(BaseModel):
    date: str
    price: float

class IngredientWithHistory(BaseModel):
    ingredient: Ingredient
    history: List[PriceHistory]

class DashboardStats(BaseModel):
    total_ingredients: int
    total_products: int
    total_purchases: int
    avg_cmv: float

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Usar SQLite
        user = await db_call(sqlite_db.get_user_by_id, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Converter created_at para datetime se for string
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


async def log_audit(action: str, resource_type: str, resource_name: str, user: User, priority: str, details: dict = None):
    """Registra uma ação no log de auditoria usando SQLite"""
    audit_data = {
        "id": str(uuid.uuid4()),
        "action": action,
        "resource_type": resource_type,
        "resource_name": resource_name,
        "user_id": user.id,
        "username": user.username,
        "priority": priority,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": str(details) if details else None
    }
    await db_call(sqlite_db.create_audit_log, audit_data)

def check_role(user: User, allowed_roles: List[str]):
    """Verifica se o usuário tem permissão baseada no role"""
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403, 
            detail=f"Permissão negada. Necessário: {', '.join(allowed_roles)}"
        )


async def update_recipe_costs_for_ingredient(ingredient_id: str):
    """
    Atualiza o custo de todas as receitas que usam um determinado ingrediente.
    Quando o preço de um ingrediente muda, todas as receitas que o usam
    devem ter seu custo recalculado e enviado para o ingrediente linkado no estoque.
    """
    products = await db_call(sqlite_db.get_all_products)
    
    for product in products:
        # Verificar se é uma receita e usa o ingrediente
        if product.get("product_type") != "receita":
            continue
            
        recipe = product.get("recipe", [])
        uses_ingredient = any(r.get("ingredient_id") == ingredient_id for r in recipe)
        
        if not uses_ingredient:
            continue
        
        # Recalcular CMV da receita
        cmv = 0.0
        for recipe_item in recipe:
            ingredient = await db_call(sqlite_db.get_ingredient_by_id, recipe_item.get("ingredient_id"))
            if ingredient:
                avg_price = ingredient.get("average_price", 0)
                quantity = recipe_item.get("quantity", 0)
                
                unit_weight = ingredient.get("unit_weight")
                is_whole_number = quantity == int(quantity)
                
                if unit_weight and unit_weight > 0 and is_whole_number and quantity >= 1:
                    cmv += avg_price * unit_weight * quantity
                else:
                    cmv += avg_price * quantity
        
        # Calcular custo por unidade baseado no rendimento
        recipe_yield = product.get("recipe_yield", 0) or 0
        unit_cost = cmv / recipe_yield if recipe_yield > 0 else cmv
        
        # Atualizar o produto
        await db_call(sqlite_db.update_product, product["id"], {
            "cmv": cmv,
            "unit_cost": unit_cost
        })
        
        # Se tiver ingrediente linkado, atualizar o preço médio no estoque
        linked_ingredient_id = product.get("linked_ingredient_id")
        if linked_ingredient_id:
            # Registrar o custo como uma "compra virtual" para o ingrediente
            await update_linked_ingredient_price(linked_ingredient_id, unit_cost)


async def update_linked_ingredient_price(ingredient_id: str, new_cost: float):
    """
    Atualiza o preço médio de um ingrediente linkado a uma receita.
    Armazena os últimos 5 custos e faz a média.
    """
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if not ingredient:
        return
    
    # Buscar histórico de custos da receita (armazenado no campo recipe_cost_history)
    cost_history = ingredient.get("recipe_cost_history", []) or []
    
    # Adicionar novo custo
    cost_history.append({
        "cost": new_cost,
        "date": datetime.now(timezone.utc).isoformat()
    })
    
    # Manter apenas os últimos 5
    cost_history = cost_history[-5:]
    
    # Calcular média
    if cost_history:
        avg_cost = sum(h["cost"] for h in cost_history) / len(cost_history)
    else:
        avg_cost = new_cost
    
    # Atualizar ingrediente
    await db_call(sqlite_db.update_ingredient, ingredient_id, {
        "average_price": avg_cost,
        "recipe_cost_history": cost_history
    })


# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Verificar se usuário existe
    existing = await db_call(sqlite_db.get_user_by_username, user_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Primeiro usuário é proprietário, demais são observadores
    user_count = await db_call(sqlite_db.count_users)
    role = "proprietario" if user_count == 0 or user_data.username == "Addad" else "observador"
    
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    # Senha em TEXTO SIMPLES (sem criptografia)
    await db_call(sqlite_db.create_user, {
        'id': user_id,
        'username': user_data.username,
        'password': user_data.password,  # Texto simples!
        'role': role,
        'created_at': created_at.isoformat()
    })
    
    user = User(id=user_id, username=user_data.username, role=role, created_at=created_at)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Log para debug
    print(f"[LOGIN] Tentativa de login - Username: '{user_data.username}'")
    
    # Buscar usuário (case-insensitive para username)
    user_doc = await db_call(sqlite_db.get_user_by_username, user_data.username)
    
    # Se não encontrou, tentar com primeira letra maiúscula
    if not user_doc:
        user_doc = await db_call(sqlite_db.get_user_by_username, user_data.username.capitalize())
    
    print(f"[LOGIN] Usuário encontrado: {user_doc is not None}")
    
    # Verificar senha usando hash
    if not user_doc or not sqlite_db.verify_password(user_doc.get("password", ""), user_data.password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas. Verifique usuário e senha.")
    
    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"].replace('Z', '+00:00'))
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)


# User Management endpoints
@api_router.get("/users/management", response_model=List[UserWithPassword])
async def get_users_management(current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    users = await db_call(sqlite_db.get_all_users)
    for u in users:
        if isinstance(u.get("created_at"), str):
            u["created_at"] = datetime.fromisoformat(u["created_at"].replace('Z', '+00:00'))
    return users

@api_router.post("/users/create", response_model=User)
async def create_user_management(user_data: UserManagementCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    
    existing = await db_call(sqlite_db.get_user_by_username, user_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if user_data.role not in ["proprietario", "administrador", "observador"]:
        raise HTTPException(status_code=400, detail="Role inválido")
    
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    # Senha em TEXTO SIMPLES
    await db_call(sqlite_db.create_user, {
        'id': user_id,
        'username': user_data.username,
        'password': user_data.password,  # Texto simples!
        'role': user_data.role,
        'created_at': created_at.isoformat()
    })
    
    # Registrar auditoria
    await log_audit("CREATE", "user", user_data.username, current_user, "media", {"role": user_data.role})
    
    return User(id=user_id, username=user_data.username, role=user_data.role, created_at=created_at)

@api_router.put("/users/{user_id}/role", response_model=User)
async def update_user_role(user_id: str, role_data: UserManagementUpdate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    
    if role_data.role not in ["proprietario", "administrador", "observador"]:
        raise HTTPException(status_code=400, detail="Role inválido")
    
    user = await db_call(sqlite_db.get_user_by_id, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db_call(sqlite_db.update_user, user_id, {"role": role_data.role})
    
    # Registrar auditoria
    await log_audit("UPDATE", "user", user["username"], current_user, "media", {"new_role": role_data.role})
    
    updated = await db_call(sqlite_db.get_user_by_id, user_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    return User(**updated)

@api_router.put("/users/change-password")
async def change_password(password_data: ChangePassword, current_user: User = Depends(get_current_user)):
    user_doc = await db_call(sqlite_db.get_user_by_id, current_user.id)
    # Verificar senha usando hash
    if not user_doc or not sqlite_db.verify_password(user_doc.get("password", ""), password_data.old_password):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    # Atualizar senha (será hasheada automaticamente)
    await db_call(sqlite_db.update_user, current_user.id, {"password": password_data.new_password})
    
    return {"message": "Senha alterada com sucesso"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode deletar sua própria conta")
    
    user = await db_call(sqlite_db.get_user_by_id, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db_call(sqlite_db.delete_user, user_id)
    
    # Registrar auditoria
    await log_audit("DELETE", "user", user["username"], current_user, "alta")
    
    return {"message": "Usuário deletado"}

# Audit Log endpoints
@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    logs = await db_call(sqlite_db.get_all_audit_logs)
    for log in logs:
        if isinstance(log.get("timestamp"), str):
            log["timestamp"] = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
    return logs

# Ingredient endpoints
@api_router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(ingredient_data: IngredientCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    ing_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    data = ingredient_data.model_dump()
    data['id'] = ing_id
    data['average_price'] = 0.0
    data['created_at'] = created_at.isoformat()
    
    await db_call(sqlite_db.create_ingredient, data)
    
    # Registrar auditoria
    await log_audit("CREATE", "ingredient", ingredient_data.name, current_user, "baixa")
    
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, ing_id)
    if isinstance(ingredient.get("created_at"), str):
        ingredient["created_at"] = datetime.fromisoformat(ingredient["created_at"].replace('Z', '+00:00'))
    
    return Ingredient(**ingredient)

@api_router.get("/ingredients", response_model=List[Ingredient])
async def get_ingredients(current_user: User = Depends(get_current_user)):
    ingredients = await db_call(sqlite_db.get_all_ingredients)
    for ing in ingredients:
        if isinstance(ing.get("created_at"), str):
            ing["created_at"] = datetime.fromisoformat(ing["created_at"].replace('Z', '+00:00'))
    return ingredients

@api_router.put("/ingredients/{ingredient_id}", response_model=Ingredient)
async def update_ingredient(ingredient_id: str, ingredient_data: IngredientCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    update_data = ingredient_data.model_dump()
    await db_call(sqlite_db.update_ingredient, ingredient_id, update_data)
    
    # Registrar auditoria
    await log_audit("UPDATE", "ingredient", ingredient_data.name, current_user, "media")
    
    updated = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    return Ingredient(**updated)

class StockAdjustment(BaseModel):
    quantity: float
    operation: str  # "add" ou "remove"
    reason: Optional[str] = None

@api_router.put("/ingredients/{ingredient_id}/stock", response_model=Ingredient)
async def adjust_stock(ingredient_id: str, adjustment: StockAdjustment, current_user: User = Depends(get_current_user)):
    """Ajusta a quantidade em estoque de um ingrediente"""
    check_role(current_user, ["proprietario", "administrador"])
    
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado")
    
    current_stock = ingredient.get("stock_quantity", 0) or 0
    
    if adjustment.operation == "add":
        new_stock = current_stock + adjustment.quantity
    elif adjustment.operation == "remove":
        new_stock = current_stock - adjustment.quantity
        if new_stock < 0:
            new_stock = 0
    else:
        raise HTTPException(status_code=400, detail="Operação inválida. Use 'add' ou 'remove'")
    
    await db_call(sqlite_db.update_ingredient, ingredient_id, {"stock_quantity": new_stock})
    
    # Registrar auditoria
    await log_audit(
        "UPDATE", 
        "stock", 
        ingredient["name"], 
        current_user, 
        "media", 
        {"operation": adjustment.operation, "quantity": adjustment.quantity, "reason": adjustment.reason}
    )
    
    updated = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    return Ingredient(**updated)

@api_router.get("/ingredients/{ingredient_id}/usage")
async def check_ingredient_usage(ingredient_id: str, current_user: User = Depends(get_current_user)):
    products = await db_call(sqlite_db.get_all_products)
    used_in = []
    for product in products:
        for recipe_item in product.get("recipe", []):
            if recipe_item.get("ingredient_id") == ingredient_id:
                used_in.append({"id": product["id"], "name": product["name"]})
                break
    return {"used_in_products": used_in, "can_delete": len(used_in) == 0}

@api_router.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    # Check if ingredient exists
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    # Check if ingredient is used in any product
    products = await db_call(sqlite_db.get_all_products)
    used_in = []
    for product in products:
        for recipe_item in product.get("recipe", []):
            if recipe_item.get("ingredient_id") == ingredient_id:
                used_in.append(product["name"])
                break
    
    if used_in:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete ingredient. It is used in the following products: {', '.join(used_in)}"
        )
    
    deleted = await db_call(sqlite_db.delete_ingredient, ingredient_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    # Registrar auditoria
    await log_audit("DELETE", "ingredient", ingredient["name"], current_user, "alta")
    
    return {"message": "Ingredient deleted"}

# Purchase endpoints
@api_router.post("/purchases/batch", response_model=dict)
async def create_purchase_batch(batch_data: PurchaseBatchCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    batch_id = str(uuid.uuid4())
    purchase_date = datetime.fromisoformat(batch_data.purchase_date) if batch_data.purchase_date else datetime.now(timezone.utc)
    
    purchases_created = []
    total_batch_price = 0
    
    for item in batch_data.items:
        ingredient = await db_call(sqlite_db.get_ingredient_by_id, item.ingredient_id)
        if not ingredient:
            continue
        
        unit_price = item.price / item.quantity if item.quantity > 0 else 0
        total_batch_price += item.price
        
        purchase_data = {
            "id": str(uuid.uuid4()),
            "batch_id": batch_id,
            "supplier": batch_data.supplier,
            "ingredient_id": item.ingredient_id,
            "ingredient_name": ingredient["name"],
            "ingredient_unit": ingredient["unit"],
            "quantity": item.quantity,
            "price": item.price,
            "unit_price": unit_price,
            "purchase_date": purchase_date.isoformat(),
            "is_paid": batch_data.is_paid if batch_data.is_paid is not None else True,
            "due_date": batch_data.due_date
        }
        
        await db_call(sqlite_db.create_purchase, purchase_data)
        purchases_created.append(purchase_data)
        
        # Recalculate average price
        purchases = await db_call(sqlite_db.get_purchases_by_ingredient, item.ingredient_id)
        total_quantity = sum(p["quantity"] for p in purchases)
        total_cost = sum(p["price"] for p in purchases)
        avg_price = total_cost / total_quantity if total_quantity > 0 else 0
        
        # If ingredient has units_per_package (for 'un'), divide by it to get unit price
        if ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
            avg_price = avg_price / ingredient["units_per_package"]
        
        # Atualizar preço médio E quantidade em estoque
        current_stock = ingredient.get("stock_quantity", 0) or 0
        new_stock = current_stock + item.quantity
        
        await db_call(sqlite_db.update_ingredient, item.ingredient_id, {
            "average_price": avg_price, 
            "stock_quantity": new_stock
        })
        
        # Atualizar custo das receitas que usam este ingrediente
        await update_recipe_costs_for_ingredient(item.ingredient_id)
    
    # Criar despesa vinculada à compra
    expense_id = None
    if total_batch_price > 0:
        expense_id = str(uuid.uuid4())
        
        # Buscar ou criar classificação "Compras"
        compras_class = await db_call(sqlite_db.get_expense_classification_by_name, "Compras")
        if not compras_class:
            compras_class_id = str(uuid.uuid4())
            await db_call(sqlite_db.create_expense_classification, {
                "id": compras_class_id,
                "name": "Compras",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            compras_class = {"id": compras_class_id, "name": "Compras"}
        
        # Criar lista de itens comprados
        items_summary = ", ".join([p["ingredient_name"] for p in purchases_created[:3]])
        if len(purchases_created) > 3:
            items_summary += f" e mais {len(purchases_created) - 3} itens"
        
        expense_data = {
            "id": expense_id,
            "name": f"Compra - {batch_data.supplier}",
            "classification_id": compras_class["id"],
            "classification_name": "Compras",
            "supplier": batch_data.supplier,
            "value": total_batch_price,
            "due_date": batch_data.due_date if batch_data.due_date else purchase_date.strftime("%Y-%m-%d"),
            "is_paid": batch_data.is_paid if batch_data.is_paid is not None else True,
            "paid_date": purchase_date.strftime("%Y-%m-%d") if (batch_data.is_paid is None or batch_data.is_paid) else None,
            "notes": f"Itens: {items_summary}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db_call(sqlite_db.create_expense, expense_data)
        
        # Atualizar as compras com o expense_id
        await db_call(sqlite_db.update_purchase_payment, batch_id, 
                     batch_data.is_paid if batch_data.is_paid is not None else True, 
                     batch_data.due_date, expense_id)
    
    # Registrar auditoria
    await log_audit("CREATE", "purchase", f"Lote de {batch_data.supplier}", current_user, "baixa", {"items": len(purchases_created)})
    
    return {"message": "Purchase batch created", "batch_id": batch_id, "items_created": len(purchases_created), "expense_id": expense_id}

@api_router.put("/purchases/batch/{batch_id}", response_model=dict)
async def update_purchase_batch(batch_id: str, batch_data: PurchaseBatchCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    # Get old purchases
    all_purchases = await db_call(sqlite_db.get_all_purchases)
    old_purchases = [p for p in all_purchases if p.get("batch_id") == batch_id]
    
    if not old_purchases:
        raise HTTPException(status_code=404, detail="Purchase batch not found")
    
    # Delete old batch
    await db_call(sqlite_db.delete_purchases_by_batch, batch_id)
    
    # Create new purchases with same batch_id
    purchase_date = datetime.fromisoformat(batch_data.purchase_date) if batch_data.purchase_date else datetime.now(timezone.utc)
    
    purchases_created = []
    affected_ingredients = set()
    
    for item in batch_data.items:
        ingredient = await db_call(sqlite_db.get_ingredient_by_id, item.ingredient_id)
        if not ingredient:
            continue
        
        affected_ingredients.add(item.ingredient_id)
        unit_price = item.price / item.quantity if item.quantity > 0 else 0
        
        purchase_data = {
            "id": str(uuid.uuid4()),
            "batch_id": batch_id,
            "supplier": batch_data.supplier,
            "ingredient_id": item.ingredient_id,
            "ingredient_name": ingredient["name"],
            "ingredient_unit": ingredient["unit"],
            "quantity": item.quantity,
            "price": item.price,
            "unit_price": unit_price,
            "purchase_date": purchase_date.isoformat()
        }
        
        await db_call(sqlite_db.create_purchase, purchase_data)
        purchases_created.append(purchase_data)
    
    # Recalculate average price for all affected ingredients (old and new)
    for old_p in old_purchases:
        affected_ingredients.add(old_p["ingredient_id"])
    
    for ingredient_id in affected_ingredients:
        ingredient = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
        
        # USANDO MÉDIA DAS ÚLTIMAS 5 COMPRAS
        avg_price = await db_call(sqlite_db.get_average_price_last_5_purchases, ingredient_id)
        
        if ingredient and ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
            avg_price = avg_price / ingredient["units_per_package"]
        
        await db_call(sqlite_db.update_ingredient, ingredient_id, {"average_price": avg_price})
        
        # Atualizar custo das receitas que usam este ingrediente
        await update_recipe_costs_for_ingredient(ingredient_id)
    
    # Registrar auditoria
    await log_audit("UPDATE", "purchase", f"Lote de {batch_data.supplier}", current_user, "media", {"items": len(purchases_created)})
    
    return {"message": "Purchase batch updated", "batch_id": batch_id, "items_updated": len(purchases_created)}

@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(purchase_data: PurchaseCreate, current_user: User = Depends(get_current_user)):
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, purchase_data.ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    unit_price = purchase_data.price / purchase_data.quantity if purchase_data.quantity > 0 else 0
    batch_id = str(uuid.uuid4())
    purchase_date = datetime.fromisoformat(purchase_data.purchase_date) if purchase_data.purchase_date else datetime.now(timezone.utc)
    
    purchase = {
        "id": str(uuid.uuid4()),
        "batch_id": batch_id,
        "supplier": "",
        "ingredient_id": purchase_data.ingredient_id,
        "ingredient_name": ingredient["name"],
        "ingredient_unit": ingredient["unit"],
        "quantity": purchase_data.quantity,
        "price": purchase_data.price,
        "unit_price": unit_price,
        "purchase_date": purchase_date.isoformat()
    }
    
    await db_call(sqlite_db.create_purchase, purchase)
    
    # Recalculate average price - USANDO MÉDIA DAS ÚLTIMAS 5 COMPRAS
    avg_price = await db_call(sqlite_db.get_average_price_last_5_purchases, purchase_data.ingredient_id)
    
    # If ingredient has units_per_package, divide by it to get unit price
    if ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
        avg_price = avg_price / ingredient["units_per_package"]
    
    await db_call(sqlite_db.update_ingredient, purchase_data.ingredient_id, {"average_price": avg_price})
    
    # Atualizar custo das receitas que usam este ingrediente
    await update_recipe_costs_for_ingredient(purchase_data.ingredient_id)
    
    purchase["purchase_date"] = purchase_date
    return Purchase(**purchase)

@api_router.get("/purchases/grouped", response_model=List[PurchaseBatch])
async def get_purchases_grouped(current_user: User = Depends(get_current_user)):
    purchases = await db_call(sqlite_db.get_all_purchases)
    
    # Group by batch_id
    batches_dict = {}
    for p in purchases:
        # Normalizar data para string ISO para evitar problemas de timezone
        purchase_date = p.get("purchase_date")
        if isinstance(purchase_date, str):
            p["purchase_date"] = purchase_date
        elif purchase_date:
            p["purchase_date"] = purchase_date.isoformat()
        else:
            p["purchase_date"] = datetime.now(timezone.utc).isoformat()
        
        batch_id = p.get("batch_id", p["id"])
        if batch_id not in batches_dict:
            batches_dict[batch_id] = {
                "batch_id": batch_id,
                "supplier": p.get("supplier", ""),
                "purchase_date": p["purchase_date"],
                "total_quantity": 0,
                "total_price": 0,
                "items": [],
                "purchases": [],
                "is_paid": p.get("is_paid", True),
                "due_date": p.get("due_date"),
                "expense_id": p.get("expense_id")
            }
        
        batches_dict[batch_id]["total_quantity"] += p["quantity"]
        batches_dict[batch_id]["total_price"] += p["price"]
        batches_dict[batch_id]["items"].append(p)
        batches_dict[batch_id]["purchases"].append(p)
    
    # Ordenar por data (string comparison works for ISO dates)
    batches = sorted(batches_dict.values(), key=lambda x: x["purchase_date"], reverse=True)
    return batches

@api_router.get("/purchases", response_model=List[Purchase])
async def get_purchases(current_user: User = Depends(get_current_user)):
    purchases = await db_call(sqlite_db.get_all_purchases)
    for p in purchases:
        if isinstance(p["purchase_date"], str):
            p["purchase_date"] = datetime.fromisoformat(p["purchase_date"].replace('Z', '+00:00'))
    return purchases

@api_router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    all_purchases = await db_call(sqlite_db.get_all_purchases)
    purchase = next((p for p in all_purchases if p["id"] == purchase_id), None)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    # Delete purchase by deleting its batch (single item batch)
    await db_call(sqlite_db.delete_purchases_by_batch, purchase.get("batch_id", purchase_id))
    
    # Recalculate average price - USANDO MÉDIA DAS ÚLTIMAS 5 COMPRAS
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, purchase["ingredient_id"])
    avg_price = await db_call(sqlite_db.get_average_price_last_5_purchases, purchase["ingredient_id"])
    
    # If ingredient has units_per_package, divide by it
    if ingredient and ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
        avg_price = avg_price / ingredient["units_per_package"]
    
    await db_call(sqlite_db.update_ingredient, purchase["ingredient_id"], {"average_price": avg_price})
    
    # Registrar auditoria
    await log_audit("DELETE", "purchase", purchase["ingredient_name"], current_user, "alta")
    
    return {"message": "Purchase deleted"}

@api_router.delete("/purchases/batch/{batch_id}")
async def delete_purchase_batch(batch_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    all_purchases = await db_call(sqlite_db.get_all_purchases)
    purchases = [p for p in all_purchases if p.get("batch_id") == batch_id]
    
    if not purchases:
        raise HTTPException(status_code=404, detail="Purchase batch not found")
    
    # Delete all purchases in batch
    await db_call(sqlite_db.delete_purchases_by_batch, batch_id)
    
    # Recalculate average price for all affected ingredients - USANDO MÉDIA DAS ÚLTIMAS 5 COMPRAS
    affected_ingredients = set(p["ingredient_id"] for p in purchases)
    for ingredient_id in affected_ingredients:
        ingredient = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
        avg_price = await db_call(sqlite_db.get_average_price_last_5_purchases, ingredient_id)
        
        # If ingredient has units_per_package, divide by it
        if ingredient and ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
            avg_price = avg_price / ingredient["units_per_package"]
        
        await db_call(sqlite_db.update_ingredient, ingredient_id, {"average_price": avg_price})
    
    # Registrar auditoria
    supplier = purchases[0].get("supplier", "Unknown") if purchases else "Unknown"
    await log_audit("DELETE", "purchase", f"Lote de {supplier}", current_user, "alta", {"items": len(purchases)})
    
    return {"message": "Purchase batch deleted", "purchases_deleted": len(purchases)}


class PurchasePaymentUpdate(BaseModel):
    is_paid: bool
    due_date: Optional[str] = None


@api_router.patch("/purchases/batch/{batch_id}/payment")
async def update_purchase_payment_status(batch_id: str, payment_data: PurchasePaymentUpdate, current_user: User = Depends(get_current_user)):
    """Atualiza o status de pagamento de um lote de compras e sua despesa vinculada"""
    check_role(current_user, ["proprietario", "administrador"])
    
    # Buscar compras do lote
    purchases = await db_call(sqlite_db.get_purchases_by_batch, batch_id)
    if not purchases:
        raise HTTPException(status_code=404, detail="Lote de compras não encontrado")
    
    # Atualizar status de pagamento das compras
    await db_call(sqlite_db.update_purchase_payment, batch_id, payment_data.is_paid, payment_data.due_date, purchases[0].get("expense_id"))
    
    # Se tem despesa vinculada, atualizar também
    expense_id = purchases[0].get("expense_id")
    if expense_id:
        expense = await db_call(sqlite_db.get_expense_by_id, expense_id)
        if expense:
            paid_date = datetime.now(timezone.utc).strftime("%Y-%m-%d") if payment_data.is_paid else None
            await db_call(sqlite_db.update_expense, expense_id, {
                "is_paid": payment_data.is_paid,
                "paid_date": paid_date,
                "due_date": payment_data.due_date if payment_data.due_date else expense.get("due_date")
            })
    
    # Registrar auditoria
    supplier = purchases[0].get("supplier", "Unknown")
    status = "pago" if payment_data.is_paid else "pendente"
    await log_audit("UPDATE", "purchase", f"Lote de {supplier} - Status: {status}", current_user, "media")
    
    return {"message": "Status de pagamento atualizado", "is_paid": payment_data.is_paid}


# Product endpoints
async def get_next_product_code():
    """Gera o próximo código de produto de 5 dígitos usando SQLite"""
    return await db_call(sqlite_db.get_next_product_code)

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    # Gerar código automático
    product_code = await get_next_product_code()
    
    # Calculate CMV
    cmv = 0.0
    for recipe_item in product_data.recipe:
        ingredient = await db_call(sqlite_db.get_ingredient_by_id, recipe_item.ingredient_id)
        if ingredient:
            avg_price = ingredient.get("average_price", 0)
            quantity = recipe_item.quantity
            
            unit_weight = ingredient.get("unit_weight")
            is_whole_number = quantity == int(quantity)
            
            if unit_weight and unit_weight > 0 and is_whole_number and quantity >= 1:
                cmv += avg_price * unit_weight * quantity
            else:
                cmv += avg_price * quantity
    
    # Calculate profit margin if sale price exists
    profit_margin = None
    if product_data.sale_price and product_data.sale_price > 0:
        profit_margin = ((product_data.sale_price - cmv) / product_data.sale_price) * 100
    
    prod_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    # Converter order_steps para dicts
    order_steps_list = []
    for step in (product_data.order_steps or []):
        if isinstance(step, dict):
            order_steps_list.append(step)
        else:
            order_steps_list.append(step.model_dump())
    
    # Converter recipe para dicts
    recipe_list = []
    for r in product_data.recipe:
        if isinstance(r, dict):
            recipe_list.append(r)
        else:
            recipe_list.append(r.model_dump())
    
    product_dict = {
        "id": prod_id,
        "code": product_code,
        "name": product_data.name,
        "description": product_data.description,
        "category": product_data.category,
        "product_type": product_data.product_type or "produto",
        "sale_price": product_data.sale_price,
        "photo_url": product_data.photo_url,
        "recipe": recipe_list,
        "cmv": cmv,
        "profit_margin": profit_margin,
        "is_insumo": product_data.is_insumo,
        "is_divisible": product_data.is_divisible,
        "order_steps": order_steps_list,
        "linked_ingredient_id": product_data.linked_ingredient_id,
        "recipe_yield": product_data.recipe_yield,
        "recipe_yield_unit": product_data.recipe_yield_unit,
        "unit_cost": cmv / product_data.recipe_yield if product_data.recipe_yield and product_data.recipe_yield > 0 else cmv,
        "created_at": created_at.isoformat()
    }
    
    await db_call(sqlite_db.create_product, product_dict)
    
    # Se é uma receita com ingrediente linkado, atualizar o preço médio do ingrediente
    if product_data.product_type == "receita" and product_data.linked_ingredient_id:
        unit_cost = product_dict["unit_cost"]
        await update_linked_ingredient_price(product_data.linked_ingredient_id, unit_cost)
    
    # Registrar auditoria
    await log_audit("CREATE", "product", product_data.name, current_user, "baixa")
    
    product_dict["created_at"] = created_at
    return Product(**product_dict)

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db_call(sqlite_db.get_all_products)
    for p in products:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"].replace('Z', '+00:00'))
    return products

@api_router.get("/products/for-sale", response_model=List[Product])
async def get_products_for_sale(current_user: User = Depends(get_current_user)):
    """Retorna apenas produtos para venda (não insumos)"""
    products = await db_call(sqlite_db.get_all_products)
    products = [p for p in products if not p.get("is_insumo")]
    for p in products:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"].replace('Z', '+00:00'))
    return products

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db_call(sqlite_db.get_product_by_id, product_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Recalculate CMV
    cmv = 0.0
    for recipe_item in product_data.recipe:
        ingredient = await db_call(sqlite_db.get_ingredient_by_id, recipe_item.ingredient_id)
        if ingredient:
            avg_price = ingredient.get("average_price", 0)
            quantity = recipe_item.quantity
            
            unit_weight = ingredient.get("unit_weight")
            is_whole_number = quantity == int(quantity)
            
            if unit_weight and unit_weight > 0 and is_whole_number and quantity >= 1:
                cmv += avg_price * unit_weight * quantity
            else:
                cmv += avg_price * quantity
    
    profit_margin = None
    if product_data.sale_price and product_data.sale_price > 0:
        profit_margin = ((product_data.sale_price - cmv) / product_data.sale_price) * 100
    
    # Converter order_steps para dicts
    order_steps_list = []
    for step in (product_data.order_steps or []):
        if isinstance(step, dict):
            order_steps_list.append(step)
        else:
            order_steps_list.append(step.model_dump())
    
    # Converter recipe para dicts
    recipe_list = []
    for r in product_data.recipe:
        if isinstance(r, dict):
            recipe_list.append(r)
        else:
            recipe_list.append(r.model_dump())
    
    update_data = {
        "name": product_data.name,
        "description": product_data.description,
        "category": product_data.category,
        "product_type": product_data.product_type or "produto",
        "sale_price": product_data.sale_price,
        "photo_url": product_data.photo_url,
        "recipe": recipe_list,
        "cmv": cmv,
        "profit_margin": profit_margin,
        "is_insumo": product_data.is_insumo,
        "is_divisible": product_data.is_divisible,
        "order_steps": order_steps_list,
        "linked_ingredient_id": product_data.linked_ingredient_id,
        "recipe_yield": product_data.recipe_yield,
        "recipe_yield_unit": product_data.recipe_yield_unit,
        "unit_cost": cmv / product_data.recipe_yield if product_data.recipe_yield and product_data.recipe_yield > 0 else cmv
    }
    
    await db_call(sqlite_db.update_product, product_id, update_data)
    
    # Se é uma receita com ingrediente linkado, atualizar o preço médio do ingrediente
    if product_data.product_type == "receita" and product_data.linked_ingredient_id:
        unit_cost = update_data["unit_cost"]
        await update_linked_ingredient_price(product_data.linked_ingredient_id, unit_cost)
    
    # Registrar auditoria
    await log_audit("UPDATE", "product", product_data.name, current_user, "media")
    
    updated = await db_call(sqlite_db.get_product_by_id, product_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    return Product(**updated)

@api_router.post("/upload/product-photo")
async def upload_product_photo(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    # Criar diretório para uploads se não existir
    upload_dir = Path("/app/backend/uploads/products")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Validar tipo de arquivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Gerar nome único
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Salvar arquivo temporário
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Redimensionar imagem para 1080x1080
    try:
        img = Image.open(file_path)
        img = img.convert("RGB")
        img.thumbnail((1080, 1080), Image.Resampling.LANCZOS)
        
        # Criar canvas quadrado
        if img.size[0] != img.size[1]:
            size = max(img.size)
            new_img = Image.new("RGB", (size, size), (255, 255, 255))
            offset = ((size - img.size[0]) // 2, (size - img.size[1]) // 2)
            new_img.paste(img, offset)
            img = new_img
        
        img.save(file_path, "JPEG", quality=85)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")
    
    # Retornar URL relativa
    return {"photo_url": f"/uploads/products/{unique_filename}"}

# Endpoint para servir imagens de produtos
@api_router.get("/uploads/products/{filename}")
async def serve_product_image(filename: str):
    file_path = Path(f"/app/backend/uploads/products/{filename}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    product = await db_call(sqlite_db.get_product_by_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    deleted = await db_call(sqlite_db.delete_product, product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Registrar auditoria
    await log_audit("DELETE", "product", product["name"], current_user, "alta")
    
    return {"message": "Product deleted"}


# Category endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    """Retorna todas as categorias cadastradas"""
    categories = await db_call(sqlite_db.get_all_categories)
    for cat in categories:
        if isinstance(cat.get("created_at"), str):
            cat["created_at"] = datetime.fromisoformat(cat["created_at"].replace('Z', '+00:00'))
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    """Cria uma nova categoria"""
    check_role(current_user, ["proprietario", "administrador"])
    
    # Verificar se já existe
    existing = await db_call(sqlite_db.get_category_by_name, category_data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Categoria já existe")
    
    cat_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    await db_call(sqlite_db.create_category, {
        "id": cat_id,
        "name": category_data.name,
        "created_at": created_at.isoformat()
    })
    
    # Registrar auditoria
    await log_audit("CREATE", "category", category_data.name, current_user, "baixa")
    
    return Category(id=cat_id, name=category_data.name, created_at=created_at)

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    """Atualiza uma categoria"""
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db_call(sqlite_db.get_category_by_id, category_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se novo nome já existe
    name_exists = await db_call(sqlite_db.get_category_by_name, category_data.name)
    if name_exists and name_exists["id"] != category_id:
        raise HTTPException(status_code=400, detail="Nome de categoria já existe")
    
    old_name = existing["name"]
    await db_call(sqlite_db.update_category, category_id, {"name": category_data.name})
    
    # Atualizar todos os produtos que usam essa categoria
    products = await db_call(sqlite_db.get_all_products)
    for p in products:
        if p.get("category") == old_name:
            await db_call(sqlite_db.update_product, p["id"], {"category": category_data.name})
    
    # Registrar auditoria
    await log_audit("UPDATE", "category", f"{old_name} → {category_data.name}", current_user, "media")
    
    updated = await db_call(sqlite_db.get_category_by_id, category_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    """Deleta uma categoria"""
    check_role(current_user, ["proprietario", "administrador"])
    
    category = await db_call(sqlite_db.get_category_by_id, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se algum produto usa essa categoria
    products = await db_call(sqlite_db.get_all_products)
    products_using = [p for p in products if p.get("category") == category["name"]]
    
    if products_using:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível excluir. {len(products_using)} produto(s) usa(m) esta categoria."
        )
    
    await db_call(sqlite_db.delete_category, category_id)
    
    # Registrar auditoria
    await log_audit("DELETE", "category", category["name"], current_user, "alta")
    
    return {"message": "Categoria deletada"}

@api_router.post("/categories/initialize")
async def initialize_categories(current_user: User = Depends(get_current_user)):
    """Inicializa categorias padrão se não existirem"""
    check_role(current_user, ["proprietario", "administrador"])
    
    default_categories = ["Sanduíches", "Bebidas", "Pizzas", "Porções", "Sobremesas", "Acompanhamentos"]
    created = []
    
    for cat_name in default_categories:
        existing = await db_call(sqlite_db.get_category_by_name, cat_name)
        if not existing:
            cat_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc)
            await db_call(sqlite_db.create_category, {
                "id": cat_id,
                "name": cat_name,
                "created_at": created_at.isoformat()
            })
            created.append(cat_name)
    
    return {"message": "Categorias inicializadas", "created": created}


# ==================== EXPENSE CLASSIFICATION ENDPOINTS ====================

@api_router.get("/expense-classifications", response_model=List[ExpenseClassification])
async def get_expense_classifications(current_user: User = Depends(get_current_user)):
    """Lista todas as classificações de despesas"""
    classifications = await db_call(sqlite_db.get_all_expense_classifications)
    for c in classifications:
        if isinstance(c.get("created_at"), str):
            c["created_at"] = datetime.fromisoformat(c["created_at"].replace('Z', '+00:00'))
    return classifications


@api_router.post("/expense-classifications", response_model=ExpenseClassification)
async def create_expense_classification(data: ExpenseClassificationCreate, current_user: User = Depends(get_current_user)):
    """Cria uma nova classificação de despesas"""
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db_call(sqlite_db.get_expense_classification_by_name, data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Classificação já existe")
    
    class_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    await db_call(sqlite_db.create_expense_classification, {
        "id": class_id,
        "name": data.name,
        "created_at": created_at.isoformat()
    })
    
    await log_audit("CREATE", "expense_classification", data.name, current_user, "baixa")
    
    return ExpenseClassification(id=class_id, name=data.name, created_at=created_at)


@api_router.put("/expense-classifications/{classification_id}", response_model=ExpenseClassification)
async def update_expense_classification(classification_id: str, data: ExpenseClassificationCreate, current_user: User = Depends(get_current_user)):
    """Atualiza uma classificação de despesas"""
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db_call(sqlite_db.get_expense_classification_by_id, classification_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Classificação não encontrada")
    
    name_exists = await db_call(sqlite_db.get_expense_classification_by_name, data.name)
    if name_exists and name_exists["id"] != classification_id:
        raise HTTPException(status_code=400, detail="Nome de classificação já existe")
    
    old_name = existing["name"]
    await db_call(sqlite_db.update_expense_classification, classification_id, {"name": data.name})
    
    # Atualizar todas as despesas que usam essa classificação
    expenses = await db_call(sqlite_db.get_all_expenses)
    for e in expenses:
        if e.get("classification_id") == classification_id:
            await db_call(sqlite_db.update_expense, e["id"], {"classification_name": data.name})
    
    await log_audit("UPDATE", "expense_classification", f"{old_name} → {data.name}", current_user, "media")
    
    updated = await db_call(sqlite_db.get_expense_classification_by_id, classification_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    return ExpenseClassification(**updated)


@api_router.delete("/expense-classifications/{classification_id}")
async def delete_expense_classification(classification_id: str, current_user: User = Depends(get_current_user)):
    """Deleta uma classificação de despesas"""
    check_role(current_user, ["proprietario", "administrador"])
    
    classification = await db_call(sqlite_db.get_expense_classification_by_id, classification_id)
    if not classification:
        raise HTTPException(status_code=404, detail="Classificação não encontrada")
    
    # Verificar se alguma despesa usa essa classificação
    expenses = await db_call(sqlite_db.get_expenses_by_classification, classification_id)
    if expenses:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível excluir. {len(expenses)} despesa(s) usa(m) esta classificação."
        )
    
    await db_call(sqlite_db.delete_expense_classification, classification_id)
    await log_audit("DELETE", "expense_classification", classification["name"], current_user, "alta")
    
    return {"message": "Classificação deletada"}


@api_router.post("/expense-classifications/initialize")
async def initialize_expense_classifications(current_user: User = Depends(get_current_user)):
    """Inicializa classificações padrão se não existirem"""
    check_role(current_user, ["proprietario", "administrador"])
    
    default_classifications = [
        "Água", "Energia", "Aluguel", "Internet", "Telefone", 
        "Seguro", "Manutenção", "Marketing", "Salários", "Impostos", "Outros"
    ]
    created = []
    
    for name in default_classifications:
        existing = await db_call(sqlite_db.get_expense_classification_by_name, name)
        if not existing:
            class_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc)
            await db_call(sqlite_db.create_expense_classification, {
                "id": class_id,
                "name": name,
                "created_at": created_at.isoformat()
            })
            created.append(name)
    
    return {"message": "Classificações inicializadas", "created": created}


# ==================== EXPENSE ENDPOINTS ====================

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(current_user: User = Depends(get_current_user)):
    """Lista todas as despesas"""
    expenses = await db_call(sqlite_db.get_all_expenses)
    for e in expenses:
        if isinstance(e.get("created_at"), str):
            e["created_at"] = datetime.fromisoformat(e["created_at"].replace('Z', '+00:00'))
        e["is_paid"] = bool(e.get("is_paid", 0))
        e["is_recurring"] = bool(e.get("is_recurring", 0))
    return expenses


@api_router.get("/expenses/stats", response_model=ExpenseStats)
async def get_expenses_stats(current_user: User = Depends(get_current_user)):
    """Retorna estatísticas das despesas"""
    stats = await db_call(sqlite_db.get_expenses_stats)
    return ExpenseStats(**stats)


@api_router.get("/expenses/pending", response_model=List[Expense])
async def get_pending_expenses(current_user: User = Depends(get_current_user)):
    """Lista despesas pendentes"""
    expenses = await db_call(sqlite_db.get_pending_expenses)
    for e in expenses:
        if isinstance(e.get("created_at"), str):
            e["created_at"] = datetime.fromisoformat(e["created_at"].replace('Z', '+00:00'))
        e["is_paid"] = bool(e.get("is_paid", 0))
        e["is_recurring"] = bool(e.get("is_recurring", 0))
    return expenses


@api_router.get("/expenses/month/{year}/{month}", response_model=List[Expense])
async def get_expenses_by_month(year: int, month: int, current_user: User = Depends(get_current_user)):
    """Lista despesas de um mês específico"""
    expenses = await db_call(sqlite_db.get_expenses_by_month, year, month)
    for e in expenses:
        if isinstance(e.get("created_at"), str):
            e["created_at"] = datetime.fromisoformat(e["created_at"].replace('Z', '+00:00'))
        e["is_paid"] = bool(e.get("is_paid", 0))
        e["is_recurring"] = bool(e.get("is_recurring", 0))
    return expenses


@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    """Cria uma nova despesa"""
    check_role(current_user, ["proprietario", "administrador"])
    
    # Buscar nome da classificação se tiver ID
    classification_name = expense_data.classification_name
    if expense_data.classification_id and not classification_name:
        classification = await db_call(sqlite_db.get_expense_classification_by_id, expense_data.classification_id)
        if classification:
            classification_name = classification["name"]
    
    expense_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    
    expense_dict = {
        "id": expense_id,
        "name": expense_data.name,
        "classification_id": expense_data.classification_id,
        "classification_name": classification_name,
        "supplier": expense_data.supplier,
        "value": expense_data.value,
        "due_date": expense_data.due_date,
        "is_paid": expense_data.is_paid,
        "paid_date": expense_data.paid_date,
        "is_recurring": expense_data.is_recurring,
        "recurring_period": expense_data.recurring_period,
        "installments_total": expense_data.installments_total or 0,
        "installment_number": expense_data.installment_number or 1,
        "parent_expense_id": expense_data.parent_expense_id,
        "attachment_url": expense_data.attachment_url,
        "notes": expense_data.notes,
        "created_at": created_at.isoformat()
    }
    
    await db_call(sqlite_db.create_expense, expense_dict)
    
    # Se é recorrente ou tem parcelas, gerar as próximas despesas
    created_expenses = [expense_id]
    
    if expense_data.is_recurring and expense_data.recurring_period:
        # Gerar despesas recorrentes para os próximos 12 meses
        from dateutil.relativedelta import relativedelta
        
        base_date = datetime.strptime(expense_data.due_date, "%Y-%m-%d")
        
        for i in range(1, 12):
            if expense_data.recurring_period == "monthly":
                next_date = base_date + relativedelta(months=i)
            elif expense_data.recurring_period == "weekly":
                next_date = base_date + timedelta(weeks=i)
            elif expense_data.recurring_period == "yearly":
                next_date = base_date + relativedelta(years=i)
            else:
                break
            
            child_id = str(uuid.uuid4())
            child_dict = {
                "id": child_id,
                "name": expense_data.name,
                "classification_id": expense_data.classification_id,
                "classification_name": classification_name,
                "supplier": expense_data.supplier,
                "value": expense_data.value,
                "due_date": next_date.strftime("%Y-%m-%d"),
                "is_paid": False,
                "is_recurring": True,
                "recurring_period": expense_data.recurring_period,
                "parent_expense_id": expense_id,
                "notes": expense_data.notes,
                "created_at": created_at.isoformat()
            }
            await db_call(sqlite_db.create_expense, child_dict)
            created_expenses.append(child_id)
    
    elif expense_data.installments_total and expense_data.installments_total > 1:
        # Gerar parcelas
        from dateutil.relativedelta import relativedelta
        
        base_date = datetime.strptime(expense_data.due_date, "%Y-%m-%d")
        installment_value = expense_data.value
        
        for i in range(2, expense_data.installments_total + 1):
            next_date = base_date + relativedelta(months=i-1)
            
            child_id = str(uuid.uuid4())
            child_dict = {
                "id": child_id,
                "name": f"{expense_data.name} ({i}/{expense_data.installments_total})",
                "classification_id": expense_data.classification_id,
                "classification_name": classification_name,
                "supplier": expense_data.supplier,
                "value": installment_value,
                "due_date": next_date.strftime("%Y-%m-%d"),
                "is_paid": False,
                "installments_total": expense_data.installments_total,
                "installment_number": i,
                "parent_expense_id": expense_id,
                "notes": expense_data.notes,
                "created_at": created_at.isoformat()
            }
            await db_call(sqlite_db.create_expense, child_dict)
            created_expenses.append(child_id)
        
        # Atualizar a primeira parcela com o número correto
        await db_call(sqlite_db.update_expense, expense_id, {
            "name": f"{expense_data.name} (1/{expense_data.installments_total})",
            "installment_number": 1
        })
    
    await log_audit("CREATE", "expense", expense_data.name, current_user, "media", {"total_created": len(created_expenses)})
    
    created = await db_call(sqlite_db.get_expense_by_id, expense_id)
    created["created_at"] = created_at
    created["is_paid"] = bool(created.get("is_paid", 0))
    created["is_recurring"] = bool(created.get("is_recurring", 0))
    return Expense(**created)


@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    """Atualiza uma despesa"""
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db_call(sqlite_db.get_expense_by_id, expense_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    
    # Buscar nome da classificação se tiver ID
    classification_name = expense_data.classification_name
    if expense_data.classification_id and not classification_name:
        classification = await db_call(sqlite_db.get_expense_classification_by_id, expense_data.classification_id)
        if classification:
            classification_name = classification["name"]
    
    update_data = {
        "name": expense_data.name,
        "classification_id": expense_data.classification_id,
        "classification_name": classification_name,
        "supplier": expense_data.supplier,
        "value": expense_data.value,
        "due_date": expense_data.due_date,
        "is_paid": expense_data.is_paid,
        "paid_date": expense_data.paid_date,
        "is_recurring": expense_data.is_recurring,
        "recurring_period": expense_data.recurring_period,
        "installments_total": expense_data.installments_total,
        "installment_number": expense_data.installment_number,
        "attachment_url": expense_data.attachment_url,
        "notes": expense_data.notes
    }
    
    await db_call(sqlite_db.update_expense, expense_id, update_data)
    await log_audit("UPDATE", "expense", expense_data.name, current_user, "media")
    
    updated = await db_call(sqlite_db.get_expense_by_id, expense_id)
    if isinstance(updated.get("created_at"), str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"].replace('Z', '+00:00'))
    updated["is_paid"] = bool(updated.get("is_paid", 0))
    updated["is_recurring"] = bool(updated.get("is_recurring", 0))
    return Expense(**updated)


@api_router.patch("/expenses/{expense_id}/toggle-paid")
async def toggle_expense_paid(expense_id: str, current_user: User = Depends(get_current_user)):
    """Alterna o status de pagamento de uma despesa"""
    check_role(current_user, ["proprietario", "administrador"])
    
    expense = await db_call(sqlite_db.get_expense_by_id, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    
    new_status = not bool(expense.get("is_paid", 0))
    paid_date = datetime.now(timezone.utc).strftime("%Y-%m-%d") if new_status else None
    
    await db_call(sqlite_db.update_expense, expense_id, {
        "is_paid": new_status,
        "paid_date": paid_date
    })
    
    await log_audit("UPDATE", "expense", f"{expense['name']} - {'Pago' if new_status else 'Pendente'}", current_user, "baixa")
    
    return {"message": "Status atualizado", "is_paid": new_status, "paid_date": paid_date}


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, delete_children: bool = False, current_user: User = Depends(get_current_user)):
    """Deleta uma despesa. Se delete_children=true e é recorrente/parcelada, deleta esta e todas as futuras."""
    check_role(current_user, ["proprietario", "administrador"])
    
    expense = await db_call(sqlite_db.get_expense_by_id, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    
    deleted_count = 1
    
    # Se pediu para deletar sequência (recorrentes ou parcelas futuras)
    if delete_children and (expense.get("is_recurring") or expense.get("installments_total", 0) > 1):
        all_expenses = await db_call(sqlite_db.get_all_expenses)
        
        # Encontrar despesas relacionadas (mesmo nome base, mesma classificação, data >= data atual)
        expense_due_date = expense.get("due_date", "")
        expense_name_base = expense.get("name", "").split(" (")[0]  # Remove " (1/3)" do nome se tiver
        expense_classification = expense.get("classification_id")
        
        # Filtrar despesas futuras da mesma série
        related_expenses = []
        for e in all_expenses:
            if e["id"] == expense_id:
                continue
            
            e_name_base = e.get("name", "").split(" (")[0]
            e_classification = e.get("classification_id")
            e_due_date = e.get("due_date", "")
            
            # Mesmo nome base, mesma classificação, data >= data da despesa atual
            if (e_name_base == expense_name_base and 
                e_classification == expense_classification and
                e_due_date >= expense_due_date and
                (e.get("is_recurring") or e.get("installments_total", 0) > 1 or e.get("parent_expense_id"))):
                related_expenses.append(e)
        
        # Deletar todas as relacionadas
        for related in related_expenses:
            await db_call(sqlite_db.delete_expense, related["id"])
            deleted_count += 1
    
    # Deletar a despesa principal
    await db_call(sqlite_db.delete_expense, expense_id)
    await log_audit("DELETE", "expense", f"{expense['name']} ({deleted_count} despesas)", current_user, "alta")
    
    return {"message": "Despesa(s) deletada(s)", "deleted_count": deleted_count}


# Reports endpoints
@api_router.get("/reports/price-history/{ingredient_id}", response_model=IngredientWithHistory)
async def get_price_history(ingredient_id: str, current_user: User = Depends(get_current_user)):
    ingredient = await db_call(sqlite_db.get_ingredient_by_id, ingredient_id)
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    if isinstance(ingredient.get("created_at"), str):
        ingredient["created_at"] = datetime.fromisoformat(ingredient["created_at"].replace('Z', '+00:00'))
    
    purchases = await db_call(sqlite_db.get_purchases_by_ingredient, ingredient_id)
    
    history = []
    for p in purchases:
        date_str = p["purchase_date"] if isinstance(p["purchase_date"], str) else p["purchase_date"].strftime("%Y-%m-%d")
        history.append(PriceHistory(date=date_str, price=p["unit_price"]))
    
    return IngredientWithHistory(ingredient=Ingredient(**ingredient), history=history)

@api_router.get("/reports/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_ingredients = await db_call(sqlite_db.count_ingredients)
    total_products = await db_call(sqlite_db.count_products)
    total_purchases = await db_call(sqlite_db.count_purchases)
    
    products = await db_call(sqlite_db.get_all_products)
    avg_cmv = sum(p.get("cmv", 0) for p in products) / len(products) if products else 0
    
    return DashboardStats(
        total_ingredients=total_ingredients,
        total_products=total_products,
        total_purchases=total_purchases,
        avg_cmv=avg_cmv
    )


# Endpoint para verificar status do banco
@api_router.get("/backup/status")
async def get_backup_status(current_user: User = Depends(get_current_user)):
    """Retorna informações sobre o banco SQLite"""
    from pathlib import Path
    db_path = Path("/app/backend/data_backup/nucleo.db")
    
    return {
        "type": "SQLite",
        "path": str(db_path),
        "exists": db_path.exists(),
        "size_mb": round(db_path.stat().st_size / 1024 / 1024, 2) if db_path.exists() else 0,
        "ingredients": await db_call(sqlite_db.count_ingredients),
        "products": await db_call(sqlite_db.count_products),
        "purchases": await db_call(sqlite_db.count_purchases),
        "users": await db_call(sqlite_db.count_users)
    }


# Endpoint para forçar backup manual (agora retorna apenas status)
@api_router.post("/backup/sync")
async def force_backup_sync(current_user: User = Depends(get_current_user)):
    """SQLite é persistente automaticamente"""
    check_role(current_user, ["proprietario"])
    return {"message": "SQLite é persistente por padrão - não necessita sincronização manual"}


# ==================== ENDPOINTS DE BUGS E SISTEMA ====================

@api_router.get("/system/bugs")
async def get_bugs(limit: int = 100, current_user: User = Depends(get_current_user)):
    """Retorna lista de bugs registrados"""
    check_role(current_user, ["proprietario", "administrador"])
    bugs = bug_tracker.get_all_bugs(limit=limit)
    return {"bugs": bugs, "total": len(bugs)}

@api_router.get("/system/requests-log")
async def get_requests_log(limit: int = 200, current_user: User = Depends(get_current_user)):
    """Retorna logs de requisições"""
    check_role(current_user, ["proprietario", "administrador"])
    logs = bug_tracker.get_request_logs(limit=limit)
    return {"logs": logs, "total": len(logs)}

@api_router.get("/system/info")
async def get_system_info(current_user: User = Depends(get_current_user)):
    """Retorna informações do sistema"""
    check_role(current_user, ["proprietario", "administrador"])
    info = bug_tracker.get_system_info()
    
    # Adicionar info do banco
    info['database'] = {
        'ingredients': await db_call(sqlite_db.count_ingredients),
        'products': await db_call(sqlite_db.count_products),
        'purchases': await db_call(sqlite_db.count_purchases),
        'users': await db_call(sqlite_db.count_users),
        'categories': await db_call(sqlite_db.count_categories) if hasattr(sqlite_db, 'count_categories') else 0
    }
    
    return info

@api_router.delete("/system/bugs")
async def clear_all_bugs(current_user: User = Depends(get_current_user)):
    """Limpa todos os bugs"""
    check_role(current_user, ["proprietario"])
    bug_tracker.clear_bugs()
    return {"message": "Todos os bugs foram limpos"}

@api_router.post("/system/bugs/{bug_id}/status")
async def update_bug_status(bug_id: str, new_status: str, current_user: User = Depends(get_current_user)):
    """Atualiza status de um bug"""
    check_role(current_user, ["proprietario", "administrador"])
    if new_status not in ['new', 'investigating', 'fixed', 'ignored']:
        raise HTTPException(status_code=400, detail="Status inválido")
    bug_tracker.update_bug_status(bug_id, new_status)
    return {"message": f"Bug {bug_id} atualizado para {new_status}"}

@api_router.post("/system/report-bug")
async def report_bug_manually(
    error_type: str,
    message: str,
    endpoint: str = "manual_report",
    current_user: User = Depends(get_current_user)
):
    """Permite reportar um bug manualmente"""
    bug = bug_tracker.log_bug(
        error_type=error_type,
        message=message,
        endpoint=endpoint,
        user_id=current_user.id
    )
    return {"message": "Bug reportado com sucesso", "bug_id": bug.id}


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def get_frontend_path():
    """
    Localiza o frontend build de forma robusta.
    
    PRIORIDADE:
    1. NUCLEO_FRONTEND_PATH (definido pelo Electron)
    2. sys._MEIPASS (PyInstaller bundle)
    3. Diretório ao lado do executável
    4. ../frontend/build (desenvolvimento)
    """
    import sys
    
    # 1. Variável de ambiente do Electron
    env_path = os.environ.get("NUCLEO_FRONTEND_PATH")
    if env_path:
        p = Path(env_path)
        if p.exists() and (p / "index.html").exists():
            logger.info(f"[FRONTEND] Usando NUCLEO_FRONTEND_PATH: {p}")
            return p
    
    # 2. PyInstaller frozen
    if getattr(sys, 'frozen', False):
        # Caminho do resources (Electron production)
        exe_dir = Path(sys.executable).parent
        
        # Tentar ../frontend (resources path)
        p = exe_dir.parent / "frontend"
        if p.exists() and (p / "index.html").exists():
            logger.info(f"[FRONTEND] Usando resources/frontend: {p}")
            return p
        
        # Tentar ao lado do exe
        p = exe_dir / "frontend"
        if p.exists() and (p / "index.html").exists():
            logger.info(f"[FRONTEND] Usando exe_dir/frontend: {p}")
            return p
    
    # 3. Desenvolvimento
    p = Path(__file__).parent.parent / "frontend" / "build"
    if p.exists() and (p / "index.html").exists():
        logger.info(f"[FRONTEND] Usando dev frontend/build: {p}")
        return p
    
    logger.warning("[FRONTEND] Nenhum frontend encontrado!")
    return None


# Frontend path global
FRONTEND_PATH = None


def setup_static_files():
    """Configura servir arquivos estáticos do React build"""
    global FRONTEND_PATH
    
    FRONTEND_PATH = get_frontend_path()
    
    if not FRONTEND_PATH:
        logger.warning("[STATIC] Frontend não encontrado - apenas API disponível")
        return False
    
    logger.info(f"[STATIC] Servindo React de: {FRONTEND_PATH}")
    
    # Montar /static
    static_dir = FRONTEND_PATH / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
        logger.info(f"[STATIC] /static montado de: {static_dir}")
    
    return True


# Criar diretórios de upload no startup
@app.on_event("startup")
async def startup_event():
    # Determinar diretório base para uploads
    data_path = os.environ.get("NUCLEO_DATA_PATH")
    if data_path:
        upload_dir = Path(data_path) / "uploads" / "products"
    else:
        upload_dir = Path("/app/backend/uploads/products")
    
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Inicializar banco SQLite
    await db_call(sqlite_db.init_database)
    
    # Configurar arquivos estáticos
    setup_static_files()
    
    # Log status
    ing_count = await db_call(sqlite_db.count_ingredients)
    prod_count = await db_call(sqlite_db.count_products)
    user_count = await db_call(sqlite_db.count_users)
    
    db_path = os.environ.get("NUCLEO_DB_PATH", "/app/backend/data_backup/nucleo.db")
    logger.info(f"[STARTUP] SQLite inicializado em: {db_path}")
    logger.info(f"[STARTUP] Ingredientes: {ing_count}, Produtos: {prod_count}, Usuários: {user_count}")
    logger.info("[STARTUP] Sistema iniciado com sucesso - 100% SQLite")

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("[SHUTDOWN] Sistema encerrado")


# ==================== DESKTOP/HEALTH ENDPOINTS ====================

class SystemSettingsUpdate(BaseModel):
    skip_login: Optional[bool] = None
    theme: Optional[str] = None

@api_router.get("/health")
async def health_check():
    """Endpoint de healthcheck para o Electron verificar se o backend está rodando"""
    try:
        # Verificar conexão com banco
        db_info = await db_call(sqlite_db.get_database_info)
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {
                "path": db_info.get("path"),
                "size_bytes": db_info.get("size_bytes"),
                "tables": db_info.get("tables")
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@api_router.get("/desktop/system-info")
async def get_desktop_system_info():
    """Retorna informações do sistema para diagnóstico desktop"""
    db_info = await db_call(sqlite_db.get_database_info)
    settings = await db_call(sqlite_db.get_all_settings)
    
    return {
        "version": "1.0.0",
        "database": db_info,
        "settings": settings,
        "environment": {
            "data_path": os.environ.get("NUCLEO_DATA_PATH", "N/A"),
            "db_path": os.environ.get("NUCLEO_DB_PATH", "N/A"),
            "logs_path": os.environ.get("NUCLEO_LOGS_PATH", "N/A"),
            "port": os.environ.get("NUCLEO_PORT", "8001")
        }
    }

@api_router.get("/system/settings")
async def get_system_settings():
    """Retorna configurações do sistema"""
    settings = await db_call(sqlite_db.get_all_settings)
    return {
        "skip_login": settings.get("skip_login", "false") == "true",
        "theme": settings.get("theme", "light")
    }

@api_router.put("/system/settings")
async def update_system_settings(settings_data: SystemSettingsUpdate, current_user: User = Depends(get_current_user)):
    """Atualiza configurações do sistema"""
    check_role(current_user, ["proprietario", "administrador"])
    
    if settings_data.skip_login is not None:
        await db_call(sqlite_db.set_setting, "skip_login", "true" if settings_data.skip_login else "false")
    
    if settings_data.theme is not None:
        await db_call(sqlite_db.set_setting, "theme", settings_data.theme)
    
    # Registrar auditoria
    await log_audit("UPDATE", "system", "Configurações do Sistema", current_user, "alta", {
        "skip_login": settings_data.skip_login,
        "theme": settings_data.theme
    })
    
    return await get_system_settings()

@api_router.get("/system/logs")
async def get_system_logs():
    """Retorna caminho dos logs para diagnóstico"""
    logs_path = os.environ.get("NUCLEO_LOGS_PATH", "/app/backend/logs")
    log_file = os.path.join(logs_path, "nucleo.log") if logs_path else None
    
    # Tentar ler últimas linhas do log
    log_content = []
    if log_file and os.path.exists(log_file):
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                log_content = lines[-100:]  # Últimas 100 linhas
        except Exception as e:
            log_content = [f"Erro ao ler logs: {str(e)}"]
    
    return {
        "logs_path": logs_path,
        "log_file": log_file,
        "recent_logs": log_content
    }

@api_router.post("/auth/force-change-password")
async def force_change_password(password_data: ChangePassword, current_user: User = Depends(get_current_user)):
    """Força troca de senha (para primeiro login do admin)"""
    user_doc = await db_call(sqlite_db.get_user_by_id, current_user.id)
    
    # Verificar senha atual usando hash
    if not user_doc or not sqlite_db.verify_password(user_doc.get("password", ""), password_data.old_password):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    # Atualizar senha (será hasheada automaticamente) e remover flag de must_change_password
    await db_call(sqlite_db.update_user, current_user.id, {
        "password": password_data.new_password,
        "must_change_password": 0
    })
    
    return {"message": "Senha alterada com sucesso", "must_change_password": False}

@api_router.get("/auth/check-must-change-password")
async def check_must_change_password(current_user: User = Depends(get_current_user)):
    """Verifica se usuário deve trocar senha no primeiro login"""
    user_doc = await db_call(sqlite_db.get_user_by_id, current_user.id)
    must_change = bool(user_doc.get("must_change_password", 0)) if user_doc else False
    return {"must_change_password": must_change}


# Include router APÓS definir todos os endpoints
app.include_router(api_router)


# ==================== ROTAS DO FRONTEND (SPA) ====================
# Definidas APÓS api_router para não conflitar

@app.get("/", include_in_schema=False)
async def serve_root():
    """Serve o index.html do React"""
    if FRONTEND_PATH and (FRONTEND_PATH / "index.html").exists():
        return FileResponse(str(FRONTEND_PATH / "index.html"))
    return {"message": "Núcleo API", "health": "/api/health", "docs": "/docs"}


# Esta rota DEVE vir por último para ser catch-all
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    """Serve arquivos estáticos ou index.html para rotas do React (SPA)"""
    # Ignorar rotas da API (já tratadas pelo api_router)
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Endpoint não encontrado")
    
    # Se frontend não configurado
    if not FRONTEND_PATH:
        raise HTTPException(status_code=404, detail="Frontend não disponível")
    
    # Verificar se é arquivo estático
    file_path = FRONTEND_PATH / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    
    # Retornar index.html para rotas do React (SPA)
    index_path = FRONTEND_PATH / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    
    raise HTTPException(status_code=404, detail="Página não encontrada")



# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    
    # Porta configurável via variável de ambiente (para Electron)
    port = int(os.environ.get("NUCLEO_PORT", 8001))
    host = os.environ.get("NUCLEO_HOST", "0.0.0.0")
    
    logger.info(f"[MAIN] Iniciando servidor em {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
