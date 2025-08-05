#!/bin/bash

# Script para executar simulações K6 de diferentes dias da semana
# Simula uma semana completa de dados históricos

K6_SCRIPT_DIR="$(dirname "$0")"
APP_URL="http://192.168.0.100:30080"

echo "🚀 Iniciando simulação de uma semana completa com K6"
echo "🎯 Alvo: $APP_URL"
echo ""

# Testa conectividade
echo "🔍 Testando conectividade..."
if curl -s "$APP_URL" > /dev/null; then
    echo "✅ Aplicação acessível!"
else
    echo "❌ Erro ao acessar aplicação. Verifique se está rodando."
    exit 1
fi

echo ""
echo "📊 Iniciando simulação de 7 dias..."

# Simula Segunda-feira
echo "📅 Simulando Segunda-feira (dia útil - carga alta)"
SCENARIO=weekday k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Segunda-feira concluída"
sleep 5

# Simula Terça-feira
echo "📅 Simulando Terça-feira (dia útil - carga alta)"
SCENARIO=weekday k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Terça-feira concluída"
sleep 5

# Simula Quarta-feira
echo "📅 Simulando Quarta-feira (dia útil - carga alta)"
SCENARIO=weekday k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Quarta-feira concluída"
sleep 5

# Simula Quinta-feira
echo "📅 Simulando Quinta-feira (dia útil - carga alta)"
SCENARIO=weekday k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Quinta-feira concluída"
sleep 5

# Simula Sexta-feira
echo "📅 Simulando Sexta-feira (dia útil - carga média/alta)"
SCENARIO=weekday k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Sexta-feira concluída"
sleep 5

# Simula Sábado
echo "📅 Simulando Sábado (fim de semana - carga baixa)"
SCENARIO=weekend k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Sábado concluído"
sleep 5

# Simula Domingo
echo "📅 Simulando Domingo (fim de semana - carga muito baixa)"
SCENARIO=weekend k6 run --quiet "$K6_SCRIPT_DIR/realistic-load.js"
echo "   ✅ Domingo concluído"

echo ""
echo "🎉 Simulação da semana completa concluída!"
echo ""
echo "📈 Dados gerados:"
echo "   • 7 dias de dados simulados"
echo "   • Padrões de carga realísticos"
echo "   • Diferenças entre dias úteis e fins de semana"
echo "   • Variações horárias ao longo do dia"
echo ""
echo "🔍 Verificar métricas no Prometheus:"
echo "   • app_requests_total - Métricas reais"
echo "   • app_requests_total_simulated - Métricas com recording rules"
echo ""
echo "🚀 O PredictKube agora tem dados históricos realísticos para predições!"
