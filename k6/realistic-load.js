import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Métricas customizadas
export let errorRate = new Rate('errors');
export let requestCounter = new Counter('custom_requests_total');

const BASE_URL = 'http://192.168.0.100:30080';

// Configuração para diferentes cenários
const SCENARIOS = {
  weekday: {
    stages: [
      { duration: '1m', target: 2 },   // 00:00-01:00
      { duration: '1m', target: 1 },   // 01:00-02:00
      { duration: '1m', target: 1 },   // 02:00-03:00
      { duration: '1m', target: 2 },   // 03:00-04:00
      { duration: '1m', target: 3 },   // 04:00-05:00
      { duration: '1m', target: 5 },   // 05:00-06:00
      { duration: '1m', target: 15 },  // 06:00-07:00 - Começa o rush
      { duration: '1m', target: 30 },  // 07:00-08:00 - Rush da manhã
      { duration: '1m', target: 40 },  // 08:00-09:00 - Início trabalho
      { duration: '1m', target: 35 },  // 09:00-10:00
      { duration: '1m', target: 45 },  // 10:00-11:00 - Pico manhã
      { duration: '1m', target: 40 },  // 11:00-12:00
      { duration: '1m', target: 25 },  // 12:00-13:00 - Almoço
      { duration: '1m', target: 30 },  // 13:00-14:00
      { duration: '1m', target: 50 },  // 14:00-15:00 - Pico tarde
      { duration: '1m', target: 55 },  // 15:00-16:00 - Maior pico
      { duration: '1m', target: 45 },  // 16:00-17:00
      { duration: '1m', target: 35 },  // 17:00-18:00 - Fim trabalho
      { duration: '1m', target: 20 },  // 18:00-19:00
      { duration: '1m', target: 15 },  // 19:00-20:00
      { duration: '1m', target: 10 },  // 20:00-21:00
      { duration: '1m', target: 8 },   // 21:00-22:00
      { duration: '1m', target: 5 },   // 22:00-23:00
      { duration: '1m', target: 3 },   // 23:00-24:00
    ]
  },
  weekend: {
    stages: [
      { duration: '1m', target: 1 },   // 00:00-01:00
      { duration: '1m', target: 1 },   // 01:00-02:00
      { duration: '1m', target: 1 },   // 02:00-03:00
      { duration: '1m', target: 1 },   // 03:00-04:00
      { duration: '1m', target: 1 },   // 04:00-05:00
      { duration: '1m', target: 2 },   // 05:00-06:00
      { duration: '1m', target: 3 },   // 06:00-07:00
      { duration: '1m', target: 5 },   // 07:00-08:00
      { duration: '1m', target: 8 },   // 08:00-09:00
      { duration: '1m', target: 12 },  // 09:00-10:00 - Sábado manhã
      { duration: '1m', target: 15 },  // 10:00-11:00
      { duration: '1m', target: 18 },  // 11:00-12:00
      { duration: '1m', target: 20 },  // 12:00-13:00 - Pico fim de semana
      { duration: '1m', target: 22 },  // 13:00-14:00
      { duration: '1m', target: 25 },  // 14:00-15:00 - Pico da tarde
      { duration: '1m', target: 20 },  // 15:00-16:00
      { duration: '1m', target: 18 },  // 16:00-17:00
      { duration: '1m', target: 15 },  // 17:00-18:00
      { duration: '1m', target: 12 },  // 18:00-19:00
      { duration: '1m', target: 10 },  // 19:00-20:00
      { duration: '1m', target: 8 },   // 20:00-21:00
      { duration: '1m', target: 6 },   // 21:00-22:00
      { duration: '1m', target: 4 },   // 22:00-23:00
      { duration: '1m', target: 2 },   // 23:00-24:00
    ]
  }
};

// Seleciona cenário baseado na variável de ambiente ou padrão
const scenario = __ENV.SCENARIO || 'weekday';
export let options = {
  stages: SCENARIOS[scenario].stages,
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
};

// Diferentes padrões de comportamento por horário
function getRequestPattern() {
  const hour = new Date().getHours();
  
  if (hour >= 2 && hour <= 5) {
    // Madrugada - apenas bots e monitoramento
    return ['health_check', 'metrics'];
  } else if (hour >= 6 && hour <= 8) {
    // Manhã cedo - usuários checando sistema
    return ['home', 'health_check', 'process'];
  } else if (hour >= 9 && hour <= 11) {
    // Manhã - alta atividade
    return ['home', 'browse', 'search', 'api', 'process', 'bulk_process'];
  } else if (hour >= 12 && hour <= 13) {
    // Almoço - atividade média
    return ['home', 'browse', 'process'];
  } else if (hour >= 14 && hour <= 17) {
    // Tarde - pico de atividade
    return ['home', 'browse', 'search', 'api', 'metrics', 'process', 'bulk_process'];
  } else {
    // Noite - atividade baixa
    return ['home', 'health_check', 'process'];
  }
}

function makeRequest(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  let response = http.get(url);
  
  // Registra métricas customizadas
  requestCounter.add(1);
  errorRate.add(response.status !== 200);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  return response;
}

function makePostRequest(endpoint, payload) {
  const url = `${BASE_URL}${endpoint}`;
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  let response = http.post(url, JSON.stringify(payload), params);
  
  // Registra métricas customizadas
  requestCounter.add(1);
  errorRate.add(response.status !== 200);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'response has content': (r) => r.body.length > 0,
  });
  
  return response;
}

// Gera dados realísticos para processar
function generateProcessData() {
  const datasets = [
    ['usuario-1', 'dados-iniciais', 'processamento-lote'],
    ['config-sistema', 'parametros', 'validacao'],
    ['transacao-001', 'dados-financeiros'],
    ['log-aplicacao', 'timestamp', 'nivel-debug'],
    ['request-api', 'payload', 'metadata'],
    ['dados-cliente-' + Math.floor(Math.random() * 1000)],
    ['sessao-' + Date.now()],
    ['evento-' + Math.random().toString(36).substring(7)]
  ];
  
  return datasets[Math.floor(Math.random() * datasets.length)];
}

export default function() {
  const patterns = getRequestPattern();
  const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
  
  switch(selectedPattern) {
    case 'home':
      makeRequest('/');
      break;
      
    case 'health_check':
      makeRequest('/health');
      break;
      
    case 'metrics':
      makeRequest('/metrics');
      break;
      
    case 'browse':
      // Simula navegação do usuário
      makeRequest('/');
      sleep(1 + Math.random() * 2);
      makeRequest('/health');
      break;
      
    case 'search':
      makeRequest('/?search=term');
      break;
      
    case 'api':
      makeRequest('/metrics');
      break;
      
    case 'process':
      // Requisição POST simples para processar dados
      const simpleData = generateProcessData();
      makePostRequest('/process', simpleData);
      break;
      
    case 'bulk_process':
      // Simula processamento em lote (múltiplas requisições)
      const bulkData = generateProcessData();
      makePostRequest('/process', bulkData);
      sleep(0.5);
      
      // Segunda requisição do lote
      const secondData = generateProcessData();
      makePostRequest('/process', secondData);
      break;
  }
  
  // Pausa variável entre requests (mais realístico)
  sleep(0.5 + Math.random() * 3);
}
