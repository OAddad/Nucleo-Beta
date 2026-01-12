#!/usr/bin/env python3
"""
Test script for Keyword Responses endpoints as specified in review request
"""
import requests
import json
import sys

class KeywordResponsesTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.created_responses = []
        
    def login(self):
        """Authenticate with Addad/Addad123 as specified in review"""
        print("🔍 Authenticating with Addad/Addad123...")
        
        url = f"{self.base_url}/api/auth/login"
        data = {"username": "Addad", "password": "Addad123"}
        
        try:
            response = requests.post(url, json=data, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if 'access_token' in result:
                    self.token = result['access_token']
                    print(f"✅ Login successful - Role: {result['user']['role']}")
                    return True
            
            print(f"❌ Login failed with Addad/Addad123")
            return False
            
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make authenticated API request"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.token}' if self.token else ''
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            result = response.json() if response.content else {}
            
            print(f"   {method} {endpoint} - Status: {response.status_code} {'✅' if success else '❌'}")
            
            return success, result
            
        except Exception as e:
            print(f"   {method} {endpoint} - Error: {e} ❌")
            return False, {}
    
    def test_keyword_responses(self):
        """Test all keyword responses endpoints"""
        print("\n=== KEYWORD RESPONSES ENDPOINTS TESTS ===")
        print("🎯 Testing as specified in review request:")
        print("   Credenciais: Addad/Addad123")
        print("   Backend: http://localhost:8001")
        
        if not self.login():
            return False
        
        all_passed = True
        
        # TEST 1: GET /api/keyword-responses
        print("\n🔍 TEST 1: GET /api/keyword-responses - Listar todas as respostas")
        success, responses_data = self.make_request('GET', 'keyword-responses')
        if success:
            responses = responses_data.get('responses', []) if isinstance(responses_data, dict) else responses_data
            print(f"   ✅ Found {len(responses)} existing responses")
        else:
            print(f"   ❌ Failed to get responses")
            all_passed = False
        
        # TEST 2: POST /api/keyword-responses - Criar nova resposta
        print("\n🔍 TEST 2: POST /api/keyword-responses - Criar nova resposta")
        new_response = {
            "keywords": "oi, olá, bom dia",
            "response": "Olá! Seja bem-vindo. Como posso ajudar?",
            "is_active": True,
            "priority": 1,
            "match_type": "contains"
        }
        
        success, created = self.make_request('POST', 'keyword-responses', new_response)
        if success:
            response_data = created.get('response', {}) if isinstance(created, dict) else created
            response_id = response_data.get('id')
            if response_id:
                self.created_responses.append(response_id)
                print(f"   ✅ Created response ID: {response_id}")
                print(f"   - Keywords: {response_data.get('keywords')}")
                print(f"   - Response: {response_data.get('response')}")
            else:
                print(f"   ❌ No ID returned in response")
                all_passed = False
        else:
            print(f"   ❌ Failed to create response")
            all_passed = False
        
        # TEST 3: GET /api/keyword-responses/{id}
        if self.created_responses:
            response_id = self.created_responses[0]
            print(f"\n🔍 TEST 3: GET /api/keyword-responses/{response_id} - Buscar resposta específica")
            success, specific = self.make_request('GET', f'keyword-responses/{response_id}')
            if success:
                response_data = specific.get('response', {}) if isinstance(specific, dict) else specific
                print(f"   ✅ Retrieved response: {response_data.get('keywords')}")
            else:
                print(f"   ❌ Failed to get specific response")
                all_passed = False
        
        # TEST 4: PUT /api/keyword-responses/{id}
        if self.created_responses:
            response_id = self.created_responses[0]
            print(f"\n🔍 TEST 4: PUT /api/keyword-responses/{response_id} - Atualizar resposta")
            updated_data = {
                "keywords": "oi, olá",  # Changed as specified
                "response": "Olá! Seja bem-vindo. Como posso ajudar?",
                "is_active": True,
                "priority": 1,
                "match_type": "contains"
            }
            
            success, updated = self.make_request('PUT', f'keyword-responses/{response_id}', updated_data)
            if success:
                response_data = updated.get('response', {}) if isinstance(updated, dict) else updated
                print(f"   ✅ Updated keywords to: {response_data.get('keywords')}")
            else:
                print(f"   ❌ Failed to update response")
                all_passed = False
        
        # TEST 5: DELETE /api/keyword-responses/{id}
        if self.created_responses:
            response_id = self.created_responses[0]
            print(f"\n🔍 TEST 5: DELETE /api/keyword-responses/{response_id} - Deletar resposta")
            success, _ = self.make_request('DELETE', f'keyword-responses/{response_id}')
            if success:
                print(f"   ✅ Deleted response successfully")
                self.created_responses.remove(response_id)
            else:
                print(f"   ❌ Failed to delete response")
                all_passed = False
        
        # TEST 6: POST /api/chatbot/process
        print(f"\n🔍 TEST 6: POST /api/chatbot/process - Testar processamento de palavras-chave")
        
        # Create a test response first
        test_response = {
            "keywords": "oi, tudo bem",
            "response": "Oi! Tudo bem sim, obrigado por perguntar!",
            "is_active": True,
            "priority": 1,
            "match_type": "contains"
        }
        
        success, created = self.make_request('POST', 'keyword-responses', test_response)
        if success:
            test_id = created.get('response', {}).get('id') if isinstance(created, dict) else created.get('id')
            if test_id:
                self.created_responses.append(test_id)
            
            # Test chatbot processing
            chatbot_data = {
                "message": "oi, tudo bem?",
                "phone": "test_phone",
                "push_name": "Test User"
            }
            
            success, chatbot_result = self.make_request('POST', 'chatbot/process', chatbot_data)
            if success:
                print(f"   ✅ Chatbot processed message successfully")
                print(f"   - Response: {chatbot_result.get('response', 'N/A')[:100]}...")
            else:
                print(f"   ❌ Chatbot processing failed")
                all_passed = False
            
            # Clean up test response
            if test_id:
                self.make_request('DELETE', f'keyword-responses/{test_id}')
                if test_id in self.created_responses:
                    self.created_responses.remove(test_id)
        
        # Clean up any remaining responses
        for response_id in self.created_responses[:]:
            self.make_request('DELETE', f'keyword-responses/{response_id}')
        
        return all_passed

def main():
    tester = KeywordResponsesTester()
    
    print("🚀 Testing Keyword Responses Endpoints")
    print("=" * 50)
    
    success = tester.test_keyword_responses()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 ALL KEYWORD RESPONSES TESTS PASSED!")
        return 0
    else:
        print("❌ SOME TESTS FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())