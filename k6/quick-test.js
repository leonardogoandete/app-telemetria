import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://192.168.0.100:30080';

export let options = {
  vus: 20,
  duration: '30s',
};

export default function() {
  // Teste GET na home
  let getResponse = http.get(`${BASE_URL}/`);
  check(getResponse, {
    'GET / status is 200': (r) => r.status === 200,
  });
  
  // Teste POST no endpoint /process
  const testData = ['dado-inicial'];
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  let postResponse = http.post(`${BASE_URL}/process`, JSON.stringify(testData), params);
  
  check(postResponse, {
    'POST /process status is 200': (r) => r.status === 200,
    'POST /process response time < 1000ms': (r) => r.timings.duration < 1000,
    'POST /process has response body': (r) => r.body && r.body.length > 0,
  });
  
  console.log(`GET Response: ${getResponse.status}, POST Response: ${postResponse.status}`);
  console.log(`POST Body: ${postResponse.body.substring(0, 100)}...`);
}
