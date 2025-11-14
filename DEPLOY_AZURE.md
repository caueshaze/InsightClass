# Deploy InsightClass \u2013 Azure (Backend)

## Comando de start em produ��o

O backend FastAPI deve ser iniciado em produção com:

```bash
gunicorn -k uvicorn.workers.UvicornWorker backend.app.main:app --bind 0.0.0.0:8000 --workers 2