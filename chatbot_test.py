#!/usr/bin/env python3
"""
ChatBot Inteligente Endpoints Test
Testing the new chatbot endpoints as specified in review request
"""

import requests
import sys
import json
from datetime import datetime

class ChatBotTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_nodes = []
        self.created_edges = []

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
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
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

    def authenticate(self):
        """Authenticate with Addad user as specified in review request"""
        print("🔍 Authenticating with Addad user...")
        success, login_response = self.run_test(
            "Login with Addad user",
            "POST",
            "auth/login",
            200,
            data={"username": "Addad", "password": "Addad123"}
        )
        
        if success and 'access_token' in login_response:
            self.token = login_response['access_token']
            print(f"   ✅ Addad login successful")
            print(f"   - User role: {login_response['user']['role']}")
            return True
        
        print(f"   ❌ Addad login failed - trying fallback authentication...")
        # Try other authentication methods as fallback
        fallback_users = [
            ("admin", "admin"),
            ("teste_admin", "senha123"),
            ("proprietario", "senha123")
        ]
        
        for username, password in fallback_users:
            success, response = self.run_test(
                f"Fallback login with {username}",
                "POST",
                "auth/login",
                200,
                data={"username": username, "password": password}
            )
            
            if success and 'access_token' in response:
                self.token = response['access_token']
                print(f"   ✅ Fallback authentication successful with {username}")
                return True
        
        print(f"   ❌ No valid authentication found")
        return False

    def test_chatbot_endpoints(self):
        """Test ChatBot Inteligente endpoints as specified in review request"""
        print("\n=== CHATBOT INTELIGENTE ENDPOINTS TESTS ===")
        print("🎯 Testing ChatBot endpoints as specified in review request:")
        print("   1. POST /api/chatbot/process - Processar mensagem com IA")
        print("   2. GET /api/chatbot/flow - Listar nós e conexões do fluxograma")
        print("   3. POST /api/chatbot/flow/node - Criar nó no fluxograma")
        print("   4. PUT /api/chatbot/flow/node/{id} - Atualizar nó")
        print("   5. POST /api/chatbot/flow/edge - Criar conexão")
        print("   6. GET /api/whatsapp/status - Verificar se auto-reply está funcionando")
        print("   Credenciais: Addad/Addad123")
        print("   Backend URL: http://localhost:8001")
        
        all_tests_passed = True
        
        # TEST 1: POST /api/chatbot/process - Processar mensagem com IA
        print(f"\n🔍 TEST 1: POST /api/chatbot/process - Processar mensagem com IA")
        
        chatbot_message_data = {
            "phone": "5511999999999",
            "message": "Olá, bom dia!",
            "push_name": "Cliente Teste"
        }
        
        success, chatbot_response = self.run_test(
            "Process chatbot message with AI",
            "POST",
            "chatbot/process",
            200,
            data=chatbot_message_data
        )
        
        if success:
            print(f"   ✅ Chatbot process endpoint working")
            print(f"      - Success: {chatbot_response.get('success', False)}")
            response_text = chatbot_response.get('response', 'N/A')
            if len(response_text) > 100:
                response_text = response_text[:100] + "..."
            print(f"      - Response: {response_text}")
            
            if chatbot_response.get('success'):
                print(f"      ✅ TEST 1 PASSED: Chatbot AI processing working")
            else:
                print(f"      ⚠️ TEST 1 PARTIAL: Endpoint works but AI processing may have issues")
        else:
            print(f"   ❌ TEST 1 FAILED: Chatbot process endpoint failed")
            all_tests_passed = False
        
        # TEST 2: GET /api/chatbot/flow - Listar nós e conexões do fluxograma
        print(f"\n🔍 TEST 2: GET /api/chatbot/flow - Listar nós e conexões do fluxograma")
        
        success, flow_response = self.run_test(
            "Get chatbot flow nodes and edges",
            "GET",
            "chatbot/flow",
            200
        )
        
        if success:
            nodes = flow_response.get('nodes', [])
            edges = flow_response.get('edges', [])
            print(f"   ✅ Chatbot flow endpoint working")
            print(f"      - Success: {flow_response.get('success', False)}")
            print(f"      - Nodes found: {len(nodes)}")
            print(f"      - Edges found: {len(edges)}")
            
            # Verify response structure
            if flow_response.get('success') and 'nodes' in flow_response and 'edges' in flow_response:
                print(f"      ✅ TEST 2 PASSED: Flow listing working correctly")
            else:
                print(f"      ❌ TEST 2 FAILED: Invalid response structure")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 2 FAILED: Chatbot flow endpoint failed")
            all_tests_passed = False
        
        # TEST 3: POST /api/chatbot/flow/node - Criar nó no fluxograma
        print(f"\n🔍 TEST 3: POST /api/chatbot/flow/node - Criar nó no fluxograma")
        
        node_data = {
            "type": "ai",
            "title": "Saudação",
            "content": "Cumprimente o cliente",
            "position_x": 100,
            "position_y": 100
        }
        
        success, node_response = self.run_test(
            "Create chatbot flow node",
            "POST",
            "chatbot/flow/node",
            200,
            data=node_data
        )
        
        if success:
            created_node = node_response.get('node', {})
            if created_node and created_node.get('id'):
                self.created_nodes.append(created_node['id'])
                print(f"   ✅ Flow node created successfully")
                print(f"      - Node ID: {created_node['id']}")
                print(f"      - Type: {created_node.get('type', 'N/A')}")
                print(f"      - Title: {created_node.get('title', 'N/A')}")
                print(f"      ✅ TEST 3 PASSED: Node creation working")
            else:
                print(f"   ❌ TEST 3 FAILED: Node created but invalid response structure")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 3 FAILED: Failed to create flow node")
            all_tests_passed = False
        
        # TEST 4: PUT /api/chatbot/flow/node/{id} - Atualizar nó
        print(f"\n🔍 TEST 4: PUT /api/chatbot/flow/node/{{id}} - Atualizar nó")
        
        if self.created_nodes:
            node_id = self.created_nodes[0]
            update_data = {
                "title": "Saudação Atualizada"
            }
            
            success, update_response = self.run_test(
                "Update chatbot flow node",
                "PUT",
                f"chatbot/flow/node/{node_id}",
                200,
                data=update_data
            )
            
            if success:
                updated_node = update_response.get('node', {})
                print(f"   ✅ Flow node updated successfully")
                print(f"      - Updated title: {updated_node.get('title', 'N/A')}")
                
                if updated_node.get('title') == "Saudação Atualizada":
                    print(f"      ✅ TEST 4 PASSED: Node update working correctly")
                else:
                    print(f"      ❌ TEST 4 FAILED: Node update didn't persist changes")
                    all_tests_passed = False
            else:
                print(f"   ❌ TEST 4 FAILED: Failed to update flow node")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 4 SKIPPED: No nodes created to update")
            all_tests_passed = False
        
        # TEST 5: POST /api/chatbot/flow/edge - Criar conexão
        print(f"\n🔍 TEST 5: POST /api/chatbot/flow/edge - Criar conexão")
        
        # Create a second node first to connect to
        if self.created_nodes:
            second_node_data = {
                "type": "message",
                "title": "Resposta",
                "content": "Obrigado pelo contato!",
                "position_x": 200,
                "position_y": 200
            }
            
            success, second_node_response = self.run_test(
                "Create second node for edge connection",
                "POST",
                "chatbot/flow/node",
                200,
                data=second_node_data
            )
            
            if success:
                second_node = second_node_response.get('node', {})
                if second_node and second_node.get('id'):
                    self.created_nodes.append(second_node['id'])
                    
                    # Now create edge between the two nodes
                    edge_data = {
                        "source_id": self.created_nodes[0],
                        "target_id": self.created_nodes[1]
                    }
                    
                    success, edge_response = self.run_test(
                        "Create chatbot flow edge",
                        "POST",
                        "chatbot/flow/edge",
                        200,
                        data=edge_data
                    )
                    
                    if success:
                        created_edge = edge_response.get('edge', {})
                        if created_edge and created_edge.get('id'):
                            self.created_edges.append(created_edge['id'])
                            print(f"   ✅ Flow edge created successfully")
                            print(f"      - Edge ID: {created_edge['id']}")
                            print(f"      - Source: {created_edge.get('source_id', 'N/A')}")
                            print(f"      - Target: {created_edge.get('target_id', 'N/A')}")
                            print(f"      ✅ TEST 5 PASSED: Edge creation working")
                        else:
                            print(f"   ❌ TEST 5 FAILED: Edge created but invalid response structure")
                            all_tests_passed = False
                    else:
                        print(f"   ❌ TEST 5 FAILED: Failed to create flow edge")
                        all_tests_passed = False
                else:
                    print(f"   ❌ TEST 5 FAILED: Failed to create second node for edge")
                    all_tests_passed = False
            else:
                print(f"   ❌ TEST 5 FAILED: Failed to create second node for edge")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 5 SKIPPED: No nodes available to create edge")
            all_tests_passed = False
        
        # TEST 6: GET /api/whatsapp/status - Verificar se auto-reply está funcionando
        print(f"\n🔍 TEST 6: GET /api/whatsapp/status - Verificar se auto-reply está funcionando")
        
        success, whatsapp_status = self.run_test(
            "Check WhatsApp auto-reply status",
            "GET",
            "whatsapp/status",
            200
        )
        
        if success:
            print(f"   ✅ WhatsApp status endpoint working")
            print(f"      - Status: {whatsapp_status.get('status', 'N/A')}")
            print(f"      - Connected: {whatsapp_status.get('connected', False)}")
            print(f"      - Has QR: {whatsapp_status.get('hasQR', False)}")
            
            # Check if response has expected fields
            expected_fields = ['status', 'connected']
            missing_fields = [field for field in expected_fields if field not in whatsapp_status]
            
            if not missing_fields:
                print(f"      ✅ TEST 6 PASSED: WhatsApp status endpoint working correctly")
            else:
                print(f"      ❌ TEST 6 FAILED: Missing fields in response: {missing_fields}")
                all_tests_passed = False
        else:
            print(f"   ❌ TEST 6 FAILED: WhatsApp status endpoint failed")
            all_tests_passed = False
        
        return all_tests_passed

    def cleanup(self):
        """Clean up created test data"""
        print(f"\n🔍 CLEANUP: Deleting test chatbot data")
        
        # Delete created edges
        for edge_id in self.created_edges:
            success, _ = self.run_test(
                f"Delete test edge {edge_id}",
                "DELETE",
                f"chatbot/flow/edge/{edge_id}",
                200
            )
            if success:
                print(f"   ✅ Deleted test edge {edge_id}")
        
        # Delete created nodes
        for node_id in self.created_nodes:
            success, _ = self.run_test(
                f"Delete test node {node_id}",
                "DELETE",
                f"chatbot/flow/node/{node_id}",
                200
            )
            if success:
                print(f"   ✅ Deleted test node {node_id}")

    def run_all_tests(self):
        """Run all chatbot tests"""
        print("🚀 Starting ChatBot Inteligente API Testing...")
        print(f"Base URL: {self.base_url}")
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with tests")
            return False
        
        # Run chatbot tests
        try:
            chatbot_success = self.test_chatbot_endpoints()
        except Exception as e:
            print(f"❌ ChatBot tests failed with error: {e}")
            chatbot_success = False
        
        # Cleanup
        self.cleanup()
        
        # Summary
        print(f"\n{'='*50}")
        print("🏁 CHATBOT TESTING COMPLETE")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if chatbot_success:
            print("🎉 ALL CHATBOT TESTS PASSED!")
        else:
            print("⚠️ Some chatbot tests failed - check details above")
        
        return chatbot_success


def main():
    """Main function"""
    tester = ChatBotTester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"❌ Testing failed with exception: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())