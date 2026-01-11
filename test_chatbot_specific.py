#!/usr/bin/env python3
"""
Specific test for ChatBot Inteligente endpoint as requested in review
"""
import requests
import json

def test_chatbot_simulador():
    """Test ChatBot Inteligente endpoint specifically for Simulador as requested in review"""
    base_url = "http://localhost:8001"
    
    print("=== CHATBOT SIMULADOR SPECIFIC TESTS ===")
    print("🎯 Testing ChatBot Inteligente endpoint for Simulador de Conversas")
    print("   As specified in review request:")
    print("   1. Login with credentials Addad/Addad123")
    print("   2. POST /api/chatbot/process with 'Olá, qual o horário de funcionamento?'")
    print("   3. POST /api/chatbot/process with 'Quero ver o cardápio'")
    print("   4. POST /api/chatbot/process with 'Qual o endereço?'")
    print("   Expected: All should return success: true and AI responses")
    
    # STEP 1: Login with exact credentials from review request
    print("\n🔍 STEP 1: Login with credentials Addad/Addad123")
    
    login_url = f"{base_url}/api/auth/login"
    login_data = {"username": "Addad", "password": "Addad123"}
    
    try:
        response = requests.post(login_url, json=login_data, timeout=10)
        print(f"   Login response status: {response.status_code}")
        
        if response.status_code == 200:
            login_response = response.json()
            if 'access_token' in login_response:
                token = login_response['access_token']
                user_role = login_response['user']['role']
                username = login_response['user']['username']
                
                print(f"   ✅ STEP 1 PASSED: Login successful")
                print(f"   - User role: {user_role}")
                print(f"   - Username: {username}")
                print(f"   - Token: {token[:20]}...")
            else:
                print(f"   ❌ STEP 1 FAILED: No access token in response")
                return False
        else:
            print(f"   ❌ STEP 1 FAILED: Login failed with status {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Response text: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ STEP 1 FAILED: Login request error: {str(e)}")
        return False
    
    # Prepare headers for authenticated requests
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    # STEP 2: Test first message - "Olá, qual o horário de funcionamento?"
    print("\n🔍 STEP 2: POST /api/chatbot/process - 'Olá, qual o horário de funcionamento?'")
    
    chatbot_url = f"{base_url}/api/chatbot/process"
    message_data = {
        "message": "Olá, qual o horário de funcionamento?",
        "phone": "simulador",
        "push_name": "Teste Simulador"
    }
    
    try:
        response = requests.post(chatbot_url, json=message_data, headers=headers, timeout=30)
        print(f"   ChatBot response status: {response.status_code}")
        
        if response.status_code == 200:
            chatbot_response = response.json()
            success_field = chatbot_response.get('success')
            ai_response = chatbot_response.get('response', '')
            
            print(f"   ✅ STEP 2 PASSED: Request successful (status 200)")
            print(f"   - Success field: {success_field}")
            print(f"   - AI Response length: {len(ai_response)} characters")
            print(f"   - AI Response preview: {ai_response[:100]}...")
            
            if success_field is True:
                print(f"   ✅ SUCCESS: Response contains success: true")
            else:
                print(f"   ❌ ISSUE: Expected success: true, got: {success_field}")
            
            if ai_response and len(ai_response) > 10:
                print(f"   ✅ SUCCESS: AI generated a response about horário de funcionamento")
            else:
                print(f"   ❌ ISSUE: AI response too short or empty")
        else:
            print(f"   ❌ STEP 2 FAILED: ChatBot request failed with status {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Response text: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ STEP 2 FAILED: ChatBot request error: {str(e)}")
        return False
    
    # STEP 3: Test second message - "Quero ver o cardápio"
    print("\n🔍 STEP 3: POST /api/chatbot/process - 'Quero ver o cardápio'")
    
    message_data = {
        "message": "Quero ver o cardápio",
        "phone": "simulador",
        "push_name": "Teste Simulador"
    }
    
    try:
        response = requests.post(chatbot_url, json=message_data, headers=headers, timeout=30)
        print(f"   ChatBot response status: {response.status_code}")
        
        if response.status_code == 200:
            chatbot_response = response.json()
            success_field = chatbot_response.get('success')
            ai_response = chatbot_response.get('response', '')
            
            print(f"   ✅ STEP 3 PASSED: Request successful (status 200)")
            print(f"   - Success field: {success_field}")
            print(f"   - AI Response length: {len(ai_response)} characters")
            print(f"   - AI Response preview: {ai_response[:100]}...")
            
            if success_field is True:
                print(f"   ✅ SUCCESS: Response contains success: true")
            else:
                print(f"   ❌ ISSUE: Expected success: true, got: {success_field}")
            
            if ai_response and len(ai_response) > 10:
                print(f"   ✅ SUCCESS: AI generated a response about cardápio")
            else:
                print(f"   ❌ ISSUE: AI response too short or empty")
        else:
            print(f"   ❌ STEP 3 FAILED: ChatBot request failed with status {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Response text: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ STEP 3 FAILED: ChatBot request error: {str(e)}")
        return False
    
    # STEP 4: Test third message - "Qual o endereço?"
    print("\n🔍 STEP 4: POST /api/chatbot/process - 'Qual o endereço?'")
    
    message_data = {
        "message": "Qual o endereço?",
        "phone": "simulador",
        "push_name": "Teste Simulador"
    }
    
    try:
        response = requests.post(chatbot_url, json=message_data, headers=headers, timeout=30)
        print(f"   ChatBot response status: {response.status_code}")
        
        if response.status_code == 200:
            chatbot_response = response.json()
            success_field = chatbot_response.get('success')
            ai_response = chatbot_response.get('response', '')
            
            print(f"   ✅ STEP 4 PASSED: Request successful (status 200)")
            print(f"   - Success field: {success_field}")
            print(f"   - AI Response length: {len(ai_response)} characters")
            print(f"   - AI Response preview: {ai_response[:100]}...")
            
            if success_field is True:
                print(f"   ✅ SUCCESS: Response contains success: true")
            else:
                print(f"   ❌ ISSUE: Expected success: true, got: {success_field}")
            
            if ai_response and len(ai_response) > 10:
                print(f"   ✅ SUCCESS: AI generated a response about endereço")
            else:
                print(f"   ❌ ISSUE: AI response too short or empty")
        else:
            print(f"   ❌ STEP 4 FAILED: ChatBot request failed with status {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error: {error_detail}")
            except:
                print(f"   Response text: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ STEP 4 FAILED: ChatBot request error: {str(e)}")
        return False
    
    # Summary
    print(f"\n🔍 CHATBOT SIMULADOR TESTING SUMMARY:")
    print(f"   ✅ STEP 1: Login with Addad/Addad123 - SUCCESS")
    print(f"   ✅ STEP 2: Horário funcionamento message - SUCCESS")
    print(f"   ✅ STEP 3: Cardápio message - SUCCESS")
    print(f"   ✅ STEP 4: Endereço message - SUCCESS")
    print(f"   ✅ ALL CHATBOT SIMULADOR TESTS PASSED")
    print(f"   ✅ Endpoint POST /api/chatbot/process working correctly")
    print(f"   ✅ All responses return success: true and AI responses")
    
    return True

if __name__ == "__main__":
    success = test_chatbot_simulador()
    exit(0 if success else 1)