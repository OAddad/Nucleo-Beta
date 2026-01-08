import requests
import sys
import json
from datetime import datetime

class CMVMasterAPITester:
    def __init__(self, base_url="https://teste-tudo.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ingredients = []
        self.created_purchases = []
        self.created_products = []
        self.created_categories = []
        self.batch_ids = []
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test complete authentication flow as specified in review"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # 1. Register new user "teste_admin" with password "senha123"
        print("🔍 Testing user registration...")
        success, response = self.run_test(
            "Register teste_admin user",
            "POST",
            "auth/register",
            200,
            data={"username": "teste_admin", "password": "senha123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   ✅ User registered successfully")
            print(f"   User role: {response['user']['role']}")
            print(f"   Token obtained: {self.token[:20]}...")
        else:
            # Try login if user already exists
            print("   User might already exist, trying login...")
            success, response = self.run_test(
                "Login with teste_admin",
                "POST",
                "auth/login",
                200,
                data={"username": "teste_admin", "password": "senha123"}
            )
            
            if success and 'access_token' in response:
                self.token = response['access_token']
                self.user_id = response['user']['id']
                print(f"   ✅ Login successful")
                print(f"   User role: {response['user']['role']}")
                print(f"   Token obtained: {self.token[:20]}...")
            else:
                print("   ❌ Authentication failed")
                return False
        
        return True

    def test_ingredients_crud(self):
        """Test ingredient CRUD operations as specified in review"""
        print("\n=== INGREDIENT CRUD TESTS ===")
        
        # Create ingredient: Carne Bovina
        print("🔍 Creating Carne Bovina ingredient...")
        success, carne = self.run_test(
            "Create Carne Bovina ingredient",
            "POST",
            "ingredients",
            200,
            data={"name": "Carne Bovina", "unit": "kg"}
        )
        if success:
            self.created_ingredients.append(carne['id'])
            print(f"   ✅ Created Carne Bovina ID: {carne['id']}")
        else:
            print("   ❌ Failed to create Carne Bovina")
            return False
        
        # Create ingredient: Pão de Hambúrguer
        print("🔍 Creating Pão de Hambúrguer ingredient...")
        success, pao = self.run_test(
            "Create Pão de Hambúrguer ingredient",
            "POST",
            "ingredients",
            200,
            data={"name": "Pão de Hambúrguer", "unit": "un", "units_per_package": 8}
        )
        if success:
            self.created_ingredients.append(pao['id'])
            print(f"   ✅ Created Pão de Hambúrguer ID: {pao['id']}")
        else:
            print("   ❌ Failed to create Pão de Hambúrguer")
            return False
        
        # List all ingredients
        print("🔍 Listing all ingredients...")
        success, ingredients = self.run_test("Get all ingredients", "GET", "ingredients", 200)
        if success:
            print(f"   ✅ Found {len(ingredients)} ingredients")
            for ing in ingredients:
                print(f"   - {ing['name']} ({ing['unit']}) - Avg Price: R$ {ing.get('average_price', 0):.2f}")
        
        # Update an ingredient
        if self.created_ingredients:
            print("🔍 Updating ingredient...")
            success, updated = self.run_test(
                "Update ingredient",
                "PUT",
                f"ingredients/{self.created_ingredients[0]}",
                200,
                data={"name": "Carne Bovina Premium", "unit": "kg"}
            )
            if success:
                print(f"   ✅ Updated ingredient: {updated['name']}")
        
        return len(self.created_ingredients) == 2

    def test_batch_purchases(self):
        """Test batch purchase operations as specified in review"""
        print("\n=== BATCH PURCHASE TESTS ===")
        
        if len(self.created_ingredients) < 2:
            print("❌ Need at least 2 ingredients for batch purchase test")
            return False
        
        carne_id = self.created_ingredients[0]
        pao_id = self.created_ingredients[1]
        
        # Create batch purchase
        print("🔍 Creating batch purchase...")
        batch_data = {
            "supplier": "Fornecedor Teste",
            "purchase_date": "2025-01-08",
            "items": [
                {"ingredient_id": carne_id, "quantity": 10, "price": 450.00},
                {"ingredient_id": pao_id, "quantity": 3, "price": 45.00}
            ]
        }
        
        success, response = self.run_test(
            "Create batch purchase",
            "POST",
            "purchases/batch",
            200,
            data=batch_data
        )
        
        if success:
            batch_id = response.get('batch_id')
            self.batch_ids.append(batch_id)
            print(f"   ✅ Batch purchase created with ID: {batch_id}")
            print(f"   Items created: {response.get('items_created', 0)}")
        else:
            print("   ❌ Failed to create batch purchase")
            return False
        
        # List grouped purchases
        print("🔍 Listing grouped purchases...")
        success, grouped = self.run_test("Get grouped purchases", "GET", "purchases/grouped", 200)
        if success:
            print(f"   ✅ Found {len(grouped)} purchase batches")
            for batch in grouped:
                print(f"   - Batch: {batch['supplier']} - Items: {len(batch['items'])} - Total: R$ {batch['total_price']:.2f}")
        
        # Verify average price calculation
        print("🔍 Verifying price calculations...")
        success, ingredients = self.run_test("Get ingredients after batch purchase", "GET", "ingredients", 200)
        if success:
            for ing in ingredients:
                if ing['id'] in [carne_id, pao_id]:
                    print(f"   {ing['name']} - Average price: R$ {ing.get('average_price', 0):.2f}")
        
        return True

    def test_categories(self):
        """Test category operations as specified in review"""
        print("\n=== CATEGORY TESTS ===")
        
        # Create category
        print("🔍 Creating Sanduíches category...")
        success, category = self.run_test(
            "Create Sanduíches category",
            "POST",
            "categories",
            200,
            data={"name": "Sanduíches"}
        )
        
        if success:
            self.created_categories.append(category['id'])
            print(f"   ✅ Created category ID: {category['id']}")
        else:
            print("   ❌ Failed to create category")
            return False
        
        # List all categories
        print("🔍 Listing all categories...")
        success, categories = self.run_test("Get all categories", "GET", "categories", 200)
        if success:
            print(f"   ✅ Found {len(categories)} categories")
            for cat in categories:
                print(f"   - {cat['name']}")
        
        return len(self.created_categories) >= 1

    def test_products_with_cmv(self):
        """Test product creation with CMV calculation as specified in review"""
        print("\n=== PRODUCT WITH CMV TESTS ===")
        
        if len(self.created_ingredients) < 2:
            print("❌ Need at least 2 ingredients for product test")
            return False
        
        carne_id = self.created_ingredients[0]
        pao_id = self.created_ingredients[1]
        
        # Create product with recipe
        print("🔍 Creating X-Burger product...")
        product_data = {
            "name": "X-Burger",
            "category": "Sanduíches",
            "sale_price": 25.00,
            "recipe": [
                {"ingredient_id": carne_id, "quantity": 0.15},
                {"ingredient_id": pao_id, "quantity": 1}
            ]
        }
        
        success, product = self.run_test(
            "Create X-Burger product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success:
            self.created_products.append(product['id'])
            print(f"   ✅ Created product ID: {product['id']}")
            print(f"   CMV: R$ {product['cmv']:.2f}")
            print(f"   Profit Margin: {product.get('profit_margin', 0):.1f}%")
            
            # Verify CMV calculation
            if product['cmv'] > 0:
                print("   ✅ CMV calculated successfully")
            else:
                print("   ❌ CMV calculation failed")
        else:
            print("   ❌ Failed to create product")
            return False
        
        # List all products and verify CMV
        print("🔍 Listing all products...")
        success, products = self.run_test("Get all products", "GET", "products", 200)
        if success:
            print(f"   ✅ Found {len(products)} products")
            for prod in products:
                print(f"   - {prod['name']} - CMV: R$ {prod.get('cmv', 0):.2f} - Margin: {prod.get('profit_margin', 0):.1f}%")
        
        # Update product
        if self.created_products:
            print("🔍 Updating product...")
            updated_data = product_data.copy()
            updated_data['sale_price'] = 30.00
            
            success, updated = self.run_test(
                "Update product",
                "PUT",
                f"products/{self.created_products[0]}",
                200,
                data=updated_data
            )
            if success:
                print(f"   ✅ Updated product - New CMV: R$ {updated['cmv']:.2f}")
        
        return len(self.created_products) >= 1

    def test_reports(self):
        """Test reports endpoints"""
        print("\n=== REPORTS TESTS ===")
        
        # Test dashboard stats
        success, stats = self.run_test("Get dashboard stats", "GET", "reports/dashboard", 200)
        if success:
            print(f"   Total ingredients: {stats['total_ingredients']}")
            print(f"   Total products: {stats['total_products']}")
            print(f"   Total purchases: {stats['total_purchases']}")
            print(f"   Average CMV: R$ {stats['avg_cmv']:.2f}")
        
        # Test price history for Carne Bovina
        success, ingredients = self.run_test("Get ingredients for price history", "GET", "ingredients", 200)
        if success:
            carne_id = None
            for ing in ingredients:
                if ing['name'] == 'Carne Bovina':
                    carne_id = ing['id']
                    break
            
            if carne_id:
                success, history = self.run_test(
                    "Get Carne Bovina price history",
                    "GET",
                    f"reports/price-history/{carne_id}",
                    200
                )
                if success:
                    print(f"   Price history entries: {len(history.get('history', []))}")
        
        return True

    def test_purchase_deletion(self):
        """Test purchase deletion and price recalculation"""
        print("\n=== PURCHASE DELETION TESTS ===")
        
        if not self.created_purchases:
            print("❌ No purchases to delete")
            return False
        
        # Delete first purchase
        purchase_id = self.created_purchases[0]
        success, _ = self.run_test(
            "Delete purchase",
            "DELETE",
            f"purchases/{purchase_id}",
            200
        )
        
        if success:
            print("   ✅ Purchase deleted successfully")
            
            # Check that prices are recalculated
            success, ingredients = self.run_test("Get ingredients after deletion", "GET", "ingredients", 200)
            if success:
                print("   ✅ Ingredients retrieved after deletion")
                for ing in ingredients:
                    if ing['name'] in ['Carne Bovina', 'Queijo Cheddar']:
                        print(f"   {ing['name']} - New avg price: R$ {ing.get('average_price', 0):.2f}")
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n=== CLEANUP ===")
        
        # Delete created products
        for product_id in self.created_products:
            self.run_test(f"Delete product {product_id}", "DELETE", f"products/{product_id}", 200)
        
        # Delete remaining purchases
        for purchase_id in self.created_purchases[1:]:  # Skip first one as it was already deleted
            self.run_test(f"Delete purchase {purchase_id}", "DELETE", f"purchases/{purchase_id}", 200)
        
        # Delete created ingredients
        for ingredient_id in self.created_ingredients:
            self.run_test(f"Delete ingredient {ingredient_id}", "DELETE", f"ingredients/{ingredient_id}", 200)

def main():
    print("🚀 Starting CMV Master API Tests")
    print("=" * 50)
    
    tester = CMVMasterAPITester()
    
    # Run all tests
    tests = [
        ("Authentication", tester.test_login),
        ("Ingredients", tester.test_ingredients),
        ("Purchases", tester.test_purchases),
        ("Price Recalculation", tester.test_price_recalculation),
        ("Products", tester.test_products),
        ("Reports", tester.test_reports),
        ("Purchase Deletion", tester.test_purchase_deletion),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Cleanup
    try:
        tester.cleanup()
    except Exception as e:
        print(f"⚠️ Cleanup failed: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if failed_tests:
        print(f"❌ Failed test categories: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All test categories passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())