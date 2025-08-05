#!/bin/bash

# Script para build e deploy no Kubernetes

set -e

echo "🔧 Construindo imagem Docker..."
cd src
docker build -t app-telemetria:latest .
cd ..

echo "� Importando imagem para o MicroK8s..."
docker save app-telemetria:latest | microk8s ctr image import -

echo "�🚀 Aplicando manifestos do Kubernetes..."
kubectl apply -k k8s/

echo "⏳ Aguardando pods ficarem prontos..."
kubectl wait --for=condition=ready pod -l app=app-a --timeout=300s
kubectl wait --for=condition=ready pod -l app=prometheus --timeout=300s

echo "✅ Deploy concluído!"
echo ""
echo "🌐 Serviços disponíveis:"
echo "   App-A: http://192.168.0.100:30080 (NodePort) ou http://localhost:8000 (se usando port-forward)"
echo "   App-A Metrics: http://192.168.0.100:30081 (NodePort) ou http://localhost:8080 (se usando port-forward)"
echo "   Prometheus: http://192.168.0.100:30090 (NodePort) ou http://localhost:9090 (se usando port-forward)"
echo ""
echo "📊 Para acessar os serviços:"
echo "   App-A via NodePort: http://192.168.0.100:30080"
echo "   App-A Metrics via NodePort: http://192.168.0.100:30081"
echo "   App-A via port-forward: kubectl port-forward svc/app-a-service 8000:8000"
echo "   Prometheus via NodePort: http://192.168.0.100:30090"
echo "   Prometheus via port-forward: kubectl port-forward svc/prometheus-service 9090:9090"
echo ""
echo "📋 Para ver os logs:"
echo "   kubectl logs -l app=app-a -f"
echo "   kubectl logs -l app=prometheus -f"
