import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Métricas customizadas
export let errorRate = new Rate('errors');
export let requestCounter = new Counter('process_requests_total');
export let processingTime = new Trend('process_duration');

const BASE_URL = 'http://192.168.0.100:30080';

export let options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up para 5 usuários
    { duration: '2m', target: 10 },   // Manter 10 usuários
    { duration: '30s', target: 20 },  // Pico de 20 usuários
    { duration: '1m', target: 20 },   // Manter pico
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% das requisições < 2s
    http_req_failed: ['rate<0.1'],      // Taxa de erro < 10%
    errors: ['rate<0.1'],
    process_duration: ['p(90)<1500'],   // 90% do processamento < 1.5s
  },
};

// Diferentes tipos de dados para processar
const DATA_TYPES = [
  // Dados simples
  ['dado-inicial'],
  ['config-sistema'],
  ['log-aplicacao'],
  
  // Dados estruturados
  ['usuario-1', 'sessao-abc123', 'acao-login'],
  ['produto-456', 'categoria-eletronicos', 'estoque-100'],
  ['pedido-789', 'cliente-xyz', 'status-processando'],
  
  // Dados complexos
  ['transacao-001', 'valor-1500.50', 'tipo-credito', 'validacao-pendente'],
  ['evento-sistema', 'timestamp-' + Date.now(), 'nivel-info', 'modulo-auth'],
  ['dados-analiticos', 'metrica-conversao', 'periodo-7dias', 'segmento-premium'],
  
  // Lotes grandes
  ['lote-processamento', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5'],
  ['bulk-import', 'registro-1', 'registro-2', 'registro-3', 'registro-4', 'registro-5', 'registro-6'],
];

function getRandomData() {
  return DATA_TYPES[Math.floor(Math.random() * DATA_TYPES.length)];
}

function makeProcessRequest(data) {
  const url = `${BASE_URL}/process`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const startTime = Date.now();
  let response = http.post(url, JSON.stringify(data), params);
  const endTime = Date.now();
  
  // Registra métricas customizadas
  requestCounter.add(1);
  errorRate.add(response.status !== 200);
  processingTime.add(endTime - startTime);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response has content': (r) => r.body && r.body.length > 0,
    'no server errors': (r) => r.status < 500,
  });
  
  return response;
}

export default function() {
  // Seleciona dados aleatórios para processar
  const data = getRandomData();
  
  console.log(`Processando: ${JSON.stringify(data)}`);
  
  // Faz a requisição
  makeProcessRequest(data);
  
  // Pausa variável (simula tempo de preparação do usuário)
  sleep(1 + Math.random() * 4);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'process-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;
  
  let output = `\n${indent}📊 Relatório de Teste de Carga do Endpoint /process\n`;
  output += `${indent}===============================================\n\n`;
  
  // Estatísticas gerais
  output += `${indent}🎯 Requisições Totais: ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}✅ Sucessos: ${data.metrics.http_reqs.values.count - (data.metrics.http_req_failed.values.fails || 0)}\n`;
  output += `${indent}❌ Falhas: ${data.metrics.http_req_failed.values.fails || 0}\n`;
  output += `${indent}📈 Taxa de Sucesso: ${((1 - (data.metrics.http_req_failed.values.rate || 0)) * 100).toFixed(2)}%\n\n`;
  
  // Tempos de resposta
  if (data.metrics.http_req_duration) {
    output += `${indent}⏱️  Tempos de Resposta:\n`;
    output += `${indent}   Média: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}   P90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms\n`;
    output += `${indent}   P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  }
  
  // Métricas customizadas
  if (data.metrics.process_requests_total) {
    output += `${indent}🔄 Processamentos: ${data.metrics.process_requests_total.values.count}\n`;
  }
  
  if (data.metrics.process_duration) {
    output += `${indent}⚡ Tempo de Processamento:\n`;
    output += `${indent}   Média: ${data.metrics.process_duration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}   P90: ${data.metrics.process_duration.values['p(90)'].toFixed(2)}ms\n\n`;
  }
  
  return output;
}
