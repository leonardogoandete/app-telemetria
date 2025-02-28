# Aplicação para Exemplo de Telemetria

Este projeto consiste em uma aplicação FastAPI simples projetada para demonstrar a instrumentação com OpenTelemetry em um sistema distribuído. A aplicação simula um ambiente de microsserviços com múltiplos componentes que se comunicam entre si.

## Sobre o Projeto

O projeto inclui:

- Uma API básica construída com FastAPI
- Simulação de latência variável e erros
- Encadeamento de chamadas entre múltiplos serviços
- Configuração completa de Docker e Docker Compose para execução fácil

Este código serve como ponto de partida para uma aula/workshop sobre instrumentação de aplicações com OpenTelemetry. O código base está pronto para ter instrumentação adicionada.

## Estrutura do Projeto

```
.
├── app.py                # Aplicação principal FastAPI
├── Dockerfile            # Instruções para build da imagem Docker
├── docker-compose.yml    # Configuração de múltiplos serviços
└── requirements.txt      # Dependências Python
```

## Pré-requisitos

- Docker
- Docker Compose

## Como Executar

1. Clone o repositório:

```bash
git clone <url-do-repositorio>
cd <diretorio-do-projeto>
```

2. Inicie o serviço com Docker Compose:

```bash
docker-compose up --build
```

Isso iniciará uma instância da aplicação:
- `app-a` - acessível em http://localhost:8000

## Testando a Aplicação

### Verificar o status do serviço:

```bash
curl http://localhost:8000/
```

Você deverá receber uma resposta como:
```json
{"message": "Esse é o serviço app-a"}
```

### Enviar uma requisição de processamento:

```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '["dado-inicial"]'
```

## Configuração

O arquivo `docker-compose.yml` está configurado inicialmente para executar apenas o serviço `app-a`. Você pode descomentar as seções dos serviços `app-b` e `app-c`, bem como as variáveis de ambiente adicionais, para criar um ambiente distribuído mais complexo.

```yaml
version: '3.8'

services:
  app-a:
    build: .
    ports:
      - "8000:8000"
    environment:
      - APP_NAME=app-a
      # - APP_URL_DESTINO=http://app-b:8000
      # - APP_ERRORS=5
      # - APP_LATENCY=100
    networks:
      - app-network

  # app-b:
  #   build: .
  #   ports:
  #     - "8001:8000"
  #   environment:
  #     - APP_NAME=app-b
  #     - APP_URL_DESTINO=http://app-c:8000
  #     - APP_ERRORS=10
  #     - APP_LATENCY=150
  #   networks:
  #     - app-network

  # app-c:
  #   build: .
  #   ports:
  #     - "8002:8000"
  #   environment:
  #     - APP_NAME=app-c
  #     - APP_ERRORS=15
  #     - APP_LATENCY=200
  #   networks:
  #     - app-network

networks:
  app-network:
```

Você pode personalizar o comportamento dos serviços modificando as variáveis de ambiente:

- `APP_NAME`: Nome do serviço
- `APP_URL_DESTINO`: URL para qual o serviço deve propagar a requisição
- `APP_ERRORS`: Porcentagem de requisições que resultarão em erro (0-100)
- `APP_LATENCY`: Latência máxima em milissegundos (atraso aleatório entre 0 e esse valor)