# Núcleo Print Connector

Aplicativo local para impressão térmica ESC/POS em impressoras 80mm.

## Requisitos

- Windows 10/11
- Impressora térmica USB (Epson recomendada)
- Papel 80mm

## Instalação

1. Baixe o `NucleoPrintConnector.exe`
2. Execute o arquivo
3. O serviço inicia automaticamente na porta 9100

## Como funciona

```
[Sistema Web Núcleo] --HTTP--> [Print Connector :9100] --USB--> [Impressora]
```

## API Endpoints

### GET /health
Status do serviço
```json
{
  "status": "online",
  "version": "1.0.0",
  "printer_connected": true,
  "printer_name": "Epson TM-T20"
}
```

### GET /printers
Lista impressoras USB detectadas

### POST /printers/connect
Seleciona impressora padrão
```json
{
  "vendorId": 1208,
  "productId": 514,
  "name": "Epson TM-T20"
}
```

### POST /print
Imprime pedido
```json
{
  "pedido": { ... },
  "template": "cozinha",
  "copies": 1,
  "cut": true
}
```

### POST /test
Imprime página de teste

### GET /queue
Lista fila de impressão

### GET /logs
Últimos 200 eventos de log

## Configurações Técnicas

- Largura do papel: 80mm
- Largura imprimível: 72mm
- DPI: 203
- Colunas: 48
- Codepage: CP850 (acentuação PT-BR)
- Margens: 0

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Gerar executável Windows
npm run build
```

## Dados Persistentes

Configurações salvas em:
- Windows: `%APPDATA%/NucleoPrintConnector/config.json`
- Linux: `~/.config/NucleoPrintConnector/config.json`

## Troubleshooting

### Impressora não detectada
1. Verifique conexão USB
2. Instale drivers da impressora
3. Reinicie o Print Connector

### Erro de permissão USB
1. Execute como administrador
2. Ou configure regras udev (Linux)

### Caracteres estranhos
1. Verifique se a impressora suporta CP850
2. Teste com template de teste

---

© 2025 Núcleo - Sistema de Gestão PDV
