#!/usr/bin/env python3
"""
Test script for new authentication endpoints as specified in review request.

Tests:
1. POST /api/auth/check-login - Verificar se login/telefone existe
   - Testar com username válido "Addad" - deve retornar {found: true, type: "user", needs_password: true}
   - Testar com telefone inválido "99999999" - deve retornar {found: false}

2. POST /api/auth/client-login - Login de cliente
   - Apenas verificar se o endpoint existe e responde

Backend rodando em http://localhost:8001
"""

import requests
import json
import sys

class NewAuthEndpointsTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Data: {data}")
        
        try:
            if method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)

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

    def test_new_auth_endpoints(self):
        """Test the new authentication endpoints as specified in review request"""
        print("\n=== NEW AUTHENTICATION ENDPOINTS TESTS ===")
        print("🎯 Testing new authentication endpoints as specified in review request:")
        print("   1. POST /api/auth/check-login - Verificar se login/telefone existe")
        print("      - Testar com username válido 'Addad' - deve retornar {found: true, type: 'user', needs_password: true}")
        print("      - Testar com telefone inválido '99999999' - deve retornar {found: false}")
        print("   2. POST /api/auth/client-login - Login de cliente")
        print("      - Apenas verificar se o endpoint existe e responde")
        print("   Backend rodando em http://localhost:8001")
        
        all_tests_passed = True
        
        # TEST 1.1: POST /api/auth/check-login with valid username "Addad"
        print(f"\n🔍 TEST 1.1: POST /api/auth/check-login with valid username 'Addad'")
        success, check_response = self.run_test(
            "Check login with valid username Addad",
            "POST",
            "auth/check-login",
            200,
            data={"identifier": "Addad"}
        )
        
        if success:
            print(f"   ✅ Endpoint responded successfully")
            print(f"   Response: {json.dumps(check_response, indent=2)}")
            
            # Verify expected response structure
            expected_found = True
            expected_type = "user"
            expected_needs_password = True
            
            actual_found = check_response.get('found')
            actual_type = check_response.get('type')
            actual_needs_password = check_response.get('needs_password')
            
            print(f"   Expected: found={expected_found}, type='{expected_type}', needs_password={expected_needs_password}")
            print(f"   Actual:   found={actual_found}, type='{actual_type}', needs_password={actual_needs_password}")
            
            if (actual_found == expected_found and 
                actual_type == expected_type and 
                actual_needs_password == expected_needs_password):
                print(f"   ✅ TEST 1.1 PASSED: Response matches expected format for valid username 'Addad'")
            else:
                print(f"   ❌ TEST 1.1 FAILED: Response does not match expected format")
                all_tests_passed = False
                
            # Check additional fields
            if 'name' in check_response:
                print(f"   - Name: {check_response['name']}")
            if 'photo' in check_response:
                print(f"   - Photo: {check_response['photo']}")
        else:
            print(f"   ❌ TEST 1.1 FAILED: Endpoint did not respond successfully")
            all_tests_passed = False
        
        # TEST 1.2: POST /api/auth/check-login with invalid phone "99999999"
        print(f"\n🔍 TEST 1.2: POST /api/auth/check-login with invalid phone '99999999'")
        success, check_response = self.run_test(
            "Check login with invalid phone 99999999",
            "POST",
            "auth/check-login",
            200,
            data={"identifier": "99999999"}
        )
        
        if success:
            print(f"   ✅ Endpoint responded successfully")
            print(f"   Response: {json.dumps(check_response, indent=2)}")
            
            # Verify expected response structure for not found
            expected_found = False
            expected_type = "not_found"
            expected_needs_password = False
            
            actual_found = check_response.get('found')
            actual_type = check_response.get('type')
            actual_needs_password = check_response.get('needs_password')
            
            print(f"   Expected: found={expected_found}, type='{expected_type}', needs_password={expected_needs_password}")
            print(f"   Actual:   found={actual_found}, type='{actual_type}', needs_password={actual_needs_password}")
            
            if (actual_found == expected_found and 
                actual_type == expected_type and 
                actual_needs_password == expected_needs_password):
                print(f"   ✅ TEST 1.2 PASSED: Response matches expected format for invalid phone '99999999'")
            else:
                print(f"   ❌ TEST 1.2 FAILED: Response does not match expected format")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 1.2 FAILED: Endpoint did not respond successfully")
            all_tests_passed = False
        
        # TEST 2: POST /api/auth/client-login - Just verify endpoint exists and responds
        print(f"\n🔍 TEST 2: POST /api/auth/client-login - Verificar se endpoint existe e responde")
        
        # First, we need to get a client_id. Let's try with a dummy one to see if endpoint exists
        success, client_response = self.run_test(
            "Test client login endpoint existence",
            "POST",
            "auth/client-login",
            200,  # We expect 200 even if client not found (based on implementation)
            data={"client_id": "dummy-client-id", "senha": "dummy-password"}
        )
        
        if success:
            print(f"   ✅ TEST 2 PASSED: Client login endpoint exists and responds")
            print(f"   Response: {json.dumps(client_response, indent=2)}")
            
            # Check response structure
            if 'success' in client_response:
                print(f"   - Success field present: {client_response['success']}")
            if 'message' in client_response:
                print(f"   - Message field present: {client_response['message']}")
            if 'client' in client_response:
                print(f"   - Client field present: {client_response['client']}")
        else:
            print(f"   ❌ TEST 2 FAILED: Client login endpoint does not exist or does not respond")
            all_tests_passed = False
        
        # TEST 2.1: Try with missing client_id to test validation
        print(f"\n🔍 TEST 2.1: POST /api/auth/client-login with missing client_id (validation test)")
        success, validation_response = self.run_test(
            "Test client login validation",
            "POST",
            "auth/client-login",
            422,  # Expect validation error
            data={"senha": "test"}
        )
        
        if success:
            print(f"   ✅ Endpoint properly validates required fields (422)")
            print(f"   Validation response: {json.dumps(validation_response, indent=2)}")
        else:
            # Try with 400 status code instead
            success, validation_response = self.run_test(
                "Test client login validation (400)",
                "POST",
                "auth/client-login",
                400,
                data={"senha": "test"}
            )
            if success:
                print(f"   ✅ Endpoint properly validates required fields (400 status)")
                print(f"   Validation response: {json.dumps(validation_response, indent=2)}")
            else:
                print(f"   ⚠️ Endpoint validation behavior differs from expected (not critical)")
        
        # Summary
        print(f"\n🔍 NEW AUTHENTICATION ENDPOINTS TESTING SUMMARY:")
        if all_tests_passed:
            print(f"   ✅ ALL NEW AUTH ENDPOINT TESTS PASSED")
            print(f"   ✅ POST /api/auth/check-login working correctly")
            print(f"      - Valid username 'Addad' returns: found=true, type='user', needs_password=true")
            print(f"      - Invalid phone '99999999' returns: found=false")
            print(f"   ✅ POST /api/auth/client-login endpoint exists and responds")
        else:
            print(f"   ❌ SOME NEW AUTH ENDPOINT TESTS FAILED")
            print(f"   ℹ️ Check individual test results above for details")
        
        return all_tests_passed

    def run_all_tests(self):
        """Run all new authentication endpoint tests"""
        print("🚀 Starting New Authentication Endpoints Testing...")
        print(f"   Base URL: {self.base_url}")
        
        success = self.test_new_auth_endpoints()
        
        # Print summary
        print(f"\n{'='*60}")
        print("🏁 TESTING COMPLETE")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return success

if __name__ == "__main__":
    tester = NewAuthEndpointsTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ ALL NEW AUTHENTICATION ENDPOINT TESTS PASSED!")
        print("🎉 New authentication endpoints working correctly!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED!")
        sys.exit(1)