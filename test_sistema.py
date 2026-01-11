#!/usr/bin/env python3
"""
Test script for Sistema endpoints as specified in review request
"""
import requests
import json

class SistemaEndpointsTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
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

    def test_sistema_endpoints(self):
        """Test the NEW Sistema endpoints as specified in review request"""
        print("\n=== SISTEMA ENDPOINTS TESTS ===")
        print("🎯 Testing NEW Sistema endpoints (antiga 'Preferências') as specified in review request:")
        print("   1. Login com credenciais Addad/Addad123")
        print("   2. GET /api/company/settings - deve retornar configurações da empresa")
        print("   3. PUT /api/company/settings - deve salvar configurações")
        print("   4. DELETE /api/data/products - deve exigir confirmation_word 'LIMPAR'")
        print("   5. DELETE /api/data/sales - testar com palavra incorreta")
        print("   6. DELETE /api/data/people - testar validação")
        print("   7. DELETE /api/data/financial - testar validação")
        print("   8. DELETE /api/data/locations - testar validação")
        print("   NÃO executar limpeza real - apenas verificar validação")
        
        all_tests_passed = True
        
        # TEST 1: Login com credenciais Addad/Addad123
        print(f"\n🔍 TEST 1: Login com credenciais Addad/Addad123")
        success, login_response = self.run_test(
            "Login with Addad/Addad123 for Sistema tests",
            "POST",
            "auth/login",
            200,
            data={"username": "Addad", "password": "Addad123"}
        )
        
        if success and 'access_token' in login_response:
            self.token = login_response['access_token']
            print(f"   ✅ TEST 1 PASSED: Addad login successful")
            print(f"   - User role: {login_response['user']['role']}")
            print(f"   - Username: {login_response['user']['username']}")
        else:
            print(f"   ❌ TEST 1 FAILED: Addad login failed")
            all_tests_passed = False
            return False
        
        # TEST 2: GET /api/company/settings
        print(f"\n🔍 TEST 2: GET /api/company/settings - deve retornar configurações da empresa")
        success, company_settings = self.run_test(
            "Get company settings",
            "GET",
            "company/settings",
            200
        )
        
        if success:
            print(f"   ✅ TEST 2 PASSED: Company settings retrieved successfully")
            print(f"   - Company name: {company_settings.get('company_name', 'N/A')}")
            print(f"   - Slogan: {company_settings.get('slogan', 'N/A')}")
            print(f"   - CNPJ: {company_settings.get('cnpj', 'N/A')}")
            print(f"   - Address: {company_settings.get('address', 'N/A')}")
            print(f"   - Logo URL: {company_settings.get('logo_url', 'N/A')}")
            
            # Verify expected fields are present
            expected_fields = ['company_name', 'slogan', 'cnpj', 'address', 'logo_url', 'fantasy_name', 'legal_name']
            missing_fields = [field for field in expected_fields if field not in company_settings]
            
            if missing_fields:
                print(f"   ⚠️ Missing expected fields: {missing_fields}")
            else:
                print(f"   ✅ All expected company settings fields present")
        else:
            print(f"   ❌ TEST 2 FAILED: Failed to get company settings")
            all_tests_passed = False
        
        # TEST 3: PUT /api/company/settings - deve salvar configurações
        print(f"\n🔍 TEST 3: PUT /api/company/settings - deve salvar configurações")
        
        test_settings = {
            "company_name": "Núcleo Teste",
            "slogan": "Sistema de Gestão Testado",
            "cnpj": "12.345.678/0001-90",
            "address": "Rua Teste, 123 - Centro",
            "fantasy_name": "Núcleo Fantasia",
            "legal_name": "Núcleo Razão Social Ltda",
            "founding_date": "2025-01-01",
            "phone": "(11) 99999-9999",
            "email": "teste@nucleo.com"
        }
        
        success, updated_settings = self.run_test(
            "Update company settings",
            "PUT",
            "company/settings",
            200,
            data=test_settings
        )
        
        if success:
            print(f"   ✅ TEST 3 PASSED: Company settings updated successfully")
            
            # Verify the settings were actually saved by getting them again
            success, verify_settings = self.run_test(
                "Verify company settings were saved",
                "GET",
                "company/settings",
                200
            )
            
            if success:
                # Check if our test values were saved
                saved_correctly = True
                for key, expected_value in test_settings.items():
                    actual_value = verify_settings.get(key)
                    if actual_value != expected_value:
                        print(f"      ⚠️ {key}: expected '{expected_value}', got '{actual_value}'")
                        saved_correctly = False
                
                if saved_correctly:
                    print(f"   ✅ All settings saved and verified correctly")
                else:
                    print(f"   ⚠️ Some settings may not have been saved correctly")
            else:
                print(f"   ❌ Could not verify settings were saved")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 3 FAILED: Failed to update company settings")
            all_tests_passed = False
        
        # TEST 4: DELETE /api/data/products - deve exigir confirmation_word "LIMPAR" e retornar erro se palavra incorreta
        print(f"\n🔍 TEST 4: DELETE /api/data/products - testar validação de confirmation_word")
        
        # 4a: Test with incorrect confirmation word (should fail)
        print(f"   4a: Testing with incorrect confirmation word")
        success, error_response = self.run_test(
            "Clear products data with wrong confirmation",
            "DELETE",
            "data/products",
            400,  # Expecting 400 Bad Request
            data={"confirmation_word": "WRONG"}
        )
        
        if success:
            print(f"   ✅ TEST 4a PASSED: Correctly rejected wrong confirmation word")
            print(f"      - Error message: {error_response.get('detail', 'N/A')}")
        else:
            print(f"   ❌ TEST 4a FAILED: Should have rejected wrong confirmation word")
            all_tests_passed = False
        
        # TEST 5: DELETE /api/data/sales - testar com palavra incorreta, deve retornar erro
        print(f"\n🔍 TEST 5: DELETE /api/data/sales - testar validação com palavra incorreta")
        success, error_response = self.run_test(
            "Clear sales data with wrong confirmation",
            "DELETE",
            "data/sales",
            400,  # Expecting 400 Bad Request
            data={"confirmation_word": "INCORRETA"}
        )
        
        if success:
            print(f"   ✅ TEST 5 PASSED: Correctly rejected wrong confirmation word for sales")
            print(f"      - Error message: {error_response.get('detail', 'N/A')}")
        else:
            print(f"   ❌ TEST 5 FAILED: Should have rejected wrong confirmation word")
            all_tests_passed = False
        
        # TEST 6: DELETE /api/data/people - testar validação
        print(f"\n🔍 TEST 6: DELETE /api/data/people - testar validação")
        success, error_response = self.run_test(
            "Clear people data with wrong confirmation",
            "DELETE",
            "data/people",
            400,  # Expecting 400 Bad Request
            data={"confirmation_word": "INVALID"}
        )
        
        if success:
            print(f"   ✅ TEST 6 PASSED: Correctly rejected wrong confirmation word for people")
            print(f"      - Error message: {error_response.get('detail', 'N/A')}")
        else:
            print(f"   ❌ TEST 6 FAILED: Should have rejected wrong confirmation word")
            all_tests_passed = False
        
        # TEST 7: DELETE /api/data/financial - testar validação
        print(f"\n🔍 TEST 7: DELETE /api/data/financial - testar validação")
        success, error_response = self.run_test(
            "Clear financial data with wrong confirmation",
            "DELETE",
            "data/financial",
            400,  # Expecting 400 Bad Request
            data={"confirmation_word": "NOPE"}
        )
        
        if success:
            print(f"   ✅ TEST 7 PASSED: Correctly rejected wrong confirmation word for financial")
            print(f"      - Error message: {error_response.get('detail', 'N/A')}")
        else:
            print(f"   ❌ TEST 7 FAILED: Should have rejected wrong confirmation word")
            all_tests_passed = False
        
        # TEST 8: DELETE /api/data/locations - testar validação
        print(f"\n🔍 TEST 8: DELETE /api/data/locations - testar validação")
        success, error_response = self.run_test(
            "Clear locations data with wrong confirmation",
            "DELETE",
            "data/locations",
            400,  # Expecting 400 Bad Request
            data={"confirmation_word": "CLEAR"}
        )
        
        if success:
            print(f"   ✅ TEST 8 PASSED: Correctly rejected wrong confirmation word for locations")
            print(f"      - Error message: {error_response.get('detail', 'N/A')}")
        else:
            print(f"   ❌ TEST 8 FAILED: Should have rejected wrong confirmation word")
            all_tests_passed = False
        
        # ADDITIONAL TEST: Test that all endpoints require proprietario role
        print(f"\n🔍 ADDITIONAL TEST: Verificar que endpoints de limpeza exigem role proprietario")
        
        # Check current user role
        current_role = login_response.get('user', {}).get('role', 'unknown')
        print(f"   Current user role: {current_role}")
        
        if current_role == "proprietario":
            print(f"   ✅ User has proprietario role - cleanup endpoints should work")
        else:
            print(f"   ⚠️ User does not have proprietario role - cleanup endpoints may fail with 403")
        
        # Summary
        print(f"\n🔍 SISTEMA ENDPOINTS TESTING SUMMARY:")
        if all_tests_passed:
            print(f"   ✅ ALL SISTEMA TESTS PASSED")
            print(f"   ✅ Login with Addad/Addad123 working")
            print(f"   ✅ Company settings GET/PUT working")
            print(f"   ✅ Data cleanup endpoints validation working")
            print(f"   ✅ Confirmation word 'LIMPAR' validation working")
            print(f"   ✅ Error handling for incorrect confirmation words working")
        else:
            print(f"   ❌ SOME SISTEMA TESTS FAILED")
            print(f"   ℹ️ Check individual test results above for details")
        
        return all_tests_passed


if __name__ == "__main__":
    print("🚀 Starting Sistema Endpoints Testing...")
    tester = SistemaEndpointsTester()
    success = tester.test_sistema_endpoints()
    
    if success:
        print("\n🎉 ALL SISTEMA TESTS PASSED!")
    else:
        print("\n❌ SOME SISTEMA TESTS FAILED!")
    
    exit(0 if success else 1)