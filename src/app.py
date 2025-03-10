import os
import time
import random
import requests
from fastapi import FastAPI, Response, status, Request
from typing import List

# Importações do OpenTelemetry
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from prometheus_client import start_http_server

from typing import Iterable
from opentelemetry.metrics import CallbackOptions, Observation

import psutil

# Depois, para acessar:
process = psutil.Process()

# ================================
#  CONFIGURAÇÃO DA APLICAÇÃO
# ================================

APP_NAME = os.getenv("APP_NAME", "app-a")
APP_URL_DESTINO = os.getenv("APP_URL_DESTINO", "")

# Simulação de problemas
APP_ERRORS = int(os.getenv("APP_ERRORS", "0"))  # Porcentagem de erro (0 a 100)
APP_LATENCY = int(os.getenv("APP_LATENCY", "0"))  # Tempo máximo de atraso (em ms)

# ================================
#  CONFIGURAÇÃO DO OPENTELEMETRY
# ================================

# Inicializa o servidor Prometheus na porta 8080 (pode ser alterado)
start_http_server(port=8080)

# Configura o leitor de métricas do Prometheus
prometheus_reader = PrometheusMetricReader()

# Configura o provedor de métricas com o leitor do Prometheus
metrics.set_meter_provider(
    MeterProvider(
        metric_readers=[prometheus_reader]
    )
)

# Cria um medidor (meter) para contabilizar as métricas
meter = metrics.get_meter(APP_NAME)

# Cria um contador para as requisições
requests_counter = meter.create_counter(
    name="app_requests_total",
    description="Número total de requisições processadas",
    unit="1"
)

# Callback para o contador aleatório
def get_random_value(options: CallbackOptions) -> Iterable[Observation]:
    random_value = random.randint(1, 100)
    yield Observation(
            random_value, {"service": APP_NAME}
        )

random_counter = meter.create_observable_counter(
    "app_random_value",
    description="Contador com valores aleatórios para demonstração",
    callbacks=[get_random_value]
)

# Cria um gauge para as requisições ativas
active_requests_gauge = meter.create_gauge(
    name="app_gauge_example",
    description="Número de requisições atualmente em processamento",
)

# Exemplo de como seria (não implementar ainda)
def get_memory_usage(options):
    # Lógica para obter uso de memória
    memory_usage = process.memory_info().rss / 1024 / 1024  # MB
    yield Observation(memory_usage, {"service": APP_NAME})

memory_gauge = meter.create_observable_gauge(
    name="app_memory_usage_mb",
    description="Uso de memória da aplicação em MB",
    callbacks=[get_memory_usage]
)

response_time_histogram = meter.create_histogram(
    name="app_response_time_seconds",
    description="Tempo de resposta das requisições em segundos",
    unit="s",
    explicit_bucket_boundaries_advisory=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5]
)

# ================================
#  INICIALIZAÇÃO DA APLICAÇÃO
# ================================

app = FastAPI()

@app.get("/")
def read_root(response: Response, request: Request):

    start_time = time.time()

    try:
        # Incrementa o contador para o endpoint "/"
        requests_counter.add(1, {"service": APP_NAME, "endpoint": "/"})
        active_requests_gauge.set(random.randint(1, 100), {"service": APP_NAME})
        return {"message": f"Esse é o serviço {APP_NAME}"}
    finally:
        # Calcula e registra o tempo de resposta
        elapsed_time = time.time() - start_time
        response_time_histogram.record(
            elapsed_time,
            {"service": APP_NAME, "endpoint": "/"}
        )

@app.post("/process")
def process_request(payload: List[str], response: Response, request: Request):
    """
    Endpoint que processa um payload, simula falhas e latência variável,
    e propaga a requisição para outros serviços.
    """

    start_time = time.time()

    try:

        # Incrementa o contador para o endpoint "/process"
        requests_counter.add(1, {"service": APP_NAME, "endpoint": "/process"})

        active_requests_gauge.set(random.randint(1, 100), {"service": APP_NAME})

        original_payload = payload.copy()
        original_payload.append(APP_NAME)

        # Simulação de latência variável
        if APP_LATENCY > 0:
            simulated_latency = random.randint(0, APP_LATENCY)  # Define um atraso aleatório entre 0 e APP_LATENCY
            time.sleep(simulated_latency / 1000)  # Converte ms para segundos

        # Simulação de erro com base na porcentagem definida
        if random.randint(1, 100) <= APP_ERRORS:
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            error_msg = f"Erro simulado em {APP_NAME}"
            return {"error": error_msg}

        # Se houver serviços de destino, propaga a requisição
        if APP_URL_DESTINO:
            urls = APP_URL_DESTINO.split(',')
            for url in urls:
                try:
                    resp = requests.post(
                        f"{url}/process",
                        json=original_payload,
                        timeout=5
                    )

                    if resp.status_code == 200:
                        original_payload = resp.json()
                    else:
                        response.status_code = status.HTTP_502_BAD_GATEWAY
                        return {"error": f"Erro ao enviar para {url}: {resp.status_code}"}

                except requests.RequestException as e:
                    response.status_code = status.HTTP_400_BAD_REQUEST
                    return {"error": f"Falha na requisição para {url}: {str(e)}"}

        return original_payload

    finally:
        # Calcula e registra o tempo de resposta
        elapsed_time = time.time() - start_time
        response_time_histogram.record(
            elapsed_time,
            {"service": APP_NAME, "endpoint": "/process"}
        )