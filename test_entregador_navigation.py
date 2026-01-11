#!/usr/bin/env python3
"""
Test script for entregador detail page navigation as specified in review request.

Tests:
1. Criar um entregador via POST /api/entregadores (autenticar com Addad/Addad123)
2. Criar um pedido de teste via POST /api/pedidos  
3. Atribuir o entregador ao pedido via PATCH /api/pedidos/{id}/entregador?entregador_id={entregador_id}
4. Verificar se GET /api/entregadores/{id} retorna os dados do entregador
5. Verificar se GET /api/entregadores/{id}/pedidos retorna a lista de pedidos do entregador
"""

import requests
import json
import sys
from datetime import datetime

class EntregadorNavigationTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def authenticate(self):
        """Authenticate with Addad/Addad123 as specified in review request"""
        print("🔐 Authenticating with Addad/Addad123...")
        
        success, response = self.run_test(
            "Login with Addad/Addad123",
            "POST",
            "auth/login",
            200,
            data={"username": "Addad", "password": "Addad123"}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   ✅ Authentication successful")
            print(f"   - User: {response['user']['username']}")
            print(f"   - Role: {response['user']['role']}")
            return True
        else:
            print(f"   ❌ Authentication failed with Addad/Addad123")
            return False

    def test_entregador_navigation(self):
        """Test the complete entregador detail navigation flow"""
        print("\n" + "="*60)
        print("🎯 TESTING ENTREGADOR DETAIL PAGE NAVIGATION")
        print("="*60)
        
        # Step 0: Authenticate
        if not self.authenticate():
            return False
        
        created_entregador_id = None
        created_pedido_id = None
        
        try:
            # Step 1: Create entregador
            print(f"\n📋 STEP 1: Creating entregador via POST /api/entregadores")
            entregador_data = {
                "nome": "João Silva Entregador",
                "telefone": "(11) 98765-4321",
                "veiculo": "Moto Honda CG 160",
                "placa": "ABC-1234",
                "ativo": True
            }
            
            success, entregador = self.run_test(
                "Create entregador",
                "POST",
                "entregadores",
                200,
                data=entregador_data
            )
            
            if not success:
                print("❌ Failed to create entregador - cannot continue")
                return False
            
            created_entregador_id = entregador['id']
            print(f"   ✅ Entregador created successfully")
            print(f"   - ID: {entregador['id']}")
            print(f"   - Nome: {entregador['nome']}")
            print(f"   - Telefone: {entregador.get('telefone', 'N/A')}")
            
            # Step 2: Create test pedido
            print(f"\n📋 STEP 2: Creating test pedido via POST /api/pedidos")
            
            # First get available products
            success, products = self.run_test("Get products", "GET", "products", 200)
            if not success or not products:
                print("❌ No products available - cannot create pedido")
                return False
            
            test_product = products[0]
            pedido_data = {
                "cliente_nome": "Cliente Teste Entregador",
                "cliente_telefone": "(11) 99999-8888",
                "endereco_rua": "Rua Teste, 123",
                "endereco_bairro": "Bairro Teste",
                "items": [
                    {
                        "nome": test_product['name'],
                        "quantidade": 2,
                        "preco": test_product.get('sale_price', 25.00),
                        "observacao": "Item de teste"
                    }
                ],
                "total": (test_product.get('sale_price', 25.00) * 2),
                "forma_pagamento": "dinheiro",
                "status": "aguardando_aceite",
                "tipo_entrega": "delivery"
            }
            
            success, pedido = self.run_test(
                "Create test pedido",
                "POST",
                "pedidos",
                200,
                data=pedido_data
            )
            
            if not success:
                print("❌ Failed to create pedido - cannot continue")
                return False
            
            created_pedido_id = pedido['id']
            print(f"   ✅ Pedido created successfully")
            print(f"   - ID: {pedido['id']}")
            print(f"   - Cliente: {pedido.get('cliente_nome', 'N/A')}")
            print(f"   - Total: R$ {pedido.get('total', 0):.2f}")
            
            # Step 3: Assign entregador to pedido
            print(f"\n📋 STEP 3: Assigning entregador to pedido via PATCH /api/pedidos/{created_pedido_id}/entregador")
            
            success, assigned_pedido = self.run_test(
                "Assign entregador to pedido",
                "PATCH",
                f"pedidos/{created_pedido_id}/entregador?entregador_id={created_entregador_id}",
                200
            )
            
            if not success:
                print("❌ Failed to assign entregador to pedido")
                return False
            
            print(f"   ✅ Entregador assigned successfully")
            print(f"   - Pedido ID: {assigned_pedido.get('id')}")
            print(f"   - Entregador ID: {assigned_pedido.get('entregador_id')}")
            print(f"   - Entregador Nome: {assigned_pedido.get('entregador_nome')}")
            print(f"   - Status: {assigned_pedido.get('status')}")
            
            # Step 4: Get entregador details
            print(f"\n📋 STEP 4: Getting entregador details via GET /api/entregadores/{created_entregador_id}")
            
            success, entregador_details = self.run_test(
                "Get entregador details",
                "GET",
                f"entregadores/{created_entregador_id}",
                200
            )
            
            if not success:
                print("❌ Failed to get entregador details")
                return False
            
            print(f"   ✅ Entregador details retrieved successfully")
            print(f"   - ID: {entregador_details.get('id')}")
            print(f"   - Nome: {entregador_details.get('nome')}")
            print(f"   - Telefone: {entregador_details.get('telefone')}")
            print(f"   - Veículo: {entregador_details.get('veiculo')}")
            print(f"   - Ativo: {entregador_details.get('ativo')}")
            
            # Step 5: Get entregador's pedidos
            print(f"\n📋 STEP 5: Getting entregador pedidos via GET /api/entregadores/{created_entregador_id}/pedidos")
            
            success, entregador_pedidos = self.run_test(
                "Get entregador pedidos",
                "GET",
                f"entregadores/{created_entregador_id}/pedidos",
                200
            )
            
            if not success:
                print("❌ Failed to get entregador pedidos")
                return False
            
            print(f"   ✅ Entregador pedidos retrieved successfully")
            print(f"   - Total pedidos: {len(entregador_pedidos)}")
            
            # Verify our test pedido is in the list
            test_pedido_found = False
            for pedido in entregador_pedidos:
                print(f"   - Pedido {pedido.get('codigo', pedido.get('id', 'N/A'))}: status={pedido.get('status')}, total=R$ {pedido.get('total', 0):.2f}")
                if pedido.get('id') == created_pedido_id:
                    test_pedido_found = True
            
            if test_pedido_found:
                print(f"   ✅ Test pedido found in entregador's pedidos list")
            else:
                print(f"   ❌ Test pedido NOT found in entregador's pedidos list")
                return False
            
            return True
            
        finally:
            # Cleanup
            print(f"\n🧹 CLEANUP: Deleting test data")
            
            if created_pedido_id:
                success, _ = self.run_test(
                    "Delete test pedido",
                    "DELETE",
                    f"pedidos/{created_pedido_id}",
                    200
                )
                if success:
                    print(f"   ✅ Deleted test pedido {created_pedido_id}")
            
            if created_entregador_id:
                success, _ = self.run_test(
                    "Delete test entregador",
                    "DELETE",
                    f"entregadores/{created_entregador_id}",
                    200
                )
                if success:
                    print(f"   ✅ Deleted test entregador {created_entregador_id}")

    def run(self):
        """Run the complete test suite"""
        print("🚀 ENTREGADOR DETAIL NAVIGATION TEST")
        print(f"Backend URL: {self.base_url}")
        
        success = self.test_entregador_navigation()
        
        print(f"\n" + "="*60)
        print("📊 TEST RESULTS")
        print("="*60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if success:
            print(f"\n🎉 ALL TESTS PASSED!")
            print(f"✅ Backend is ready for EntregadorDetalhe page navigation")
            print(f"✅ All required endpoints working correctly:")
            print(f"   - POST /api/entregadores (create entregador)")
            print(f"   - POST /api/pedidos (create pedido)")
            print(f"   - PATCH /api/pedidos/{{id}}/entregador (assign entregador)")
            print(f"   - GET /api/entregadores/{{id}} (get entregador details)")
            print(f"   - GET /api/entregadores/{{id}}/pedidos (get entregador pedidos)")
        else:
            print(f"\n❌ SOME TESTS FAILED!")
            print(f"⚠️ Backend may not be ready for EntregadorDetalhe page navigation")
        
        return success

if __name__ == "__main__":
    tester = EntregadorNavigationTester()
    success = tester.run()
    sys.exit(0 if success else 1)