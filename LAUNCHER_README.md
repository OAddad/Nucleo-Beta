# 🍽️ NucleoLauncher.exe - Guia Rápido

## O que é?

O **NucleoLauncher.exe** é um executável que inicia automaticamente o servidor do sistema Núcleo (backend + frontend) com apenas **um clique**.

---

## 📥 Como obter o executável

### Opção 1: Baixar pronto (se disponível)
Se o executável já foi compilado, basta copiar o `NucleoLauncher.exe` para a pasta raiz do projeto.

### Opção 2: Compilar você mesmo
1. Certifique-se de ter **Python** instalado
2. Execute o script de build:
   ```
   build_exe.bat
   ```
3. O executável será criado em `NucleoLauncher.exe`

---

## 🚀 Como usar

1. **Duplo clique** no `NucleoLauncher.exe`
2. Aguarde o servidor iniciar (~15 segundos)
3. O navegador abrirá automaticamente em `http://localhost:3000`
4. Faça login com suas credenciais

---

## 📋 Pré-requisitos

Para o executável funcionar, você precisa ter instalado:

| Software | Download |
|----------|----------|
| **Python 3.8+** | https://python.org |
| **Node.js 16+** | https://nodejs.org |
| **Yarn** (opcional) | `npm install -g yarn` |

> 💡 O launcher verifica automaticamente se as dependências estão instaladas.

---

## ❓ Perguntas Frequentes

### O servidor não inicia, o que fazer?
1. Verifique se Python e Node.js estão instalados
2. Verifique se o executável está na pasta raiz do projeto (onde tem as pastas `backend` e `frontend`)
3. Execute o `setup.sh` primeiro para instalar as dependências

### Como encerrar o servidor?
- Feche a janela do launcher, ou
- Pressione `Ctrl+C` na janela

### Posso mover o .exe para outro lugar?
Não. O executável precisa estar na pasta raiz do projeto, junto com as pastas `backend` e `frontend`.

### O navegador não abre automaticamente
Acesse manualmente: `http://localhost:3000`

---

## 🔧 Para desenvolvedores

### Recompilar o executável
```batch
build_exe.bat
```

### Executar launcher sem compilar
```batch
python launcher.py
```

### Estrutura de arquivos
```
/projeto
├── NucleoLauncher.exe    # Executável (após build)
├── launcher.py           # Script Python do launcher
├── build_exe.bat         # Script para compilar
├── backend/              # Servidor FastAPI
├── frontend/             # App React
└── ...
```

---

## 📝 Notas Técnicas

- O executável é compilado com **PyInstaller** (modo one-file)
- Funciona apenas no **Windows**
- O launcher inicia dois processos: backend (porta 8001) e frontend (porta 3000)
- Ao fechar o launcher, ambos os processos são encerrados automaticamente

---

**© 2025 Núcleo - Sistema de Gestão de CMV**
