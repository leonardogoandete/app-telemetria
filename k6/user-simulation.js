import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas customizadas
export let errorRate = new Rate('errors');

// Configuração dos estágios de carga
export let options = {
  stages: [
    // Simulação de um dia completo (24 horas em ~24 minutos)
    // Madrugada (baixa carga)
    { duration: '2m', target: 2 },   // 00:00-02:00 - Poucos usuários
    { duration: '2m', target: 1 },   // 02:00-04:00 - Muito baixo
    { duration: '2m', target: 3 },   // 04:00-06:00 - Começa a subir
    
    // Manhã (carga crescente)
    { duration: '2m', target: 10 },  // 06:00-08:00 - Início do expediente
    { duration: '2m', target: 25 },  // 08:00-10:00 - Horário comercial
    { duration: '2m', target: 35 },  // 10:00-12:00 - Pico da manhã
    
    // Almoço (carga reduzida)
    { duration: '2m', target: 20 },  // 12:00-14:00 - Horário de almoço
    
    // Tarde (pico de carga)
    { duration: '2m', target: 40 },  // 14:00-16:00 - Pico da tarde
    { duration: '2m', target: 45 },  // 16:00-18:00 - Maior pico
    
    // Noite (carga decrescente)
    { duration: '2m', target: 25 },  // 18:00-20:00 - Fim do expediente
    { duration: '2m', target: 10 },  // 20:00-22:00 - Noite
    { duration: '2m', target: 5 },   // 22:00-24:00 - Madrugada
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requests < 500ms
    http_req_failed: ['rate<0.1'],    // Taxa de erro < 10%
  },
};

// URL da aplicação
const BASE_URL = 'http://192.168.0.100:30080';

// Simulação de diferentes tipos de usuários
const USER_SCENARIOS = [
  {
    name: 'normal_user',
    weight: 70,
    actions: ['visit_home', 'browse']
  },
  {
    name: 'power_user',
    weight: 20,
    actions: ['visit_home', 'browse', 'search', 'api_call']
  },
  {
    name: 'bot_user',
    weight: 10,
    actions: ['api_call', 'health_check']
  }
];

function selectUserType() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (let scenario of USER_SCENARIOS) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      return scenario;
    }
  }
  return USER_SCENARIOS[0];
}

function visitHome() {
  let response = http.get(BASE_URL);
  check(response, {
    'home page status is 200': (r) => r.status === 200,
    'home page loads in <200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(response.status !== 200);
  return response;
}

function browse() {
  // Simula navegação em diferentes endpoints
  const endpoints = ['/', '/health', '/metrics'];
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  let response = http.get(`${BASE_URL}${endpoint}`);
  check(response, {
    'browse status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  return response;
}

function search() {
  // Simula uma busca (pode ser um endpoint fictício)
  let response = http.get(`${BASE_URL}/?q=search_term`);
  check(response, {
    'search status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  return response;
}

function apiCall() {
  // Simula chamadas para métricas (como um monitoramento)
  let response = http.get(`${BASE_URL}/metrics`);
  check(response, {
    'API call status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  return response;
}

function healthCheck() {
  let response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
  });
  errorRate.add(response.status !== 200);
  return response;
}

export default function() {
  // Seleciona tipo de usuário
  const userType = selectUserType();
  
  // Executa ações baseadas no tipo de usuário
  for (let action of userType.actions) {
    switch(action) {
      case 'visit_home':
        visitHome();
        break;
      case 'browse':
        browse();
        break;
      case 'search':
        search();
        break;
      case 'api_call':
        apiCall();
        break;
      case 'health_check':
        healthCheck();
        break;
    }
    
    // Pausa aleatória entre ações (1-5 segundos)
    sleep(Math.random() * 4 + 1);
  }
  
  // Pausa entre sessões de usuário
  sleep(Math.random() * 2 + 1);
}
