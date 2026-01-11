#!/usr/bin/env python3
import requests
import json

def test_chatbot_endpoint():
    """Test ChatBot process endpoint as specified in review request"""
    print("=== CHATBOT PROCESS ENDPOINT TEST ===")
    print("🎯 Testing ChatBot endpoint POST /api/chatbot/process as specified in review request:")
    print("   1. Login with credentials Addad/Addad123 to get token")
    print("   2. Send test message to POST /api/chatbot/process")
    print("   3. Verify response has success: true and AI response")
    
    base_url = "http://localhost:8001"
    
    # Step 1: Login with Addad/Addad123 credentials
    print("\n🔍 STEP 1: Login with Addad/Addad123 credentials...")
    
    login_url = f"{base_url}/api/auth/login"
    login_data = {"username": "Addad", "password": "Addad123"}
    
    try:
        login_response = requests.post(login_url, json=login_data, timeout=10)
        print(f"   Login response status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            if 'access_token' in login_result:
                token = login_result['access_token']
                print(f"   ✅ STEP 1 PASSED: Addad login successful")
                print(f"   - User role: {login_result['user']['role']}")
                print(f"   - Token obtained: {token[:20]}...")
            else:
                print(f"   ❌ STEP 1 FAILED: No access token in response")
                return False
        else:
            print(f"   ❌ STEP 1 FAILED: Login failed with status {login_response.status_code}")
            try:
                error_detail = login_response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Response text: {login_response.text}")
            return False
    except Exception as e:
        print(f"   ❌ STEP 1 FAILED: Login request failed - {str(e)}")
        return False
    
    # Step 2: Send test message to ChatBot process endpoint
    print(f"\n🔍 STEP 2: Send test message to POST /api/chatbot/process...")
    
    chatbot_url = f"{base_url}/api/chatbot/process"
    chatbot_message = {
        "message": "Olá, qual o horário de funcionamento?",
        "phone": "simulador",
        "push_name": "Teste Simulador"
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    print(f"   Request body:")
    print(f"   - message: {chatbot_message['message']}")
    print(f"   - phone: {chatbot_message['phone']}")
    print(f"   - push_name: {chatbot_message['push_name']}")
    
    try:
        chatbot_response = requests.post(chatbot_url, json=chatbot_message, headers=headers, timeout=30)
        print(f"   ChatBot response status: {chatbot_response.status_code}")
        
        if chatbot_response.status_code == 200:
            chatbot_result = chatbot_response.json()
            print(f"   ✅ STEP 2 PASSED: ChatBot endpoint responded successfully")
            print(f"   Response structure:")
            for key, value in chatbot_result.items():
                if key == 'response' and len(str(value)) > 100:
                    print(f"   - {key}: {str(value)[:100]}... (truncated)")
                else:
                    print(f"   - {key}: {value}")
        else:
            print(f"   ❌ STEP 2 FAILED: ChatBot endpoint failed with status {chatbot_response.status_code}")
            try:
                error_detail = chatbot_response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Response text: {chatbot_response.text}")
            return False
    except Exception as e:
        print(f"   ❌ STEP 2 FAILED: ChatBot request failed - {str(e)}")
        return False
    
    # Step 3: Verify response structure
    print(f"\n🔍 STEP 3: Verify response has success: true and AI response...")
    
    # Check if response has success field
    if 'success' not in chatbot_result:
        print(f"   ❌ STEP 3 FAILED: Response missing 'success' field")
        return False
    
    # Check if success is true
    if chatbot_result['success'] is not True:
        print(f"   ❌ STEP 3 FAILED: success field is not true, got: {chatbot_result['success']}")
        return False
    
    print(f"   ✅ success field is true")
    
    # Check if response has AI response
    if 'response' not in chatbot_result:
        print(f"   ❌ STEP 3 FAILED: Response missing 'response' field with AI response")
        return False
    
    ai_response = chatbot_result['response']
    if not ai_response or len(str(ai_response).strip()) == 0:
        print(f"   ❌ STEP 3 FAILED: AI response is empty")
        return False
    
    print(f"   ✅ AI response present: {str(ai_response)[:100]}...")
    
    # Additional validation - check if response looks like AI generated content
    ai_response_str = str(ai_response).lower()
    ai_indicators = ['horário', 'funcionamento', 'aberto', 'fechado', 'atendimento', 'horas']
    
    has_relevant_content = any(indicator in ai_response_str for indicator in ai_indicators)
    if has_relevant_content:
        print(f"   ✅ AI response contains relevant content about business hours")
    else:
        print(f"   ⚠️ AI response may not be contextually relevant, but endpoint is working")
    
    print(f"\n✅ CHATBOT PROCESS ENDPOINT TEST COMPLETED SUCCESSFULLY")
    print(f"   ✅ Login with Addad/Addad123 working")
    print(f"   ✅ POST /api/chatbot/process endpoint working")
    print(f"   ✅ Response format correct (success: true, response with AI content)")
    print(f"   ✅ Backend is processing messages correctly for the new Simulador de conversas")
    
    return True

if __name__ == "__main__":
    result = test_chatbot_endpoint()
    print(f"\n=== FINAL RESULT ===")
    print(f"ChatBot Process Endpoint Test: {'PASSED' if result else 'FAILED'}")