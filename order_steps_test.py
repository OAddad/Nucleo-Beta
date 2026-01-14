#!/usr/bin/env python3
"""
Simple Order Steps Feature Test
Tests the Order Steps (Etapas de Pedido) functionality by examining existing products
"""

import requests
import json
import time

def test_order_steps_readonly():
    """Test Order Steps functionality by examining existing products (read-only)"""
    base_url = "https://visual-receipt.preview.emergentagent.com"
    
    print("🚀 Order Steps Feature Test (Read-Only Analysis)")
    print("=" * 60)
    
    # Try to register a user to get authentication
    unique_suffix = str(int(time.time()))[-6:]
    print(f"🔍 Registering test user...")
    
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json={"username": f"test_order_{unique_suffix}", "password": "test123"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data['access_token']
            print(f"✅ User registered successfully")
            print(f"   Role: {data['user']['role']}")
        else:
            print(f"❌ Registration failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return False
    
    # Get products with authentication
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    print(f"\n🔍 Examining existing products with order steps...")
    
    try:
        response = requests.get(f"{base_url}/api/products", headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Failed to get products: {response.status_code}")
            return False
            
        products = response.json()
        print(f"✅ Found {len(products)} total products")
        
        # Find products with order steps
        products_with_steps = [p for p in products if p.get('order_steps') and len(p['order_steps']) > 0]
        print(f"✅ Found {len(products_with_steps)} products with order steps")
        
        if not products_with_steps:
            print("❌ No products with order steps found")
            return False
        
        # Analyze order steps structure
        print(f"\n📋 DETAILED ORDER STEPS ANALYSIS:")
        print("=" * 50)
        
        calculation_types_found = set()
        total_steps = 0
        total_items = 0
        
        for i, product in enumerate(products_with_steps, 1):
            print(f"\n{i}. Product: {product['name']}")
            print(f"   ID: {product['id']}")
            print(f"   Category: {product.get('category', 'N/A')}")
            print(f"   Sale Price: R$ {product.get('sale_price', 0):.2f}")
            print(f"   Order Steps: {len(product.get('order_steps', []))}")
            
            for j, step in enumerate(product.get('order_steps', []), 1):
                total_steps += 1
                step_items = step.get('items', [])
                total_items += len(step_items)
                
                print(f"\n   Step {j}: {step.get('name', 'Unnamed')}")
                print(f"      Calculation Type: {step.get('calculation_type', 'N/A')}")
                print(f"      Min Selections: {step.get('min_selections', 0)}")
                print(f"      Max Selections: {step.get('max_selections', 0)}")
                print(f"      Items: {len(step_items)}")
                
                calculation_types_found.add(step.get('calculation_type', 'unknown'))
                
                # Verify step structure
                required_fields = ['name', 'calculation_type', 'min_selections', 'max_selections', 'items']
                missing_fields = [field for field in required_fields if field not in step]
                
                if missing_fields:
                    print(f"      ❌ Missing fields: {missing_fields}")
                else:
                    print(f"      ✅ All required fields present")
                
                # Examine items
                for k, item in enumerate(step_items, 1):
                    print(f"         Item {k}: {item.get('product_name', 'N/A')}")
                    print(f"            Product ID: {item.get('product_id', 'N/A')}")
                    print(f"            Price Override: R$ {item.get('price_override', 0):.2f}")
                    
                    # Verify item structure
                    item_required = ['product_id', 'product_name', 'price_override']
                    item_missing = [field for field in item_required if field not in item]
                    
                    if item_missing:
                        print(f"            ❌ Missing fields: {item_missing}")
                    else:
                        print(f"            ✅ All required fields present")
        
        # Summary analysis
        print(f"\n📊 SUMMARY ANALYSIS:")
        print("=" * 30)
        print(f"Total products with order steps: {len(products_with_steps)}")
        print(f"Total order steps: {total_steps}")
        print(f"Total order step items: {total_items}")
        print(f"Calculation types found: {', '.join(sorted(calculation_types_found))}")
        
        # Check calculation types coverage
        expected_types = {"soma", "subtracao", "minimo", "maximo", "medio"}
        missing_types = expected_types - calculation_types_found
        
        print(f"\n🔍 CALCULATION TYPES ANALYSIS:")
        print(f"Expected types: {', '.join(sorted(expected_types))}")
        print(f"Found types: {', '.join(sorted(calculation_types_found))}")
        
        if missing_types:
            print(f"⚠️ Missing types: {', '.join(sorted(missing_types))}")
        else:
            print(f"✅ All calculation types represented")
        
        # Check selection limits
        print(f"\n🔍 SELECTION LIMITS ANALYSIS:")
        no_min_limit = 0
        no_max_limit = 0
        with_limits = 0
        
        for product in products_with_steps:
            for step in product.get('order_steps', []):
                min_sel = step.get('min_selections', 0)
                max_sel = step.get('max_selections', 0)
                
                if min_sel == 0:
                    no_min_limit += 1
                if max_sel == 0:
                    no_max_limit += 1
                if min_sel > 0 and max_sel > 0:
                    with_limits += 1
        
        print(f"Steps with no minimum limit (0): {no_min_limit}")
        print(f"Steps with no maximum limit (0): {no_max_limit}")
        print(f"Steps with both limits set: {with_limits}")
        
        # Verify product integrity
        print(f"\n🔍 PRODUCT INTEGRITY CHECK:")
        all_product_ids = {p['id'] for p in products}
        integrity_issues = []
        
        for product in products_with_steps:
            for step in product.get('order_steps', []):
                for item in step.get('items', []):
                    if item.get('product_id') and item['product_id'] not in all_product_ids:
                        integrity_issues.append(f"Product '{product['name']}' references non-existent product ID: {item['product_id']}")
        
        if integrity_issues:
            print(f"❌ Found {len(integrity_issues)} integrity issues:")
            for issue in integrity_issues:
                print(f"   - {issue}")
        else:
            print(f"✅ All product references are valid")
        
        # Final verdict
        print(f"\n🎯 FINAL VERDICT:")
        print("=" * 20)
        
        success_criteria = [
            (len(products_with_steps) > 0, "Products with order steps exist"),
            (len(calculation_types_found) > 0, "Calculation types implemented"),
            (total_steps > 0, "Order steps structure working"),
            (total_items > 0, "Order step items structure working"),
            (len(integrity_issues) == 0, "Product references are valid"),
        ]
        
        passed = 0
        for criterion, description in success_criteria:
            if criterion:
                print(f"✅ {description}")
                passed += 1
            else:
                print(f"❌ {description}")
        
        print(f"\nScore: {passed}/{len(success_criteria)} criteria passed")
        
        if passed == len(success_criteria):
            print(f"🎉 ORDER STEPS FEATURE IS WORKING CORRECTLY!")
            return True
        else:
            print(f"⚠️ Some issues found with order steps feature")
            return False
            
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        return False

if __name__ == "__main__":
    success = test_order_steps_readonly()
    exit(0 if success else 1)