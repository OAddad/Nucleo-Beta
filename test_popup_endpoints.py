#!/usr/bin/env python3
"""
Test script for Delivery Popup Endpoints
Tests the specific endpoints needed for the Novo Pedido popup in the Delivery system
"""

import requests
import json
import sys

def test_delivery_popup_endpoints():
    """Test specific endpoints for Novo Pedido popup in Delivery system as requested"""
    print("\n=== DELIVERY POPUP ENDPOINTS TESTS ===")
    print("🎯 Testing endpoints for Novo Pedido popup as specified in review request:")
    print("   1. Login with Addad/Addad123")
    print("   2. GET /api/products - deve retornar lista de produtos")
    print("   3. GET /api/categories - deve retornar categorias")
    print("   4. GET /api/clientes - deve retornar clientes")
    print("   5. GET /api/bairros - deve retornar bairros")
    print("   Apenas verificar se retornam arrays válidos.")
    
    base_url = "http://localhost:8001"
    token = None
    all_tests_passed = True
    
    # 1. Login with Addad/Addad123
    print("\n🔍 1. Testing login with Addad/Addad123...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json={"username": "Addad", "password": "Addad123"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            login_data = response.json()
            if 'access_token' in login_data:
                token = login_data['access_token']
                print(f"   ✅ Login successful with Addad/Addad123")
                print(f"   - User role: {login_data['user']['role']}")
                print(f"   - Token obtained: {token[:20]}...")
            else:
                print(f"   ❌ Login response missing access_token")
                all_tests_passed = False
                return False
        else:
            print(f"   ❌ Login failed with status {response.status_code}")
            print(f"   - Response: {response.text}")
            all_tests_passed = False
            return False
    except Exception as e:
        print(f"   ❌ Login failed with error: {str(e)}")
        all_tests_passed = False
        return False
    
    # Headers for authenticated requests
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    # 2. GET /api/products - deve retornar lista de produtos
    print("\n🔍 2. Testing GET /api/products...")
    try:
        response = requests.get(f"{base_url}/api/products", headers=headers, timeout=10)
        
        if response.status_code == 200:
            products = response.json()
            if isinstance(products, list):
                print(f"   ✅ Products endpoint returned valid array with {len(products)} items")
                if products:
                    sample_product = products[0]
                    print(f"   - Sample product: {sample_product.get('name', 'N/A')} (ID: {sample_product.get('id', 'N/A')})")
                    print(f"   - Has required fields: name={bool(sample_product.get('name'))}, id={bool(sample_product.get('id'))}")
                else:
                    print(f"   ⚠️ Products array is empty but valid")
            else:
                print(f"   ❌ Products endpoint did not return an array, got: {type(products)}")
                all_tests_passed = False
        else:
            print(f"   ❌ Products endpoint failed with status {response.status_code}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Products endpoint failed with error: {str(e)}")
        all_tests_passed = False
    
    # 3. GET /api/categories - deve retornar categorias
    print("\n🔍 3. Testing GET /api/categories...")
    try:
        response = requests.get(f"{base_url}/api/categories", headers=headers, timeout=10)
        
        if response.status_code == 200:
            categories = response.json()
            if isinstance(categories, list):
                print(f"   ✅ Categories endpoint returned valid array with {len(categories)} items")
                if categories:
                    sample_category = categories[0]
                    print(f"   - Sample category: {sample_category.get('name', 'N/A')} (ID: {sample_category.get('id', 'N/A')})")
                    print(f"   - Has required fields: name={bool(sample_category.get('name'))}, id={bool(sample_category.get('id'))}")
                else:
                    print(f"   ⚠️ Categories array is empty but valid")
            else:
                print(f"   ❌ Categories endpoint did not return an array, got: {type(categories)}")
                all_tests_passed = False
        else:
            print(f"   ❌ Categories endpoint failed with status {response.status_code}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Categories endpoint failed with error: {str(e)}")
        all_tests_passed = False
    
    # 4. GET /api/clientes - deve retornar clientes
    print("\n🔍 4. Testing GET /api/clientes...")
    try:
        response = requests.get(f"{base_url}/api/clientes", headers=headers, timeout=10)
        
        if response.status_code == 200:
            clientes = response.json()
            if isinstance(clientes, list):
                print(f"   ✅ Clientes endpoint returned valid array with {len(clientes)} items")
                if clientes:
                    sample_cliente = clientes[0]
                    print(f"   - Sample cliente: {sample_cliente.get('nome', 'N/A')} (ID: {sample_cliente.get('id', 'N/A')})")
                    print(f"   - Has required fields: nome={bool(sample_cliente.get('nome'))}, id={bool(sample_cliente.get('id'))}")
                else:
                    print(f"   ⚠️ Clientes array is empty but valid")
            else:
                print(f"   ❌ Clientes endpoint did not return an array, got: {type(clientes)}")
                all_tests_passed = False
        else:
            print(f"   ❌ Clientes endpoint failed with status {response.status_code}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Clientes endpoint failed with error: {str(e)}")
        all_tests_passed = False
    
    # 5. GET /api/bairros - deve retornar bairros
    print("\n🔍 5. Testing GET /api/bairros...")
    try:
        response = requests.get(f"{base_url}/api/bairros", headers=headers, timeout=10)
        
        if response.status_code == 200:
            bairros = response.json()
            if isinstance(bairros, list):
                print(f"   ✅ Bairros endpoint returned valid array with {len(bairros)} items")
                if bairros:
                    sample_bairro = bairros[0]
                    print(f"   - Sample bairro: {sample_bairro.get('nome', 'N/A')} (ID: {sample_bairro.get('id', 'N/A')})")
                    print(f"   - Has required fields: nome={bool(sample_bairro.get('nome'))}, id={bool(sample_bairro.get('id'))}")
                    if 'valor_entrega' in sample_bairro:
                        print(f"   - Valor entrega: R$ {sample_bairro.get('valor_entrega', 0):.2f}")
                else:
                    print(f"   ⚠️ Bairros array is empty but valid")
            else:
                print(f"   ❌ Bairros endpoint did not return an array, got: {type(bairros)}")
                all_tests_passed = False
        else:
            print(f"   ❌ Bairros endpoint failed with status {response.status_code}")
            all_tests_passed = False
    except Exception as e:
        print(f"   ❌ Bairros endpoint failed with error: {str(e)}")
        all_tests_passed = False
    
    # Summary
    print(f"\n🔍 DELIVERY POPUP ENDPOINTS TESTING SUMMARY:")
    if all_tests_passed:
        print(f"   ✅ ALL DELIVERY POPUP TESTS PASSED")
        print(f"   ✅ Login with Addad/Addad123 working")
        print(f"   ✅ GET /api/products returns valid array")
        print(f"   ✅ GET /api/categories returns valid array")
        print(f"   ✅ GET /api/clientes returns valid array")
        print(f"   ✅ GET /api/bairros returns valid array")
        print(f"   ✅ All endpoints ready for Novo Pedido popup")
    else:
        print(f"   ❌ SOME DELIVERY POPUP TESTS FAILED")
        print(f"   ℹ️ Check individual test results above for details")
    
    return all_tests_passed

if __name__ == "__main__":
    success = test_delivery_popup_endpoints()
    sys.exit(0 if success else 1)