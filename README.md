
# InsightClass — Análise de Sentimento de Feedback Escolar

![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-green)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Visão Geral

O **InsightClass** é uma plataforma que transforma feedbacks textuais de alunos, professores e gestores em **análises de sentimento** e **resumos empáticos automáticos**, oferecendo uma visão clara e humanizada sobre o ambiente escolar.

Desenvolvido com **FastAPI**, **React**, **Transformers ONNX** e o modelo **Gemma 2B IT**, o projeto combina **Machine Learning**, **Processamento de Linguagem Natural (PLN)** e **design empático** para apoiar decisões pedagógicas com base em dados reais e claro, linguagem humana.

Este projeto foi concebido com foco em uma aplicação prática universitária, integrando conceitos essenciais de **Processamento de Linguagem Natural (PLN)**, **Machine Learning** e **Desenvolvimento Web**.

## Objetivos

-   Classificar automaticamente feedbacks como **positivos**, **neutros** ou **negativos**.
    
-   Gerar **resumos personalizados** (via LLM) para alunos, professores e gestores.
    
-   Fornecer uma **visualização interativa** dos sentimentos e tendências no dashboard React.
    
-   Reduzir o tempo de análise de relatórios manuais e tornar o acompanhamento educacional mais humano e rápido.


##  Tecnologias Utilizadas

###  Backend (API)

-   **Python 3.12+**
    
-   **FastAPI** — Estrutura assíncrona de alta performance.
    
-   **ONNXRuntime** — Execução do modelo BERT para classificação local.
    
-   **Transformers (Hugging Face)** — Tokenização e compatibilidade com modelos.
    
-   **Gemma 2B IT (Google)** — Geração de resumos empáticos.
    
-   **SQLite / SQLAlchemy** — Banco de dados leve e integrado.
    
-   **Pydantic v2 + pydantic-settings** — Validação e configuração baseada em `.env`.
    

### Frontend (Interface)

-   **React 18 + Vite** — Interface modular e reativa.
    
-   **TailwindCSS** — Estilização limpa e responsiva.
    
-   **Shadcn/UI + Lucide Icons** — Componentes e ícones modernos.
    
-   **Axios / Fetch API** — Comunicação com o backend.
    

### Infraestrutura e Dev

-   **Uvicorn** — Servidor ASGI de desenvolvimento.
    
-   **GitHub + GitIgnore otimizado** — Controle de versão seguro.
    
-   **Virtual Env + npm** — Isolamento total entre ambientes.

## Estrutura do Projeto

```
InsightClass/
├── backend/
│   ├── app/
│   │   ├── api/                 # Rotas FastAPI (auth, feedback, resumo, admin)
│   │   ├── core/                # Config, LLM, Sentiment Analyzer
│   │   ├── models/              # ORM + Esquemas Pydantic
│   │   └── main.py              # Factory da aplicação FastAPI
│   └── requirements.txt
│
├── models/
│   ├── bert/                    # Modelo de sentimento (ONNX + tokenizer)
│   └── gemma/                   # Modelo de resumo empático (LLM)
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # Páginas (Gestor, Professor, Aluno)
│   │   ├── components/          # Componentes reutilizáveis (modulares)
│   │   └── hooks/               # Hooks de API e estado
│   └── package.json
│
├── .env.example
├── .gitignore
└── README.md
```

## Como Rodar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU-USUARIO/InsightClass.git
cd InsightClass
```

### 2. Criar ambiente virtual e instalar dependências
```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Baixar os modelos

#### Modelo utilizado

O modelo de classificação inicial é baseado no [**bertimbau-onnx-pipeline**](https://github.com/caueshaze/bertimbau-onnx-pipeline) um projeto complementar desenvolvido por mim para:
-   Treinar o modelo BERTimbau em datasets rotulados de feedback educacional.
    
-   Exportar o modelo para **ONNX Runtime**, otimizando inferência em CPU.
    
-   Gerar os artefatos (`model.onnx` e `tokenizer/`) consumidos pelo InsightClass.
    
> O repositório de treinamento inclui scripts de conversão, avaliação e validação cruzada — além de suporte a exportação com `onnxruntime-tools`

Já o modelo de sumário pode ser encontrado em https://huggingface.co/google/gemma-2b-it

```bash
Coloque seus modelos na pasta `models/`
models/bert/model.onnx
models/bert/tokenizer/
models/gemma-2b-it
```

### 4. Rodar a API
```bash
uvicorn src/api/serve:app --host 0.0.0.0 --port 8000 --reload
```
A API estará disponível em: [http://localhost:8000/docs](http://localhost:8000/docs)

## Como Rodar o Frontend
```bash
cd frontend
npm install
npm run dev
```
O site estará disponível em: [http://localhost:5173/](http://localhost:5173/)

## Pipeline Inteligente

### Etapa 1 — Classificação (BERT ONNX)

Cada feedback é tokenizado e passado por um modelo ONNX compatível com BERT, retornando:

-   **positivo**
    
-   **neutro**
    
-   **negativo**
    

Se o modelo não estiver disponível, o sistema recorre a uma heurística linguística leve.

###  Etapa 2 — Síntese Empática (LLM Gemma 2B IT)

Com base nos feedbacks e no papel (aluno, professor, gestor), o modelo gera uma **mensagem personalizada e humana**, simulando uma mentora chamada _Maya_:

> “Olá Jorge, aprender é um processo que exige esforço e dedicação...”

O texto é pós-processado para remover termos proibidos e manter o tom acolhedor e natural.

##  Painel do Gestor

A página do gestor (em React) exibe:

-   Indicadores agregados de sentimento.
    
-   Últimos feedbacks de cada turma.
    
-   Mensagens geradas pelo LLM.
    
-   Filtros por escola, disciplina e período.

##
## ⚠️ Avisos

-   **Privacidade:** dados e feedbacks devem ser anonimizados.
    
-   **Modelos:** não envie arquivos `.onnx`, `.bin` ou `.pt` ao GitHub (veja `.gitignore`).
    
-   **Uso Educacional:** protótipo acadêmico, não pronto para produção.