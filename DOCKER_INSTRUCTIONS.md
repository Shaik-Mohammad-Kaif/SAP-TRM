# SAP TRM Assistant - Docker Setup Guide

This guide describes how to run the entire SAP TRM Assistant stack (Frontend, Backend, and Database) using Docker.

## Prerequisites
- **Docker Desktop** installed and running.
- A **Groq API Key**.

## 🚀 Quick Start

1. **Set your API Key**:
   Create a `.env` file in the root directory and add your key:
   ```env
   GROQ_API_KEY=your_actual_groq_key_here
   ```

2. **Launch the stack**:
   Open a terminal in the project root and run:
   ```bash
   docker compose up --build
   ```

3. **Access the Application**:
   - **Frontend**: `http://localhost`
   - **Backend API**: `http://localhost:8000`
   - **Database**: `localhost:5433`

## 🏗️ Architecture
- **db**: A PostgreSQL instance with `pgvector` for vector similarity search.
- **backend**: FastAPI service handling RAG, chat logic, and document processing.
- **frontend**: React application served via Nginx.

## 📁 Shared Volumes
The following directories are mapped as volumes so you can add documents or view logs without rebuilding:
- `./java_rag/runbooks`: Add your markdown runbooks here.
- `./java_rag/pdfs`: Add your PDF documents here.

## 🛑 Stopping
To stop and remove containers, run:
```bash
docker compose down
```
