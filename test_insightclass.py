#!/usr/bin/env python3
"""
Smoke test para o backend do InsightClass.

O que ele faz:
1. Checa se a API está de pé.
2. Faz login com email/senha informados.
3. Testa o /auth/refresh (se existir).
4. Testa alguns endpoints autenticados básicos:
   - GET /api/v1/feedback/mine
   - GET /api/v1/admin/users (se o usuário for admin/gestor)
5. Imprime um relatório no final.

Uso:
    python test_insightclass.py --email admin@insightclass.dev --password MINHA_SENHA

Opções:
    --base-url: URL da API (default: http://localhost:8000)
"""

import argparse
import json
import sys
from typing import Optional

import requests


def print_title(text: str) -> None:
    print("\n" + "=" * 80)
    print(text)
    print("=" * 80)


def print_step(text: str) -> None:
    print(f"→ {text}")


def print_ok(text: str) -> None:
    print(f"  ✅ {text}")


def print_fail(text: str) -> None:
    print(f"  ❌ {text}")


def request_json(method: str, url: str, **kwargs) -> tuple[int, Optional[dict], Optional[str]]:
    try:
        resp = requests.request(method, url, timeout=10, **kwargs)
    except Exception as e:
        return 0, None, f"{type(e).__name__}: {e}"

    try:
        data = resp.json()
    except ValueError:
        data = None

    return resp.status_code, data, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test do backend InsightClass")
    parser.add_argument("--base-url", default="http://localhost:8000", help="URL base da API (default: http://localhost:8000)")
    parser.add_argument("--email", required=True, help="Email do usuário para login (ex: admin@insightclass.dev)")
    parser.add_argument("--password", required=True, help="Senha do usuário para login")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    login_url = f"{base}/api/v1/auth/login"
    refresh_url = f"{base}/api/v1/auth/refresh"
    feedback_mine_url = f"{base}/api/v1/feedback/mine"
    admin_users_url = f"{base}/api/v1/admin/users?limit=10"

    print_title("InsightClass – Smoke Test Backend")

    # 1. Health check simples (root ou /openapi.json)
    print_step("Verificando se a API está respondendo...")
    for path in ["/", "/openapi.json", "/docs"]:
        url = base + path
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code < 500:
                print_ok(f"API respondeu em {url} (status {resp.status_code})")
                break
        except Exception as e:
            continue
    else:
        print_fail("Nenhuma rota básica respondeu (/ , /openapi.json, /docs). Verifique se o Uvicorn está rodando.")
        return 1

    # 2. Login
    print_step(f"Realizando login em {login_url}...")
    status, data, err = request_json(
        "POST",
        login_url,
        json={"email": args.email, "password": args.password},
    )

    if err:
        print_fail(f"Falha ao chamar /auth/login: {err}")
        return 1

    if status != 200:
        print_fail(f"Login falhou (status {status}). Resposta: {data}")
        return 1

    access_token = data.get("access_token")
    refresh_token = data.get("refresh_token") or data.get("refresh")

    if not access_token:
        print_fail(f"/auth/login não retornou access_token. Payload: {data}")
        return 1

    print_ok("Login OK, access_token recebido.")
    if refresh_token:
        print_ok("refresh_token também recebido.")

    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Teste de refresh (se refresh_token existir)
    if refresh_token:
        print_step(f"Testando /auth/refresh em {refresh_url}...")
        status, data, err = request_json(
            "POST",
            refresh_url,
            json={"refresh_token": refresh_token},
        )
        if err:
            print_fail(f"Erro ao chamar /auth/refresh: {err}")
        elif status != 200:
            print_fail(f"/auth/refresh retornou status {status}. Resposta: {data}")
        else:
            new_access = data.get("access_token") or data.get("access")
            if new_access:
                print_ok("Refresh OK, novo access_token recebido.")
                headers["Authorization"] = f"Bearer {new_access}"
            else:
                print_fail("Resposta de /auth/refresh não contém novo access_token.")

    # 4. GET /api/v1/feedback/mine
    print_step(f"Testando endpoint autenticado: {feedback_mine_url}...")
    status, data, err = request_json("GET", feedback_mine_url, headers=headers)
    if err:
        print_fail(f"Erro ao chamar /feedback/mine: {err}")
    elif status != 200:
        print_fail(f"/feedback/mine retornou status {status}. Resposta: {data}")
    else:
        count = len(data) if isinstance(data, list) else "desconhecido"
        print_ok(f"/feedback/mine OK. Itens retornados: {count}")

    # 5. GET /api/v1/admin/users (testa permissão de admin/gestor)
    print_step(f"Testando endpoint administrativo: {admin_users_url}...")
    status, data, err = request_json("GET", admin_users_url, headers=headers)
    if err:
        print_fail(f"Erro ao chamar /admin/users: {err}")
    elif status == 403:
        print_ok("Acesso negado a /admin/users (403) — provável usuário sem papel admin/gestor. Comportamento esperado.")
    elif status != 200:
        print_fail(f"/admin/users retornou status {status}. Resposta: {data}")
    else:
        if isinstance(data, dict) and "items" in data:
            count = len(data["items"])
        elif isinstance(data, list):
            count = len(data)
        else:
            count = "desconhecido"
        print_ok(f"/admin/users OK. Usuários retornados: {count}")

    print_title("Smoke test concluído")
    print("Se todos os passos acima tiveram ✅, o backend está minimamente saudável para testes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())