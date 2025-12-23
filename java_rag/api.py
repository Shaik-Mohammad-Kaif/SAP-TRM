from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from qa_gemini import answer_question, retriever
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import psycopg2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PG_CONN_STR = os.getenv("PG_CONN_STR", "postgresql://murex:murex@127.0.0.1:5433/murexdb")

class Query(BaseModel):
    query: str
    conversation_history: list = []
    conversation_id: str = "default"

@app.post("/ask")
def ask(q: Query):
    try:
        result = answer_question(q.query, q.conversation_history)
        
        try:
            print(f"DEBUG: Attempting to save history for conv_id: {q.conversation_id}")
            conn = psycopg2.connect(PG_CONN_STR)
            cur = conn.cursor()
            
            cur.execute(
                "INSERT INTO chat_history (conversation_id, role, content) VALUES (%s, %s, %s)",
                (q.conversation_id, "user", q.query)
            )
            
            cur.execute(
                """INSERT INTO chat_history 
                   (conversation_id, role, content, is_runbook, runbook_type, sources) 
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (q.conversation_id, "assistant", result.get("answer"), 
                 result.get("is_runbook", False), result.get("runbook_type"), 
                 result.get("sources", []))
            )
            
            conn.commit()
            print(f"DEBUG: Successfully saved history for {q.conversation_id}")
            cur.close()
            conn.close()
        except Exception as db_e:
            print(f"❌ DATABASE ERROR during history save: {db_e}")
            import traceback
            traceback.print_exc()

        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
def test():
    return {"status": "ok", "message": "API is working"}

@app.get("/runbooks")
def list_runbooks():
    runbooks = [
        {
            "id": "operational_procedures",
            "name": "SAP TRM Operational Procedures",
            "description": "Daily transaction management, cash & liquidity, risk monitoring, month-end procedures",
            "keywords": ["transaction", "settlement", "cash position", "liquidity", "month-end"]
        },
        {
            "id": "incident_response",
            "name": "SAP TRM Incident Response",
            "description": "Critical incidents, emergencies, system outages, breach response procedures",
            "keywords": ["incident", "emergency", "liquidity shortfall", "unauthorized payment", "outage"]
        },
        {
            "id": "system_administration",
            "name": "SAP TRM System Administration",
            "description": "Configuration, troubleshooting, account determination, performance optimization",
            "keywords": ["configuration", "troubleshoot", "account determination", "posting failure", "error"]
        }
    ]
    return {"runbooks": runbooks}

def extract_pdf_text(path):
    reader = PdfReader(path)
    pages = []
    for p in reader.pages:
        pages.append(p.extract_text() or "")
    return "\n\n".join(pages)

def extract_txt_text(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def chunk_text(text, doc_name):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=200
    )
    chunks = splitter.split_text(text)
    
    documents = []
    for i, chunk in enumerate(chunks):
        doc = Document(
            page_content=chunk,
            metadata={
                "doc_name": doc_name,
                "chunk_id": i,
                "source": "user_upload"
            }
        )
        documents.append(doc)
    
    return documents

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files allowed")
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        if file_ext == ".pdf":
            text = extract_pdf_text(tmp_path)
        else:
            text = extract_txt_text(tmp_path)
        
        os.unlink(tmp_path)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text")
        
        doc_name = os.path.splitext(file.filename)[0]
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        chunks = splitter.split_text(text)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No content chunks created")
        
        from sentence_transformers import SentenceTransformer
        embed_model = SentenceTransformer("BAAI/bge-large-en-v1.5")
        
        texts_with_prefix = [f"Represent this document: {chunk}" for chunk in chunks]
        embeddings = embed_model.encode(
            texts_with_prefix, 
            batch_size=32, 
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        
        cur.execute("DELETE FROM doc_chunks WHERE doc_name = %s", (doc_name,))
        print(f"DEBUG: Cleared existing chunks for {doc_name} if any existed.")
        
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            cur.execute(
                """
                INSERT INTO doc_chunks (doc_name, chunk_id, chunk_text, embedding)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    doc_name,
                    i,
                    chunk,
                    emb.tolist()
                )
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        retriever.reload()
        
        return {
            "success": True,
            "message": f"Document uploaded successfully!",
            "chunks_created": len(chunks),
            "document_name": doc_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
def list_documents():
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        
        documents = []
        
        try:
            cur.execute("""
                SELECT DISTINCT doc_name, COUNT(*) as chunks 
                FROM doc_chunks 
                GROUP BY doc_name
            """)
            old_docs = cur.fetchall()
            documents.extend([{"name": r[0], "chunks": r[1]} for r in old_docs])
        except Exception:
            pass
        
        try:
            cur.execute("""
                SELECT 
                    e.cmetadata->>'doc_name' as doc_name,
                    COUNT(*) as chunks
                FROM langchain_pg_embedding e
                JOIN langchain_pg_collection c ON e.collection_id = c.uuid
                WHERE c.name = 'doc_chunks'
                AND e.cmetadata->>'doc_name' IS NOT NULL
                GROUP BY e.cmetadata->>'doc_name'
            """)
            new_docs = cur.fetchall()
            documents.extend([{"name": r[0], "chunks": r[1]} for r in new_docs])
        except Exception:
            pass
        
        cur.close()
        conn.close()
        
        return {"documents": documents}
    except Exception as e:
        return {"documents": [], "error": str(e)}

@app.get("/documents/{doc_name}")
def get_document_content(doc_name: str):
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        
        chunks = []
        
        try:
            cur.execute("""
                SELECT chunk_id, chunk_text 
                FROM doc_chunks 
                WHERE doc_name = %s 
                ORDER BY chunk_id
            """, (doc_name,))
            old_chunks = cur.fetchall()
            if old_chunks:
                chunks = [{"id": r[0], "text": r[1]} for r in old_chunks]
        except Exception:
            pass
        
        if not chunks:
            try:
                cur.execute("""
                    SELECT 
                        (e.cmetadata->>'chunk_id')::int as chunk_id,
                        e.document as chunk_text
                    FROM langchain_pg_embedding e
                    JOIN langchain_pg_collection c ON e.collection_id = c.uuid
                    WHERE c.name = 'doc_chunks'
                    AND e.cmetadata->>'doc_name' = %s
                    ORDER BY (e.cmetadata->>'chunk_id')::int
                """, (doc_name,))
                new_chunks = cur.fetchall()
                if new_chunks:
                    chunks = [{"id": r[0], "text": r[1]} for r in new_chunks]
            except Exception:
                pass
        
        cur.close()
        conn.close()
        
        if not chunks:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "name": doc_name,
            "chunks": chunks
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history/list")
def get_history_list():
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        cur.execute("""
            SELECT conversation_id, 
                   (array_agg(content ORDER BY id ASC))[1] as title,
                   MAX(timestamp) as last_active
            FROM chat_history 
            WHERE role = 'user'
            GROUP BY conversation_id
            ORDER BY last_active DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        history = []
        for r in rows:
            history.append({
                "id": r[0],
                "title": r[1][:40] + "..." if r[1] and len(r[1]) > 40 else (r[1] or "New Chat"),
                "preview": r[1][:100] + "..." if r[1] and len(r[1]) > 100 else (r[1] or ""),
                "timestamp": r[2].isoformat() if r[2] else None
            })
        return {"history": history}
    except Exception as e:
        print(f"History list error: {e}")
        return {"history": []}

@app.get("/history/{conversation_id}")
def get_chat_history(conversation_id: str):
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        cur.execute("""
            SELECT role, content, is_runbook, runbook_type, sources 
            FROM chat_history 
            WHERE conversation_id = %s 
            ORDER BY id ASC
        """, (conversation_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        messages = []
        for r in rows:
            sender = "user" if r[0] == "user" else "system"
            msg = {
                "sender": sender, 
                "text": r[1]
            }
            if len(r) > 2 and r[2]:
                msg["is_runbook"] = r[2]
                msg["runbook_type"] = r[3] if len(r) > 3 else None
                msg["sources"] = r[4] if len(r) > 4 else []
            messages.append(msg)
        return {"messages": messages}
    except Exception as e:
        print(f"Chat history error: {e}")
        return {"messages": []}

@app.delete("/history/{conversation_id}")
def delete_chat_history(conversation_id: str):
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("DELETE FROM chat_history WHERE conversation_id = %s", (conversation_id,))
        cur.close()
        conn.close()
        return {"success": True, "message": "Conversation deleted"}
    except Exception as e:
        print(f"Chat deletion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
