# SAP TRM Solution

This repository contains a consolidated workspace for the SAP Treasury and Risk Management (TRM) Assistant.

## Project Structure

- **reactapp/**: Frontend React application.
- **java_rag/**: Backend Python API with RAG (Retrieval-Augmented Generation) capabilities.

## Setup Instructions

### Backend (java_rag)
1. Navigate to `java_rag/`.
2. Create a virtual environment: `python -m venv venv`.
3. Activate the environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`.
5. Set up your `.env` file with necessary API keys (Groq, Gemini, etc.).

### Frontend (reactapp)
1. Navigate to `reactapp/`.
2. Install dependencies: `npm install`.
3. Start the development server: `npm start`.

## Recent Cleanup
The codebase has been cleaned of all comments and documentation strings as per project requirements.
