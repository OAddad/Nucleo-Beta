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

    def test_login(self):
        """Test login with demo credentials"""
        print("\n=== AUTHENTICATION TESTS ===")
        success, response = self.run_test(
            "Login with demo credentials",
            "POST",
            "auth/login",
            200,
            data={"username": "demo", "password": "demo123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_ingredients(self):
        """Test ingredient CRUD operations"""
        print("\n=== INGREDIENT TESTS ===")
        
        # Get existing ingredients
        success, ingredients = self.run_test("Get ingredients", "GET", "ingredients", 200)
        if success:
            print(f"   Found {len(ingredients)} existing ingredients")
            for ing in ingredients:
                print(f"   - {ing['name']} ({ing['unit']}) - Avg Price: R$ {ing.get('average_price', 0):.2f}")
        
        # Create new ingredient: Queijo Cheddar
        success, queijo = self.run_test(
            "Create Queijo Cheddar ingredient",
            "POST",
            "ingredients",
            200,
            data={"name": "Queijo Cheddar", "unit": "kg"}
        )
        if success:
            self.created_ingredients.append(queijo['id'])
            print(f"   Created ingredient ID: {queijo['id']}")
        
        # Create new ingredient: Alface
        success, alface = self.run_test(
            "Create Alface ingredient",
            "POST",
            "ingredients",
            200,
            data={"name": "Alface", "unit": "maço"}
        )
        if success:
            self.created_ingredients.append(alface['id'])
            print(f"   Created ingredient ID: {alface['id']}")
        
        return len(self.created_ingredients) == 2

    def test_purchases(self):
        """Test purchase CRUD operations"""
        print("\n=== PURCHASE TESTS ===")
        
        # Get existing ingredients to use for purchases
        success, ingredients = self.run_test("Get ingredients for purchases", "GET", "ingredients", 200)
        if not success:
            return False
        
        # Find Carne Bovina and Queijo Cheddar
        carne_id = None
        queijo_id = None
        
        for ing in ingredients:
            if ing['name'] == 'Carne Bovina':
                carne_id = ing['id']
            elif ing['name'] == 'Queijo Cheddar':
                queijo_id = ing['id']
        
        if not carne_id:
            print("❌ Carne Bovina ingredient not found")
            return False
        
        # Create purchase for Carne Bovina
        success, purchase1 = self.run_test(
            "Create Carne Bovina purchase",
            "POST",
            "purchases",
            200,
            data={
                "ingredient_id": carne_id,
                "quantity": 10.0,
                "price": 250.0
            }
        )
        if success:
            self.created_purchases.append(purchase1['id'])
            print(f"   Unit price: R$ {purchase1['unit_price']:.2f}")
        
        # Create purchase for Queijo Cheddar if available
        if queijo_id:
            success, purchase2 = self.run_test(
                "Create Queijo Cheddar purchase",
                "POST",
                "purchases",
                200,
                data={
                    "ingredient_id": queijo_id,
                    "quantity": 5.0,
                    "price": 75.0
                }
            )
            if success:
                self.created_purchases.append(purchase2['id'])
                print(f"   Unit price: R$ {purchase2['unit_price']:.2f}")
        
        # Get all purchases
        success, purchases = self.run_test("Get all purchases", "GET", "purchases", 200)
        if success:
            print(f"   Total purchases: {len(purchases)}")
        
        return len(self.created_purchases) >= 1

    def test_price_recalculation(self):
        """Test that ingredient prices are recalculated after purchases"""
        print("\n=== PRICE RECALCULATION TESTS ===")
        
        success, ingredients = self.run_test("Get ingredients after purchases", "GET", "ingredients", 200)
        if not success:
            return False
        
        carne_found = False
        queijo_found = False
        
        for ing in ingredients:
            if ing['name'] == 'Carne Bovina':
                carne_found = True
                expected_price = 25.0  # 250/10
                actual_price = ing.get('average_price', 0)
                print(f"   Carne Bovina - Expected: R$ {expected_price:.2f}, Actual: R$ {actual_price:.2f}")
                if abs(actual_price - expected_price) < 0.01:
                    print("   ✅ Carne Bovina price calculation correct")
                else:
                    print("   ❌ Carne Bovina price calculation incorrect")
            
            elif ing['name'] == 'Queijo Cheddar':
                queijo_found = True
                expected_price = 15.0  # 75/5
                actual_price = ing.get('average_price', 0)
                print(f"   Queijo Cheddar - Expected: R$ {expected_price:.2f}, Actual: R$ {actual_price:.2f}")
                if abs(actual_price - expected_price) < 0.01:
                    print("   ✅ Queijo Cheddar price calculation correct")
                else:
                    print("   ❌ Queijo Cheddar price calculation incorrect")
        
        return carne_found and queijo_found

    def test_products(self):
        """Test product CRUD operations and CMV calculation"""
        print("\n=== PRODUCT TESTS ===")
        
        # Get ingredients for recipe
        success, ingredients = self.run_test("Get ingredients for product", "GET", "ingredients", 200)
        if not success:
            return False
        
        carne_id = None
        queijo_id = None
        
        for ing in ingredients:
            if ing['name'] == 'Carne Bovina':
                carne_id = ing['id']
            elif ing['name'] == 'Queijo Cheddar':
                queijo_id = ing['id']
        
        if not carne_id:
            print("❌ Carne Bovina not found for product recipe")
            return False
        
        # Create product with recipe
        recipe = [{"ingredient_id": carne_id, "quantity": 0.15}]
        if queijo_id:
            recipe.append({"ingredient_id": queijo_id, "quantity": 0.05})
        
        success, product = self.run_test(
            "Create X-Burger Clássico product",
            "POST",
            "products",
            200,
            data={
                "name": "X-Burger Clássico",
                "description": "Hambúrguer tradicional",
                "sale_price": 35.0,
                "recipe": recipe
            }
        )
        
        if success:
            self.created_products.append(product['id'])
            print(f"   Product ID: {product['id']}")
            print(f"   CMV: R$ {product['cmv']:.2f}")
            print(f"   Profit Margin: {product.get('profit_margin', 0):.1f}%")
            
            # Expected CMV: (25 * 0.15) + (15 * 0.05) = 3.75 + 0.75 = 4.50
            expected_cmv = 4.50
            if abs(product['cmv'] - expected_cmv) < 0.01:
                print("   ✅ CMV calculation correct")
            else:
                print(f"   ❌ CMV calculation incorrect - Expected: {expected_cmv:.2f}")
            
            # Expected margin: ((35 - 4.50) / 35) * 100 = 87.1%
            expected_margin = 87.1
            actual_margin = product.get('profit_margin', 0)
            if abs(actual_margin - expected_margin) < 1.0:
                print("   ✅ Profit margin calculation correct")
            else:
                print(f"   ❌ Profit margin calculation incorrect - Expected: {expected_margin:.1f}%")
        
        # Get all products
        success, products = self.run_test("Get all products", "GET", "products", 200)
        if success:
            print(f"   Total products: {len(products)}")
        
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