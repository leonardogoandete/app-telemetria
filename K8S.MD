# App Telemetria - Plataforma de Auto-Scaling Preditivo

## 📋 Visão Geral

Esta é uma plataforma completa de telemetria com auto-scaling preditivo usando KEDA e PredictKube, que inclui:

- **Aplicação de telemetria** com métricas Prometheus
- **Auto-scaling preditivo** com KEDA 2.15.1 e PredictKube
- **Monitoramento** com Prometheus e Grafana
- **Testes de carga** com K6
- **Simulação de dados históricos** para treinamento do modelo preditivo

## 🛠️ Pré-requisitos

### 1. MicroK8s
```bash
# Instalar MicroK8s
sudo snap install microk8s --classic

# Adicionar usuário ao grupo microk8s
sudo usermod -a -G microk8s $USER
sudo chown -f -R $USER ~/.kube

# Reiniciar sessão ou executar:
newgrp microk8s

# Habilitar addons necessários
microk8s enable dns
microk8s enable storage
microk8s enable metallb  # Configure com range de IPs da sua rede

# Configurar kubectl
microk8s kubectl config view --raw > ~/.kube/config
```

### 2. Helm
```bash
# Instalar Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
sudo apt-get install apt-transport-https --yes
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm
```

### 3. Docker
```bash
# Instalar Docker (se não estiver instalado)
sudo apt-get update
sudo apt-get install docker.io
sudo usermod -aG docker $USER
# Reiniciar sessão após adicionar ao grupo
```

## 🚀 Instalação e Configuração

### 1. Instalar KEDA 2.15.1 via Helm

```bash
# Adicionar repositório do KEDA
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Criar namespace para KEDA
kubectl create namespace keda-system

# Instalar KEDA 2.15.1
helm install keda kedacore/keda \
  --version 2.15.1 \
  --namespace keda-system \
  --set prometheus.metricServer.enabled=true \
  --set prometheus.operator.enabled=true

# Verificar instalação
kubectl get pods -n keda-system
```

### 2. Habilitar Métricas do KEDA para Prometheus

```bash
# Habilitar métricas do Prometheus no KEDA operator
kubectl patch deployment keda-operator -n keda-system --type='json' -p='[
  {
    "op": "replace", 
    "path": "/spec/template/spec/containers/0/args", 
    "value": [
      "--zap-log-level=info",
      "--zap-encoder=console", 
      "--zap-time-encoding=rfc3339",
      "--cert-dir=/certs",
      "--enable-cert-rotation=true",
      "--cert-secret-name=kedaorg-certs",
      "--operator-service-name=keda-operator",
      "--metrics-server-service-name=keda-operator-metrics-apiserver",
      "--webhooks-service-name=keda-admission-webhooks",
      "--k8s-cluster-name=kubernetes-default",
      "--k8s-cluster-domain=cluster.local",
      "--enable-prometheus-metrics=true",
      "--metrics-bind-address=0.0.0.0:8080"
    ]
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/ports/-",
    "value": {
      "containerPort": 8080,
      "name": "http-metrics",
      "protocol": "TCP"
    }
  }
]'

# Aguardar o rollout
kubectl rollout status deployment/keda-operator -n keda-system
```

### 3. Configurar PredictKube (Opcional)

```bash
# Criar secret para PredictKube (substitua pelos valores corretos)
kubectl create secret generic predictkube-secrets \
  --from-literal=api-key="sua-chave-api" \
  --from-literal=endpoint="https://api.predictkube.com"
```

## 📦 Deploy da Aplicação

### 1. Deploy Automático
```bash
# Tornar o script executável
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

### 2. Deploy Manual
```bash
# Build da imagem
cd src
docker build -t app-telemetria:latest .
cd ..

# Importar imagem para MicroK8s
docker save app-telemetria:latest | microk8s ctr image import -

# Aplicar manifestos
kubectl apply -k k8s/

# Aguardar pods ficarem prontos
kubectl wait --for=condition=ready pod -l app=app-a --timeout=300s
kubectl wait --for=condition=ready pod -l app=prometheus --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana --timeout=300s
```

## 🌐 Acesso aos Serviços

### NodePort (Acesso Externo)
- **Aplicação**: http://192.168.0.100:30080
- **Métricas da Aplicação**: http://192.168.0.100:30081  
- **Prometheus**: http://192.168.0.100:30090
- **Grafana**: http://192.168.0.100:30300
  - Usuário: `admin`
  - Senha: `admin123`

### Port-Forward (Acesso Local)
```bash
# Aplicação
kubectl port-forward svc/app-a-service 8000:8000

# Prometheus  
kubectl port-forward svc/prometheus-service 9090:9090

# Grafana
kubectl port-forward svc/grafana-service 3000:3000
```

## 📊 Monitoramento e Métricas

### Métricas Disponíveis

#### Aplicação (app-a)
- `app_requests_total` - Total de requisições
- `app_requests_historical_*` - Dados históricos simulados (7 dias)

#### KEDA
- `keda_internal_metricsservice_grpc_client_handled_total` - Requisições gRPC
- `keda_internal_metricsservice_grpc_client_handling_seconds` - Latência gRPC
- Métricas de scaling e performance

### Dashboard Grafana

O Grafana inclui um dashboard pré-configurado com:
- **Taxa de requisições atual**
- **Total de requisições**
- **Threshold do PredictKube** 
- **Pods ativos**
- **Tendência de requisições com thresholds**
- **Atividade de scaling**
- **Distribuição por endpoint**
- **Dados históricos simulados**
- **Métricas do KEDA**

## 🧪 Testes de Carga

### K6 Load Testing
```bash
# Instalar K6
sudo apt-get update
sudo apt-get install k6

# Executar teste básico
k6 run src/load-test.js

# Executar teste realístico (com padrões de fim de semana/semana)
k6 run src/realistic-load.js
```

### Padrões de Teste
- **load-test.js**: Teste básico com carga crescente
- **realistic-load.js**: Padrões realísticos com variação semanal/fim de semana

## ⚙️ Configuração do Auto-Scaling

### PredictKube ScaledObject
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: app-a-predictkube
spec:
  scaleTargetRef:
    name: app-a
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
  - type: predictkube
    metadata:
      # Threshold para scaling (requests/sec)
      threshold: "10"
      activationThreshold: "5"
      # Janela de histórico para previsão
      historyTimeWindow: "7d"
      # Horizonte de previsão
      predictionHorizon: "2h"
```

### Thresholds Configurados
- **Threshold**: 10 req/s (inicia scaling)
- **Activation Threshold**: 5 req/s (ativa o scaler)
- **Min Replicas**: 1
- **Max Replicas**: 10

## 🔧 Troubleshooting

### Verificar Status dos Pods
```bash
kubectl get pods -A
kubectl describe pod <pod-name>
kubectl logs <pod-name> -f
```

### Verificar KEDA
```bash
kubectl get scaledobjects
kubectl describe scaledobject app-a-predictkube
kubectl logs -n keda-system -l app=keda-operator -f
```

### Verificar Métricas
```bash
# Testar métricas da aplicação
curl http://192.168.0.100:30081/metrics

# Verificar targets no Prometheus
curl http://192.168.0.100:30090/api/v1/targets
```

### Logs dos Componentes
```bash
# Aplicação
kubectl logs -l app=app-a -f

# Prometheus
kubectl logs -l app=prometheus -f

# Grafana
kubectl logs -l app=grafana -f

# KEDA
kubectl logs -n keda-system -l app=keda-operator -f
```

## 🗑️ Limpeza

```bash
# Remover aplicação
kubectl delete -k k8s/

# Remover KEDA
helm uninstall keda -n keda-system
kubectl delete namespace keda-system

# Remover imagem do MicroK8s
microk8s ctr images rm app-telemetria:latest
```

## 📁 Estrutura do Projeto

```
app-telemetria/
├── src/                          # Código da aplicação
│   ├── app.py                   # Aplicação Flask
│   ├── Dockerfile               # Build da imagem
│   ├── requirements.txt         # Dependências Python
│   ├── load-test.js            # Teste K6 básico
│   └── realistic-load.js       # Teste K6 realístico
├── k8s/                         # Manifestos Kubernetes
│   ├── app-a-deployment.yaml   # Deploy da aplicação
│   ├── app-a-service.yaml      # Serviço da aplicação
│   ├── app-a-scaledobject.yaml # Auto-scaling KEDA/PredictKube
│   ├── prometheus-*.yaml       # Configuração Prometheus
│   ├── grafana-*.yaml          # Configuração Grafana
│   └── kustomization.yaml      # Kustomize
├── deploy.sh                    # Script de deploy automático
└── README.md                    # Esta documentação
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request
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