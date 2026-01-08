from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from PIL import Image
import shutil

# Sistema de Backup em Excel
import excel_backup

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

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
    units_per_package: Optional[int] = None
    unit_weight: Optional[float] = None

class Ingredient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str
    units_per_package: Optional[int] = None
    unit_weight: Optional[float] = None
    average_price: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchaseItemCreate(BaseModel):
    ingredient_id: str
    quantity: float
    price: float

class PurchaseBatchCreate(BaseModel):
    supplier: str
    purchase_date: Optional[str] = None
    items: List[PurchaseItemCreate]

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

class PurchaseBatch(BaseModel):
    batch_id: str
    supplier: str
    purchase_date: datetime
    total_quantity: float
    total_price: float
    items: List[Purchase]

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

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    sale_price: Optional[float] = None
    photo_url: Optional[str] = None
    recipe: List[RecipeIngredient]

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    sale_price: Optional[float] = None
    photo_url: Optional[str] = None
    recipe: List[RecipeIngredient]
    cmv: float = 0.0
    profit_margin: Optional[float] = None
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
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


async def log_audit(action: str, resource_type: str, resource_name: str, user: User, priority: str, details: dict = None):
    """Registra uma ação no log de auditoria"""
    audit = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_name=resource_name,
        user_id=user.id,
        username=user.username,
        priority=priority,
        details=details
    )
    doc = audit.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.audit_logs.insert_one(doc)

def check_role(user: User, allowed_roles: List[str]):
    """Verifica se o usuário tem permissão baseada no role"""
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403, 
            detail=f"Permissão negada. Necessário: {', '.join(allowed_roles)}"
        )


# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = pwd_context.hash(user_data.password)
    
    # Primeiro usuário (Addad) é proprietário, demais são observadores
    user_count = await db.users.count_documents({})
    role = "proprietario" if user_count == 0 or user_data.username == "Addad" else "observador"
    
    user = User(username=user_data.username, role=role)
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user_doc = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if not user_doc or not pwd_context.verify(user_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)


# User Management endpoints
@api_router.get("/users/management", response_model=List[UserWithPassword])
async def get_users_management(current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    for u in users:
        if isinstance(u["created_at"], str):
            u["created_at"] = datetime.fromisoformat(u["created_at"])
    return users

@api_router.post("/users/create", response_model=User)
async def create_user_management(user_data: UserManagementCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if user_data.role not in ["proprietario", "administrador", "observador"]:
        raise HTTPException(status_code=400, detail="Role inválido")
    
    hashed_password = pwd_context.hash(user_data.password)
    user = User(username=user_data.username, role=user_data.role)
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Registrar auditoria
    await log_audit("CREATE", "user", user_data.username, current_user, "media", {"role": user_data.role})
    
    return user

@api_router.put("/users/{user_id}/role", response_model=User)
async def update_user_role(user_id: str, role_data: UserManagementUpdate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    
    if role_data.role not in ["proprietario", "administrador", "observador"]:
        raise HTTPException(status_code=400, detail="Role inválido")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": role_data.role}})
    
    # Registrar auditoria
    await log_audit("UPDATE", "user", user["username"], current_user, "media", {"new_role": role_data.role})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return User(**updated)

@api_router.put("/users/change-password")
async def change_password(password_data: ChangePassword, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not user_doc or not pwd_context.verify(password_data.old_password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Senha atual incorreta")
    
    new_hashed = pwd_context.hash(password_data.new_password)
    await db.users.update_one({"id": current_user.id}, {"$set": {"password": new_hashed}})
    
    return {"message": "Senha alterada com sucesso"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario"])
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Você não pode deletar sua própria conta")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    await db.users.delete_one({"id": user_id})
    
    # Registrar auditoria
    await log_audit("DELETE", "user", user["username"], current_user, "alta")
    
    return {"message": "Usuário deletado"}

# Audit Log endpoints
@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    for log in logs:
        if isinstance(log["timestamp"], str):
            log["timestamp"] = datetime.fromisoformat(log["timestamp"])
    return logs

# Ingredient endpoints
@api_router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(ingredient_data: IngredientCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    ingredient = Ingredient(**ingredient_data.model_dump())
    doc = ingredient.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.ingredients.insert_one(doc)
    
    # Registrar auditoria
    await log_audit("CREATE", "ingredient", ingredient_data.name, current_user, "baixa")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return ingredient

@api_router.get("/ingredients", response_model=List[Ingredient])
async def get_ingredients(current_user: User = Depends(get_current_user)):
    ingredients = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
    for ing in ingredients:
        if isinstance(ing["created_at"], str):
            ing["created_at"] = datetime.fromisoformat(ing["created_at"])
    return ingredients

@api_router.put("/ingredients/{ingredient_id}", response_model=Ingredient)
async def update_ingredient(ingredient_id: str, ingredient_data: IngredientCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    update_data = ingredient_data.model_dump()
    await db.ingredients.update_one({"id": ingredient_id}, {"$set": update_data})
    
    # Registrar auditoria
    await log_audit("UPDATE", "ingredient", ingredient_data.name, current_user, "media")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    updated = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Ingredient(**updated)

@api_router.get("/ingredients/{ingredient_id}/usage")
async def check_ingredient_usage(ingredient_id: str, current_user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
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
    
    # Check if ingredient is used in any product
    ingredient = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
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
    
    result = await db.ingredients.delete_one({"id": ingredient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    await db.purchases.delete_many({"ingredient_id": ingredient_id})
    
    # Registrar auditoria
    await log_audit("DELETE", "ingredient", ingredient["name"], current_user, "alta")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return {"message": "Ingredient deleted"}

# Purchase endpoints
@api_router.post("/purchases/batch", response_model=dict)
async def create_purchase_batch(batch_data: PurchaseBatchCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    batch_id = str(uuid.uuid4())
    purchase_date = datetime.fromisoformat(batch_data.purchase_date) if batch_data.purchase_date else datetime.now(timezone.utc)
    
    purchases_created = []
    for item in batch_data.items:
        ingredient = await db.ingredients.find_one({"id": item.ingredient_id}, {"_id": 0})
        if not ingredient:
            continue
        
        unit_price = item.price / item.quantity if item.quantity > 0 else 0
        
        purchase = Purchase(
            batch_id=batch_id,
            supplier=batch_data.supplier,
            ingredient_id=item.ingredient_id,
            ingredient_name=ingredient["name"],
            ingredient_unit=ingredient["unit"],
            quantity=item.quantity,
            price=item.price,
            unit_price=unit_price,
            purchase_date=purchase_date
        )
        
        doc = purchase.model_dump()
        doc["purchase_date"] = doc["purchase_date"].isoformat()
        await db.purchases.insert_one(doc)
        purchases_created.append(purchase)
        
        # Recalculate average price
        purchases = await db.purchases.find({"ingredient_id": item.ingredient_id}, {"_id": 0}).to_list(1000)
        total_quantity = sum(p["quantity"] for p in purchases)
        total_cost = sum(p["price"] for p in purchases)
        avg_price = total_cost / total_quantity if total_quantity > 0 else 0
        
        # If ingredient has units_per_package (for 'un'), divide by it to get unit price
        if ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
            avg_price = avg_price / ingredient["units_per_package"]
        # If ingredient has slices_per_package (for 'kg'), divide by it to get slice price
        await db.ingredients.update_one(
            {"id": item.ingredient_id},
            {"$set": {"average_price": avg_price}}
        )
    
    # Registrar auditoria
    await log_audit("CREATE", "purchase", f"Lote de {batch_data.supplier}", current_user, "baixa", {"items": len(purchases_created)})
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return {"message": "Purchase batch created", "batch_id": batch_id, "items_created": len(purchases_created)}

@api_router.put("/purchases/batch/{batch_id}", response_model=dict)
async def update_purchase_batch(batch_id: str, batch_data: PurchaseBatchCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    # Delete old batch
    old_purchases = await db.purchases.find({"batch_id": batch_id}, {"_id": 0}).to_list(1000)
    if not old_purchases:
        raise HTTPException(status_code=404, detail="Purchase batch not found")
    
    await db.purchases.delete_many({"batch_id": batch_id})
    
    # Create new purchases with same batch_id
    purchase_date = datetime.fromisoformat(batch_data.purchase_date) if batch_data.purchase_date else datetime.now(timezone.utc)
    
    purchases_created = []
    affected_ingredients = set()
    
    for item in batch_data.items:
        ingredient = await db.ingredients.find_one({"id": item.ingredient_id}, {"_id": 0})
        if not ingredient:
            continue
        
        affected_ingredients.add(item.ingredient_id)
        unit_price = item.price / item.quantity if item.quantity > 0 else 0
        
        purchase = Purchase(
            batch_id=batch_id,
            supplier=batch_data.supplier,
            ingredient_id=item.ingredient_id,
            ingredient_name=ingredient["name"],
            ingredient_unit=ingredient["unit"],
            quantity=item.quantity,
            price=item.price,
            unit_price=unit_price,
            purchase_date=purchase_date
        )
        
        doc = purchase.model_dump()
        doc["purchase_date"] = doc["purchase_date"].isoformat()
        await db.purchases.insert_one(doc)
        purchases_created.append(purchase)
    
    # Recalculate average price for all affected ingredients (old and new)
    for old_p in old_purchases:
        affected_ingredients.add(old_p["ingredient_id"])
    
    for ingredient_id in affected_ingredients:
        ingredient = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
        purchases = await db.purchases.find({"ingredient_id": ingredient_id}, {"_id": 0}).to_list(1000)
        
        if purchases:
            total_quantity = sum(p["quantity"] for p in purchases)
            total_cost = sum(p["price"] for p in purchases)
            avg_price = total_cost / total_quantity if total_quantity > 0 else 0
            
            if ingredient and ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
                avg_price = avg_price / ingredient["units_per_package"]
        else:
            avg_price = 0
        
        await db.ingredients.update_one(
            {"id": ingredient_id},
            {"$set": {"average_price": avg_price}}
        )
    
    # Registrar auditoria
    await log_audit("UPDATE", "purchase", f"Lote de {batch_data.supplier}", current_user, "media", {"items": len(purchases_created)})
    
    return {"message": "Purchase batch updated", "batch_id": batch_id, "items_updated": len(purchases_created)}

@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(purchase_data: PurchaseCreate, current_user: User = Depends(get_current_user)):
    ingredient = await db.ingredients.find_one({"id": purchase_data.ingredient_id}, {"_id": 0})
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    unit_price = purchase_data.price / purchase_data.quantity if purchase_data.quantity > 0 else 0
    batch_id = str(uuid.uuid4())
    
    purchase = Purchase(
        batch_id=batch_id,
        supplier="",
        ingredient_id=purchase_data.ingredient_id,
        ingredient_name=ingredient["name"],
        ingredient_unit=ingredient["unit"],
        quantity=purchase_data.quantity,
        price=purchase_data.price,
        unit_price=unit_price,
        purchase_date=datetime.fromisoformat(purchase_data.purchase_date) if purchase_data.purchase_date else datetime.now(timezone.utc)
    )
    
    doc = purchase.model_dump()
    doc["purchase_date"] = doc["purchase_date"].isoformat()
    await db.purchases.insert_one(doc)
    
    # Recalculate average price
    purchases = await db.purchases.find({"ingredient_id": purchase_data.ingredient_id}, {"_id": 0}).to_list(1000)
    total_quantity = sum(p["quantity"] for p in purchases)
    total_cost = sum(p["price"] for p in purchases)
    avg_price = total_cost / total_quantity if total_quantity > 0 else 0
    
    # If ingredient has units_per_package, divide by it to get unit price
    if ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
        avg_price = avg_price / ingredient["units_per_package"]
    await db.ingredients.update_one(
        {"id": purchase_data.ingredient_id},
        {"$set": {"average_price": avg_price}}
    )
    
    return purchase

@api_router.get("/purchases/grouped", response_model=List[PurchaseBatch])
async def get_purchases_grouped(current_user: User = Depends(get_current_user)):
    purchases = await db.purchases.find({}, {"_id": 0}).sort("purchase_date", -1).to_list(1000)
    
    # Group by batch_id
    batches_dict = {}
    for p in purchases:
        if isinstance(p["purchase_date"], str):
            p["purchase_date"] = datetime.fromisoformat(p["purchase_date"])
        
        batch_id = p.get("batch_id", p["id"])
        if batch_id not in batches_dict:
            batches_dict[batch_id] = {
                "batch_id": batch_id,
                "supplier": p.get("supplier", ""),
                "purchase_date": p["purchase_date"],
                "total_quantity": 0,
                "total_price": 0,
                "items": []
            }
        
        batches_dict[batch_id]["total_quantity"] += p["quantity"]
        batches_dict[batch_id]["total_price"] += p["price"]
        batches_dict[batch_id]["items"].append(Purchase(**p))
    
    batches = [PurchaseBatch(**batch) for batch in batches_dict.values()]
    batches.sort(key=lambda x: x.purchase_date, reverse=True)
    return batches

@api_router.get("/purchases", response_model=List[Purchase])
async def get_purchases(current_user: User = Depends(get_current_user)):
    purchases = await db.purchases.find({}, {"_id": 0}).sort("purchase_date", -1).to_list(1000)
    for p in purchases:
        if isinstance(p["purchase_date"], str):
            p["purchase_date"] = datetime.fromisoformat(p["purchase_date"])
    return purchases

@api_router.delete("/purchases/{purchase_id}")
async def delete_purchase(purchase_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    purchase = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    await db.purchases.delete_one({"id": purchase_id})
    
    # Recalculate average price
    ingredient = await db.ingredients.find_one({"id": purchase["ingredient_id"]}, {"_id": 0})
    purchases = await db.purchases.find({"ingredient_id": purchase["ingredient_id"]}, {"_id": 0}).to_list(1000)
    if purchases:
        total_quantity = sum(p["quantity"] for p in purchases)
        total_cost = sum(p["price"] for p in purchases)
        avg_price = total_cost / total_quantity if total_quantity > 0 else 0
        
        # If ingredient has units_per_package, divide by it
        if ingredient and ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
            avg_price = avg_price / ingredient["units_per_package"]
    else:
        avg_price = 0
    
    await db.ingredients.update_one(
        {"id": purchase["ingredient_id"]},
        {"$set": {"average_price": avg_price}}
    )
    
    # Registrar auditoria
    await log_audit("DELETE", "purchase", purchase["ingredient_name"], current_user, "alta")
    
    return {"message": "Purchase deleted"}

@api_router.delete("/purchases/batch/{batch_id}")
async def delete_purchase_batch(batch_id: str, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    purchases = await db.purchases.find({"batch_id": batch_id}, {"_id": 0}).to_list(1000)
    if not purchases:
        raise HTTPException(status_code=404, detail="Purchase batch not found")
    
    # Delete all purchases in batch
    await db.purchases.delete_many({"batch_id": batch_id})
    
    # Recalculate average price for all affected ingredients
    affected_ingredients = set(p["ingredient_id"] for p in purchases)
    for ingredient_id in affected_ingredients:
        ingredient = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
        remaining_purchases = await db.purchases.find({"ingredient_id": ingredient_id}, {"_id": 0}).to_list(1000)
        
        if remaining_purchases:
            total_quantity = sum(p["quantity"] for p in remaining_purchases)
            total_cost = sum(p["price"] for p in remaining_purchases)
            avg_price = total_cost / total_quantity if total_quantity > 0 else 0
            
            # If ingredient has units_per_package, divide by it
            if ingredient and ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
                avg_price = avg_price / ingredient["units_per_package"]
        else:
            avg_price = 0
        
        await db.ingredients.update_one(
            {"id": ingredient_id},
            {"$set": {"average_price": avg_price}}
        )
    
    # Registrar auditoria
    supplier = purchases[0].get("supplier", "Unknown") if purchases else "Unknown"
    await log_audit("DELETE", "purchase", f"Lote de {supplier}", current_user, "alta", {"items": len(purchases)})
    
    return {"message": "Purchase batch deleted", "purchases_deleted": len(purchases)}

# Product endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    # Calculate CMV
    cmv = 0.0
    for recipe_item in product_data.recipe:
        ingredient = await db.ingredients.find_one({"id": recipe_item.ingredient_id}, {"_id": 0})
        if ingredient:
            avg_price = ingredient.get("average_price", 0)
            quantity = recipe_item.quantity
            
            # Se o ingrediente tem unit_weight (peso por unidade) E a quantidade é inteira (unidades)
            # Ex: Hamburguer 130g com unit_weight=0.130, quantidade=1 -> usa 0.130kg
            # Mas se quantidade já é decimal (0.13kg), não multiplicar por unit_weight
            unit_weight = ingredient.get("unit_weight")
            is_whole_number = quantity == int(quantity)  # Verifica se é número inteiro
            
            if unit_weight and unit_weight > 0 and is_whole_number and quantity >= 1:
                # Quantidade em unidades: Preço por kg * peso unitário * quantidade de unidades
                cmv += avg_price * unit_weight * quantity
            else:
                # Quantidade já em kg/fração: preço médio * quantidade
                cmv += avg_price * quantity
    
    product = Product(**product_data.model_dump(), cmv=cmv)
    
    # Calculate profit margin if sale price exists
    if product.sale_price and product.sale_price > 0:
        product.profit_margin = ((product.sale_price - cmv) / product.sale_price) * 100
    
    doc = product.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    
    # Registrar auditoria
    await log_audit("CREATE", "product", product_data.name, current_user, "baixa")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for p in products:
        if isinstance(p["created_at"], str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
    return products

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Recalculate CMV
    cmv = 0.0
    for recipe_item in product_data.recipe:
        ingredient = await db.ingredients.find_one({"id": recipe_item.ingredient_id}, {"_id": 0})
        if ingredient:
            avg_price = ingredient.get("average_price", 0)
            quantity = recipe_item.quantity
            
            # Se o ingrediente tem unit_weight (peso por unidade) E a quantidade é inteira (unidades)
            # Ex: Hamburguer 130g com unit_weight=0.130, quantidade=1 -> usa 0.130kg
            # Mas se quantidade já é decimal (0.13kg), não multiplicar por unit_weight
            unit_weight = ingredient.get("unit_weight")
            is_whole_number = quantity == int(quantity)  # Verifica se é número inteiro
            
            if unit_weight and unit_weight > 0 and is_whole_number and quantity >= 1:
                # Quantidade em unidades: Preço por kg * peso unitário * quantidade de unidades
                cmv += avg_price * unit_weight * quantity
            else:
                # Quantidade já em kg/fração: preço médio * quantidade
                cmv += avg_price * quantity
    
    profit_margin = None
    if product_data.sale_price and product_data.sale_price > 0:
        profit_margin = ((product_data.sale_price - cmv) / product_data.sale_price) * 100
    
    update_data = product_data.model_dump()
    update_data["cmv"] = cmv
    update_data["profit_margin"] = profit_margin
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    # Registrar auditoria
    await log_audit("UPDATE", "product", product_data.name, current_user, "media")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
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
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Registrar auditoria
    await log_audit("DELETE", "product", product["name"], current_user, "alta")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return {"message": "Product deleted"}


# Category endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: User = Depends(get_current_user)):
    """Retorna todas as categorias cadastradas"""
    categories = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    for cat in categories:
        if isinstance(cat.get("created_at"), str):
            cat["created_at"] = datetime.fromisoformat(cat["created_at"])
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    """Cria uma nova categoria"""
    check_role(current_user, ["proprietario", "administrador"])
    
    # Verificar se já existe
    existing = await db.categories.find_one({"name": category_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Categoria já existe")
    
    category = Category(name=category_data.name)
    doc = category.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.categories.insert_one(doc)
    
    # Registrar auditoria
    await log_audit("CREATE", "category", category_data.name, current_user, "baixa")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: User = Depends(get_current_user)):
    """Atualiza uma categoria"""
    check_role(current_user, ["proprietario", "administrador"])
    
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se novo nome já existe
    name_exists = await db.categories.find_one({"name": category_data.name, "id": {"$ne": category_id}}, {"_id": 0})
    if name_exists:
        raise HTTPException(status_code=400, detail="Nome de categoria já existe")
    
    old_name = existing["name"]
    await db.categories.update_one({"id": category_id}, {"$set": {"name": category_data.name}})
    
    # Atualizar todos os produtos que usam essa categoria
    await db.products.update_many({"category": old_name}, {"$set": {"category": category_data.name}})
    
    # Registrar auditoria
    await log_audit("UPDATE", "category", f"{old_name} → {category_data.name}", current_user, "media")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    """Deleta uma categoria"""
    check_role(current_user, ["proprietario", "administrador"])
    
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # Verificar se algum produto usa essa categoria
    products_using = await db.products.count_documents({"category": category["name"]})
    if products_using > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Não é possível excluir. {products_using} produto(s) usa(m) esta categoria."
        )
    
    await db.categories.delete_one({"id": category_id})
    
    # Registrar auditoria
    await log_audit("DELETE", "category", category["name"], current_user, "alta")
    
    # Sincronizar com Excel
    await sync_all_to_excel()
    
    return {"message": "Categoria deletada"}

@api_router.post("/categories/initialize")
async def initialize_categories(current_user: User = Depends(get_current_user)):
    """Inicializa categorias padrão se não existirem"""
    check_role(current_user, ["proprietario", "administrador"])
    
    default_categories = ["Sanduíches", "Bebidas", "Pizzas", "Porções", "Sobremesas", "Acompanhamentos"]
    created = []
    
    for cat_name in default_categories:
        existing = await db.categories.find_one({"name": cat_name}, {"_id": 0})
        if not existing:
            category = Category(name=cat_name)
            doc = category.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.categories.insert_one(doc)
            created.append(cat_name)
    
    return {"message": f"Categorias inicializadas", "created": created}

# Reports endpoints
@api_router.get("/reports/price-history/{ingredient_id}", response_model=IngredientWithHistory)
async def get_price_history(ingredient_id: str, current_user: User = Depends(get_current_user)):
    ingredient = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    if isinstance(ingredient["created_at"], str):
        ingredient["created_at"] = datetime.fromisoformat(ingredient["created_at"])
    
    purchases = await db.purchases.find({"ingredient_id": ingredient_id}, {"_id": 0}).sort("purchase_date", 1).to_list(1000)
    
    history = []
    for p in purchases:
        date_str = p["purchase_date"] if isinstance(p["purchase_date"], str) else p["purchase_date"].strftime("%Y-%m-%d")
        history.append(PriceHistory(date=date_str, price=p["unit_price"]))
    
    return IngredientWithHistory(ingredient=Ingredient(**ingredient), history=history)

@api_router.get("/reports/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_ingredients = await db.ingredients.count_documents({})
    total_products = await db.products.count_documents({})
    total_purchases = await db.purchases.count_documents({})
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    avg_cmv = sum(p.get("cmv", 0) for p in products) / len(products) if products else 0
    
    return DashboardStats(
        total_ingredients=total_ingredients,
        total_products=total_products,
        total_purchases=total_purchases,
        avg_cmv=avg_cmv
    )


# ============================================
# FUNÇÕES DE SINCRONIZAÇÃO COM EXCEL
# ============================================

async def sync_all_to_excel():
    """Sincroniza todos os dados do MongoDB para o Excel"""
    try:
        # Ingredientes
        ingredients = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
        if ingredients:
            for ing in ingredients:
                if isinstance(ing.get("created_at"), datetime):
                    ing["created_at"] = ing["created_at"].isoformat()
            excel_backup.save_ingredients(ingredients)
        
        # Produtos
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
        if products:
            for p in products:
                if isinstance(p.get("created_at"), datetime):
                    p["created_at"] = p["created_at"].isoformat()
            excel_backup.save_products(products)
        
        # Compras
        purchases = await db.purchases.find({}, {"_id": 0}).to_list(1000)
        if purchases:
            for pur in purchases:
                if isinstance(pur.get("purchase_date"), datetime):
                    pur["purchase_date"] = pur["purchase_date"].isoformat()
            excel_backup.save_purchases(purchases)
        
        # Categorias
        categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
        if categories:
            for cat in categories:
                if isinstance(cat.get("created_at"), datetime):
                    cat["created_at"] = cat["created_at"].isoformat()
            excel_backup.save_categories(categories)
        
        # Usuários (com senha hash para restauração)
        users = await db.users.find({}, {"_id": 0}).to_list(1000)
        if users:
            for u in users:
                if isinstance(u.get("created_at"), datetime):
                    u["created_at"] = u["created_at"].isoformat()
            excel_backup.save_users(users)
        
        # Histórico de Auditoria (Moderação)
        audit_logs = await db.audit_logs.find({}, {"_id": 0}).to_list(10000)
        if audit_logs:
            for log in audit_logs:
                if isinstance(log.get("timestamp"), datetime):
                    log["timestamp"] = log["timestamp"].isoformat()
            excel_backup.save_audit_logs(audit_logs)
        
        print("[BACKUP] Sincronização completa com Excel realizada")
    except Exception as e:
        print(f"[BACKUP] Erro ao sincronizar com Excel: {e}")


# Endpoint para verificar status do backup
@api_router.get("/backup/status")
async def get_backup_status(current_user: User = Depends(get_current_user)):
    """Retorna informações sobre o backup em Excel"""
    return excel_backup.get_backup_info()


# Endpoint para forçar backup manual
@api_router.post("/backup/sync")
async def force_backup_sync(current_user: User = Depends(get_current_user)):
    """Força sincronização manual com o Excel"""
    check_role(current_user, ["proprietario"])
    await sync_all_to_excel()
    return {"message": "Backup sincronizado com sucesso", "info": excel_backup.get_backup_info()}


app.include_router(api_router)

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


# ============================================
# FUNÇÕES DE SINCRONIZAÇÃO COM EXCEL
# ============================================

async def sync_all_to_excel():
    """Sincroniza todos os dados do MongoDB para o Excel"""
    try:
        # Ingredientes
        ingredients = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
        if ingredients:
            for ing in ingredients:
                if isinstance(ing.get("created_at"), datetime):
                    ing["created_at"] = ing["created_at"].isoformat()
            excel_backup.save_ingredients(ingredients)
        
        # Produtos
        products = await db.products.find({}, {"_id": 0}).to_list(1000)
        if products:
            for p in products:
                if isinstance(p.get("created_at"), datetime):
                    p["created_at"] = p["created_at"].isoformat()
            excel_backup.save_products(products)
        
        # Compras
        purchases = await db.purchases.find({}, {"_id": 0}).to_list(1000)
        if purchases:
            for pur in purchases:
                if isinstance(pur.get("purchase_date"), datetime):
                    pur["purchase_date"] = pur["purchase_date"].isoformat()
            excel_backup.save_purchases(purchases)
        
        # Categorias
        categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
        if categories:
            for cat in categories:
                if isinstance(cat.get("created_at"), datetime):
                    cat["created_at"] = cat["created_at"].isoformat()
            excel_backup.save_categories(categories)
        
        # Usuários (com senha hash para restauração)
        users = await db.users.find({}, {"_id": 0}).to_list(1000)
        if users:
            for u in users:
                if isinstance(u.get("created_at"), datetime):
                    u["created_at"] = u["created_at"].isoformat()
            excel_backup.save_users(users)
        
        # Histórico de Auditoria (Moderação)
        audit_logs = await db.audit_logs.find({}, {"_id": 0}).to_list(10000)
        if audit_logs:
            for log in audit_logs:
                if isinstance(log.get("timestamp"), datetime):
                    log["timestamp"] = log["timestamp"].isoformat()
            excel_backup.save_audit_logs(audit_logs)
        
        logger.info("[BACKUP] Sincronização completa com Excel realizada")
    except Exception as e:
        logger.error(f"[BACKUP] Erro ao sincronizar com Excel: {e}")


async def restore_from_excel():
    """Restaura dados do Excel para o MongoDB se o banco estiver vazio"""
    try:
        if not excel_backup.backup_exists():
            logger.info("[BACKUP] Nenhum arquivo de backup encontrado")
            return
        
        # Verificar se precisa restaurar ingredientes
        ing_count = await db.ingredients.count_documents({})
        if ing_count == 0:
            ingredients = excel_backup.load_ingredients()
            if ingredients:
                for ing in ingredients:
                    # Limpar campos NaN/None problemáticos
                    ing = {k: v for k, v in ing.items() if v is not None and v != '' and str(v) != 'nan'}
                    if 'id' in ing:
                        existing = await db.ingredients.find_one({"id": ing["id"]})
                        if not existing:
                            await db.ingredients.insert_one(ing)
                logger.info(f"[BACKUP] Restaurados {len(ingredients)} ingredientes do Excel")
        
        # Verificar se precisa restaurar produtos
        prod_count = await db.products.count_documents({})
        if prod_count == 0:
            products = excel_backup.load_products()
            if products:
                for p in products:
                    p = {k: v for k, v in p.items() if v is not None and v != '' and str(v) != 'nan'}
                    if 'id' in p:
                        existing = await db.products.find_one({"id": p["id"]})
                        if not existing:
                            await db.products.insert_one(p)
                logger.info(f"[BACKUP] Restaurados {len(products)} produtos do Excel")
        
        # Verificar se precisa restaurar compras
        pur_count = await db.purchases.count_documents({})
        if pur_count == 0:
            purchases = excel_backup.load_purchases()
            if purchases:
                for pur in purchases:
                    pur = {k: v for k, v in pur.items() if v is not None and v != '' and str(v) != 'nan'}
                    if 'id' in pur:
                        existing = await db.purchases.find_one({"id": pur["id"]})
                        if not existing:
                            await db.purchases.insert_one(pur)
                logger.info(f"[BACKUP] Restauradas {len(purchases)} compras do Excel")
        
        # Verificar se precisa restaurar categorias
        cat_count = await db.categories.count_documents({})
        if cat_count == 0:
            categories = excel_backup.load_categories()
            if categories:
                for cat in categories:
                    cat = {k: v for k, v in cat.items() if v is not None and v != '' and str(v) != 'nan'}
                    if 'id' in cat:
                        existing = await db.categories.find_one({"id": cat["id"]})
                        if not existing:
                            await db.categories.insert_one(cat)
                logger.info(f"[BACKUP] Restauradas {len(categories)} categorias do Excel")
        
        # Verificar se precisa restaurar usuários
        user_count = await db.users.count_documents({})
        if user_count == 0:
            users = excel_backup.load_users()
            if users:
                for u in users:
                    u = {k: v for k, v in u.items() if v is not None and v != '' and str(v) != 'nan'}
                    if 'id' in u:
                        existing = await db.users.find_one({"id": u["id"]})
                        if not existing:
                            await db.users.insert_one(u)
                logger.info(f"[BACKUP] Restaurados {len(users)} usuários do Excel")
        
        # Verificar se precisa restaurar histórico de auditoria
        audit_count = await db.audit_logs.count_documents({})
        if audit_count == 0:
            audit_logs = excel_backup.load_audit_logs()
            if audit_logs:
                for log in audit_logs:
                    log = {k: v for k, v in log.items() if v is not None and v != '' and str(v) != 'nan'}
                    if 'id' in log:
                        existing = await db.audit_logs.find_one({"id": log["id"]})
                        if not existing:
                            await db.audit_logs.insert_one(log)
                logger.info(f"[BACKUP] Restaurados {len(audit_logs)} logs de auditoria do Excel")
        
        logger.info("[BACKUP] Restauração do Excel concluída")
    except Exception as e:
        logger.error(f"[BACKUP] Erro ao restaurar do Excel: {e}")


# Endpoint para verificar status do backup
@api_router.get("/backup/status")
async def get_backup_status(current_user: User = Depends(get_current_user)):
    """Retorna informações sobre o backup em Excel"""
    return excel_backup.get_backup_info()


# Endpoint para forçar backup manual
@api_router.post("/backup/sync")
async def force_backup_sync(current_user: User = Depends(get_current_user)):
    """Força sincronização manual com o Excel"""
    check_role(current_user, ["proprietario"])
    await sync_all_to_excel()
    return {"message": "Backup sincronizado com sucesso", "info": excel_backup.get_backup_info()}


# Criar diretórios de upload no startup
@app.on_event("startup")
async def startup_event():
    upload_dir = Path("/app/backend/uploads/products")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Restaurar dados do Excel se o banco estiver vazio
    logger.info("[STARTUP] Verificando backup em Excel...")
    await restore_from_excel()
    logger.info("[STARTUP] Sistema iniciado com sucesso")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()