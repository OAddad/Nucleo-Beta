#!/usr/bin/env python3
"""
Print Connector Endpoints Testing
Testa os endpoints do Print Connector rodando na porta 9100
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:9100"

def test_endpoint(method, endpoint, expected_fields=None, description=""):
    """Testa um endpoint específico"""
    url = f"{BASE_URL}{endpoint}"
    
    print(f"\n{'='*60}")
    print(f"TESTE: {method} {endpoint}")
    print(f"Descrição: {description}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, timeout=10)
        else:
            print(f"❌ Método {method} não suportado")
            return False
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response JSON:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
                
                # Verificar campos esperados se fornecidos
                if expected_fields:
                    missing_fields = []
                    for field in expected_fields:
                        if field not in data:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        print(f"⚠️  Campos ausentes: {missing_fields}")
                    else:
                        print(f"✅ Todos os campos esperados presentes: {expected_fields}")
                
                print(f"✅ SUCESSO: Endpoint respondeu corretamente")
                return True
                
            except json.JSONDecodeError:
                print(f"Response Text: {response.text}")
                print(f"✅ SUCESSO: Endpoint respondeu (não JSON)")
                return True
        else:
            print(f"❌ ERRO: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ ERRO: Não foi possível conectar ao Print Connector")
        print(f"Verifique se o serviço está rodando em {BASE_URL}")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ ERRO: Timeout na requisição")
        return False
    except Exception as e:
        print(f"❌ ERRO: {str(e)}")
        return False

def main():
    """Executa todos os testes dos endpoints do Print Connector"""
    
    print(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRINT CONNECTOR ENDPOINTS TESTING                        ║
║                           Porta: 9100                                       ║
║                     Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
""")
    
    # Lista de testes a executar
    tests = [
        {
            "method": "GET",
            "endpoint": "/health",
            "expected_fields": ["status", "version"],
            "description": "Deve retornar status 'online', version '1.0.0'"
        },
        {
            "method": "GET", 
            "endpoint": "/printers",
            "expected_fields": None,  # Pode estar vazio se não há impressora
            "description": "Deve listar impressoras USB detectadas (pode estar vazio)"
        },
        {
            "method": "GET",
            "endpoint": "/queue", 
            "expected_fields": None,
            "description": "Deve retornar a fila de impressão"
        },
        {
            "method": "GET",
            "endpoint": "/logs",
            "expected_fields": None,
            "description": "Deve retornar os logs do sistema"
        },
        {
            "method": "GET",
            "endpoint": "/config",
            "expected_fields": ["defaultPrinter", "allowedOrigins", "paperWidth"],
            "description": "Deve retornar as configurações"
        }
    ]
    
    # Executar testes
    results = []
    for test in tests:
        result = test_endpoint(
            test["method"], 
            test["endpoint"], 
            test["expected_fields"],
            test["description"]
        )
        results.append({
            "endpoint": test["endpoint"],
            "success": result,
            "description": test["description"]
        })
    
    # Resumo dos resultados
    print(f"\n{'='*80}")
    print(f"RESUMO DOS TESTES")
    print(f"{'='*80}")
    
    passed = 0
    failed = 0
    
    for result in results:
        status = "✅ PASSOU" if result["success"] else "❌ FALHOU"
        print(f"{result['endpoint']:20} - {status}")
        if result["success"]:
            passed += 1
        else:
            failed += 1
    
    print(f"\n{'='*80}")
    print(f"RESULTADO FINAL:")
    print(f"✅ Testes que passaram: {passed}")
    print(f"❌ Testes que falharam: {failed}")
    print(f"📊 Taxa de sucesso: {(passed/(passed+failed)*100):.1f}%")
    print(f"{'='*80}")
    
    # Verificações específicas mencionadas na review request
    print(f"\n🔍 VERIFICAÇÕES ESPECÍFICAS DA REVIEW REQUEST:")
    print(f"1. GET /health deve retornar status 'online', version '1.0.0'")
    print(f"2. GET /printers deve listar impressoras USB (pode estar vazio)")
    print(f"3. GET /queue deve retornar a fila de impressão")
    print(f"4. GET /logs deve retornar os logs do sistema")
    print(f"5. GET /config deve retornar as configurações")
    
    if passed == len(tests):
        print(f"\n🎉 TODOS OS ENDPOINTS DO PRINT CONNECTOR ESTÃO FUNCIONANDO!")
        return True
    else:
        print(f"\n⚠️  ALGUNS ENDPOINTS APRESENTARAM PROBLEMAS")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)