# 🍽️ Núcleo - Sistema de Gestão de CMV

Sistema completo de gestão de **CMV (Custo de Mercadoria Vendida)** para restaurantes.

---

## 🚀 Início Rápido - Windows

### Pré-requisitos

Instale antes de usar:

| Software | Download | Observação |
|----------|----------|------------|
| **Python 3.11** | [python.org/downloads](https://python.org/downloads) | Marque "Add to PATH" na instalação |
| **Node.js** | [nodejs.org](https://nodejs.org) | Versão LTS recomendada |

### Como usar

1. **Duplo clique em `Nucleo.bat`**
2. Aguarde ~30 segundos na primeira vez (instala dependências)
3. O navegador abre automaticamente
4. Faça login: `Addad` / `Addad123`

**Pronto!** ✅

---

### O que o launcher faz automaticamente:

✅ Detecta Python e Node.js instalados  
✅ Cria ambiente virtual Python (venv)  
✅ Instala dependências do backend  
✅ Instala dependências do frontend  
✅ Inicia os servidores  
✅ Abre o navegador  
✅ Mantém tudo rodando  

---

## 📋 Funcionalidades

- ✅ **Autenticação** com JWT (3 níveis: proprietário, administrador, observador)
- ✅ **Ingredientes/Estoque** - CRUD com controle de estoque e códigos automáticos
- ✅ **Produtos** - Receitas com cálculo automático de CMV
- ✅ **Compras** - Lançamento individual ou em lote
- ✅ **Fornecedores** - Cadastro com CPF/CNPJ formatado
- ✅ **Categorias** - Organização de produtos
- ✅ **Relatórios** - Dashboard e histórico
- ✅ **Auditoria** - Log de todas as ações

---

## 🔧 Informações Técnicas

### Portas utilizadas
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8001

### Credenciais padrão
- **Usuário:** `Addad`
- **Senha:** `Addad123`

### Dados persistentes
- **Banco:** `backend/data_backup/nucleo.db` (SQLite)
- **Backup:** `backend/data_backup/nucleo_backup.xlsx`

---

## 🏗️ Estrutura do Projeto

```
/nucleo
├── Nucleo.bat            # ← CLIQUE AQUI PARA INICIAR
├── backend/              # Servidor FastAPI (Python)
│   ├── server.py
│   ├── database.py
│   ├── requirements.txt
│   └── data_backup/      # Banco de dados
├── frontend/             # Interface React
│   ├── src/
│   └── package.json
└── README.md
```

---

## ❓ Problemas Comuns

### "Python não encontrado"
1. Baixe Python 3.11 em [python.org](https://python.org/downloads)
2. Na instalação, **marque "Add Python to PATH"**
3. Reinicie o computador
4. Execute `Nucleo.bat` novamente

### "Node.js não encontrado"
1. Baixe Node.js em [nodejs.org](https://nodejs.org)
2. Instale a versão LTS
3. Reinicie o computador
4. Execute `Nucleo.bat` novamente

### Navegador não abre
Acesse manualmente: http://localhost:3000

### Como encerrar o sistema
1. Pressione qualquer tecla na janela do Núcleo
2. Ou feche a janela diretamente

---

## 📝 Notas de Versão

### v3.0 - Windows Native
- 🖥️ Launcher 100% Windows (sem Bash/Git Bash)
- ⚡ Setup automático na primeira execução
- 🔄 Boot < 60 segundos (após primeiro uso)
- 🌐 Abre navegador automaticamente

---

**© 2025 Núcleo - Sistema de Gestão de CMV**
