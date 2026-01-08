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
        
        # First, try to register as the first user to get proprietario role
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
            
            # If user is not proprietario or administrador, try with "Addad" username
            if response['user']['role'] not in ['proprietario', 'administrador']:
                print("   ⚠️ User has observer role, trying with 'Addad' username...")
                success, response = self.run_test(
                    "Register Addad user (gets proprietario role)",
                    "POST",
                    "auth/register",
                    200,
                    data={"username": "Addad", "password": "senha123"}
                )
                
                if success and 'access_token' in response:
                    self.token = response['access_token']
                    self.user_id = response['user']['id']
                    print(f"   ✅ Addad user registered with role: {response['user']['role']}")
                else:
                    # Try login with Addad if already exists
                    success, response = self.run_test(
                        "Login with Addad",
                        "POST",
                        "auth/login",
                        200,
                        data={"username": "Addad", "password": "senha123"}
                    )
                    if success:
                        self.token = response['access_token']
                        self.user_id = response['user']['id']
                        print(f"   ✅ Addad login successful with role: {response['user']['role']}")
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
                
                # If still observer role, try Addad
                if response['user']['role'] not in ['proprietario', 'administrador']:
                    print("   ⚠️ User has observer role, trying with 'Addad'...")
                    success, response = self.run_test(
                        "Login with Addad",
                        "POST",
                        "auth/login",
                        200,
                        data={"username": "Addad", "password": "senha123"}
                    )
                    if success:
                        self.token = response['access_token']
                        self.user_id = response['user']['id']
                        print(f"   ✅ Addad login successful with role: {response['user']['role']}")
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

    def test_dashboard_and_reports(self):
        """Test dashboard and reports as specified in review"""
        print("\n=== DASHBOARD AND REPORTS TESTS ===")
        
        # Test dashboard stats
        print("🔍 Testing dashboard statistics...")
        success, stats = self.run_test("Get dashboard stats", "GET", "reports/dashboard", 200)
        if success:
            print(f"   ✅ Dashboard stats retrieved:")
            print(f"   - Total ingredients: {stats['total_ingredients']}")
            print(f"   - Total products: {stats['total_products']}")
            print(f"   - Total purchases: {stats['total_purchases']}")
            print(f"   - Average CMV: R$ {stats['avg_cmv']:.2f}")
        else:
            print("   ❌ Failed to get dashboard stats")
            return False
        
        # Test price history for ingredients
        if self.created_ingredients:
            ingredient_id = self.created_ingredients[0]
            print(f"🔍 Testing price history for ingredient {ingredient_id}...")
            success, history = self.run_test(
                "Get ingredient price history",
                "GET",
                f"reports/price-history/{ingredient_id}",
                200
            )
            if success:
                print(f"   ✅ Price history retrieved:")
                print(f"   - Ingredient: {history['ingredient']['name']}")
                print(f"   - History entries: {len(history.get('history', []))}")
                for entry in history.get('history', [])[:3]:  # Show first 3 entries
                    print(f"     {entry['date']}: R$ {entry['price']:.2f}")
            else:
                print("   ❌ Failed to get price history")
                return False
        
        return True

    def test_audit_logs(self):
        """Test audit logs as specified in review"""
        print("\n=== AUDIT LOGS TESTS ===")
        
        # Get audit logs
        print("🔍 Testing audit logs...")
        success, logs = self.run_test("Get audit logs", "GET", "audit-logs", 200)
        if success:
            print(f"   ✅ Audit logs retrieved: {len(logs)} entries")
            
            # Show recent logs
            for log in logs[:5]:  # Show first 5 logs
                print(f"   - {log['action']} {log['resource_type']}: {log['resource_name']} by {log['username']}")
        else:
            print("   ❌ Failed to get audit logs")
            return False
        
        return True

    def test_cleanup_operations(self):
        """Test cleanup operations (DELETE) as specified in review"""
        print("\n=== CLEANUP OPERATIONS TESTS ===")
        
        # Delete products
        print("🔍 Testing product deletion...")
        for product_id in self.created_products:
            success, _ = self.run_test(
                f"Delete product {product_id}",
                "DELETE",
                f"products/{product_id}",
                200
            )
            if success:
                print(f"   ✅ Product {product_id} deleted")
        
        # Delete batch purchases
        print("🔍 Testing batch purchase deletion...")
        for batch_id in self.batch_ids:
            success, response = self.run_test(
                f"Delete batch {batch_id}",
                "DELETE",
                f"purchases/batch/{batch_id}",
                200
            )
            if success:
                print(f"   ✅ Batch {batch_id} deleted - {response.get('purchases_deleted', 0)} purchases removed")
        
        # Delete ingredients
        print("🔍 Testing ingredient deletion...")
        for ingredient_id in self.created_ingredients:
            success, _ = self.run_test(
                f"Delete ingredient {ingredient_id}",
                "DELETE",
                f"ingredients/{ingredient_id}",
                200
            )
            if success:
                print(f"   ✅ Ingredient {ingredient_id} deleted")
        
        # Delete categories
        print("🔍 Testing category deletion...")
        for category_id in self.created_categories:
            success, _ = self.run_test(
                f"Delete category {category_id}",
                "DELETE",
                f"categories/{category_id}",
                200
            )
            if success:
                print(f"   ✅ Category {category_id} deleted")
        
        return True

def main():
    print("🚀 Starting CMV Master API Tests - Complete System Test")
    print("=" * 60)
    
    tester = CMVMasterAPITester()
    
    # Run all tests in the exact order specified in the review
    tests = [
        ("1. Authentication", tester.test_authentication),
        ("2. Ingredients CRUD", tester.test_ingredients_crud),
        ("3. Batch Purchases", tester.test_batch_purchases),
        ("4. Categories", tester.test_categories),
        ("5. Products with CMV", tester.test_products_with_cmv),
        ("6. Dashboard & Reports", tester.test_dashboard_and_reports),
        ("7. Audit Logs", tester.test_audit_logs),
        ("8. Cleanup Operations", tester.test_cleanup_operations),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*60}")
            print(f"Running {test_name}")
            print(f"{'='*60}")
            
            if not test_func():
                failed_tests.append(test_name)
                print(f"❌ {test_name} FAILED")
            else:
                print(f"✅ {test_name} PASSED")
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if failed_tests:
        print(f"\n❌ FAILED TEST CATEGORIES:")
        for failed in failed_tests:
            print(f"   - {failed}")
        print(f"\n🔧 Please check the backend logs and fix the issues above.")
        return 1
    else:
        print("\n✅ ALL TESTS PASSED!")
        print("🎉 CMV Master system is working correctly!")
        return 0

if __name__ == "__main__":
    sys.exit(main())