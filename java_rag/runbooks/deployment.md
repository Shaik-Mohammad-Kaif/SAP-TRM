# Deployment Runbook (FX System)

## Prerequisites
- Docker Installed
- PostgreSQL 15+ (Port 5433 for Vector DB)
- Python 3.10+

## Steps to Deploy
1. **Start Database**
   ```bash
   docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=murex ankane/pgvector
   ```

2. **Run Backend**
   ```bash
   cd java_rag
   pip install -r requirements.txt
   uvicorn api:app --reload
   ```

3. **Run Frontend**
   ```bash
   cd reactapp
   npm install
   npm start
   ```

## Troubleshooting
- **Error 500**: Check `qa_gemini.py` logs.
- **DB Connection Fail**: Verify Port 5433 is open.
