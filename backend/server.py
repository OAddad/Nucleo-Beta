from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class IngredientCreate(BaseModel):
    name: str
    unit: str
    units_per_package: Optional[int] = None
    slices_per_package: Optional[int] = None

class Ingredient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str
    units_per_package: Optional[int] = None
    slices_per_package: Optional[int] = None
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

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sale_price: Optional[float] = None
    recipe: List[RecipeIngredient]

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    sale_price: Optional[float] = None
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

# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = pwd_context.hash(user_data.password)
    user = User(username=user_data.username)
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
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

# Ingredient endpoints
@api_router.post("/ingredients", response_model=Ingredient)
async def create_ingredient(ingredient_data: IngredientCreate, current_user: User = Depends(get_current_user)):
    ingredient = Ingredient(**ingredient_data.model_dump())
    doc = ingredient.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.ingredients.insert_one(doc)
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
    existing = await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    update_data = ingredient_data.model_dump()
    await db.ingredients.update_one({"id": ingredient_id}, {"$set": update_data})
    
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
    # Check if ingredient is used in any product
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
    return {"message": "Ingredient deleted"}

# Purchase endpoints
@api_router.post("/purchases/batch", response_model=dict)
async def create_purchase_batch(batch_data: PurchaseBatchCreate, current_user: User = Depends(get_current_user)):
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
        
        # If ingredient has units_per_package, divide by it to get unit price
        if ingredient.get("units_per_package") and ingredient["units_per_package"] > 0:
            avg_price = avg_price / ingredient["units_per_package"]
        
        await db.ingredients.update_one(
            {"id": item.ingredient_id},
            {"$set": {"average_price": avg_price}}
        )
    
    return {"message": "Purchase batch created", "batch_id": batch_id, "items_created": len(purchases_created)}

@api_router.put("/purchases/batch/{batch_id}", response_model=dict)
async def update_purchase_batch(batch_id: str, batch_data: PurchaseBatchCreate, current_user: User = Depends(get_current_user)):
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
    
    return {"message": "Purchase deleted"}

@api_router.delete("/purchases/batch/{batch_id}")
async def delete_purchase_batch(batch_id: str, current_user: User = Depends(get_current_user)):
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
    
    return {"message": "Purchase batch deleted", "purchases_deleted": len(purchases)}

# Product endpoints
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    # Calculate CMV
    cmv = 0.0
    for recipe_item in product_data.recipe:
        ingredient = await db.ingredients.find_one({"id": recipe_item.ingredient_id}, {"_id": 0})
        if ingredient:
            cmv += ingredient.get("average_price", 0) * recipe_item.quantity
    
    product = Product(**product_data.model_dump(), cmv=cmv)
    
    # Calculate profit margin if sale price exists
    if product.sale_price and product.sale_price > 0:
        product.profit_margin = ((product.sale_price - cmv) / product.sale_price) * 100
    
    doc = product.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
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
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Recalculate CMV
    cmv = 0.0
    for recipe_item in product_data.recipe:
        ingredient = await db.ingredients.find_one({"id": recipe_item.ingredient_id}, {"_id": 0})
        if ingredient:
            cmv += ingredient.get("average_price", 0) * recipe_item.quantity
    
    profit_margin = None
    if product_data.sale_price and product_data.sale_price > 0:
        profit_margin = ((product_data.sale_price - cmv) / product_data.sale_price) * 100
    
    update_data = product_data.model_dump()
    update_data["cmv"] = cmv
    update_data["profit_margin"] = profit_margin
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(updated["created_at"], str):
        updated["created_at"] = datetime.fromisoformat(updated["created_at"])
    return Product(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()