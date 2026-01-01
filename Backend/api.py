from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, EmailStr
import bcrypt
# Model imports moved to lazy loading helper
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
from PyPDF2 import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import psycopg2
from qa_gemini import answer_question
from psycopg2.pool import SimpleConnectionPool
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PG_CONN_STR = os.getenv("PG_CONN_STR", "postgresql://murex:murex@127.0.0.1:5433/murexdb")

# Initialize connection pool for better performance and stability
try:
    db_pool = SimpleConnectionPool(minconn=1, maxconn=20, dsn=PG_CONN_STR)
except Exception as e:
    logger.error(f"Failed to initialize DB pool: {e}")
    db_pool = None

app = FastAPI()

# Global for lazy loading
_retriever = None
_answer_question = None

def get_retriever():
    global _retriever
    if _retriever is None:
        from qa_gemini import retriever
        _retriever = retriever
    return _retriever

def get_answer_question():
    global _answer_question
    if _answer_question is None:
        from qa_gemini import answer_question
        _answer_question = answer_question
    return _answer_question

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PG_CONN_STR = os.getenv("PG_CONN_STR", "postgresql://murex:murex@127.0.0.1:5433/murexdb")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Murex TRM Backend"}

class Query(BaseModel):
    query: str
    conversation_history: list = []
    conversation_id: str = "default"
    user_id: int = None  # Added for chat history persistence

class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str = None

class UserLogin(BaseModel):
    username_or_email: str
    password: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

@app.post("/signup")
def signup(user: UserSignup):
    try:
        conn = psycopg2.connect(PG_CONN_STR, connect_timeout=5)
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (user.username, user.email))
        if cur.fetchone():
            cur.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Username or email already registered")
        
        hashed_pw = hash_password(user.password)
        cur.execute(
            "INSERT INTO users (username, email, password_hash, full_name) VALUES (%s, %s, %s, %s) RETURNING id",
            (user.username, user.email, hashed_pw, user.full_name)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return {"success": True, "message": "User registered successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
def login(credentials: UserLogin):
    try:
        conn = psycopg2.connect(PG_CONN_STR, connect_timeout=5)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, username, email, password_hash, full_name FROM users WHERE username = %s OR email = %s",
            (credentials.username_or_email, credentials.username_or_email)
        )
        user_row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user_row:
            raise HTTPException(status_code=401, detail="Invalid username/email or password")
            
        is_valid = verify_password(credentials.password, user_row[3])
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid username/email or password")
        
        return {
            "success": True, 
            "message": "Login successful",
            "user": {
                "id": user_row[0],
                "username": user_row[1],
                "email": user_row[2],
                "full_name": user_row[4]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
def ask(q: Query):
    conn = None
    try:
        # Use connection pool
        if db_pool:
            conn = db_pool.getconn()
        else:
            conn = psycopg2.connect(PG_CONN_STR)
        
        cur = conn.cursor()

        # STEP 1: If frontend history is missing/short, enrich it from the database
        # This ensures persistence across sessions (logout/login)
        enriched_history = q.conversation_history or []
        if len(enriched_history) < 5 and q.conversation_id and q.user_id:
            try:
                cur.execute("""
                    SELECT role, content FROM chat_history 
                    WHERE conversation_id = %s AND user_id = %s
                    ORDER BY id ASC
                    LIMIT 20
                """, (q.conversation_id, q.user_id))
                db_history = cur.fetchall()
                if db_history:
                    # Merge history, avoiding duplicates by matching content
                    seen_content = {msg.get('content') for msg in enriched_history}
                    for role, content in db_history:
                        if content not in seen_content:
                            enriched_history.append({"role": role, "content": content})
                    # Re-sort or trust prompt ordering
            except Exception as e:
                logger.error(f"Error enriching history: {e}")

        # Lazy load retriever and run RAG logic
        retriever_obj = get_retriever()
        result = answer_question(q.query, enriched_history)
        
        # STEP 2: Save the new exchange to DB
        if q.user_id:
            try:
                # Save user message using clock_timestamp() for precise ordering
                cur.execute(
                    "INSERT INTO chat_history (conversation_id, user_id, role, content, created_at) VALUES (%s, %s, %s, %s, clock_timestamp())",
                    (q.conversation_id, q.user_id, "user", q.query)
                )
                
                # Save assistant response using clock_timestamp() for precise ordering
                cur.execute(
                    "INSERT INTO chat_history (conversation_id, user_id, role, content, created_at) VALUES (%s, %s, %s, %s, clock_timestamp())",
                    (q.conversation_id, q.user_id, "assistant", result.get("answer"))
                )
                conn.commit()
            except Exception as db_e:
                logger.error(f"DATABASE ERROR during history save: {db_e}")
        
        cur.close()
        return result
    except Exception as e:
        logger.error(f"Ask error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn and db_pool:
            db_pool.putconn(conn)
        elif conn:
            conn.close()

# Chat Management Endpoints for User-Specific Chat History

class ChatMessage(BaseModel):
    sender: str
    text: str

class ChatData(BaseModel):
    id: str
    title: str = ""
    messages: list[dict] = []  # Changed from list to list[dict] to accept message objects
    timestamp: str = ""
    user_id: int

@app.get("/chats")
def get_user_chats(user_id: int):
    """Get all chats for a specific user"""
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        
        # Get distinct conversation IDs for this user
        cur.execute("""
            SELECT DISTINCT conversation_id, MIN(created_at) as first_message_time
            FROM chat_history 
            WHERE user_id = %s 
            GROUP BY conversation_id
            ORDER BY first_message_time DESC
        """, (user_id,))
        
        conversations = cur.fetchall()
        chats = []
        
        for conv_id, _ in conversations:
            # Get all messages for this conversation, ordered by id to ensure correct sequence
            cur.execute("""
                SELECT role, content, created_at 
                FROM chat_history 
                WHERE conversation_id = %s AND user_id = %s
                ORDER BY id ASC
            """, (conv_id, user_id))
            
            messages_raw = cur.fetchall()
            messages = [{"sender": role, "text": content} for role, content, _ in messages_raw]
            
            # Use first user message as title
            title = messages[0]["text"][:30] if messages else "New Chat"
            timestamp = messages_raw[0][2].isoformat() if messages_raw else ""
            
            chats.append({
                "id": conv_id,
                "title": title,
                "messages": messages,
                "timestamp": timestamp
            })
        
        cur.close()
        conn.close()
        return {"chats": chats}
    except Exception as e:
        print(f"Error fetching chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chats")
def save_chat(chat: ChatData):
    """Save or update a chat for a user"""
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        
        # Delete existing messages for this conversation
        cur.execute("DELETE FROM chat_history WHERE conversation_id = %s AND user_id = %s", 
                   (chat.id, chat.user_id))
        
        # Insert all messages
        for msg in chat.messages:
            # Handle both dict and object formats
            if isinstance(msg, dict):
                sender = msg.get('sender', 'user')
                text = msg.get('text', '')
            else:
                sender = getattr(msg, 'sender', 'user')
                text = getattr(msg, 'text', '')
            
            cur.execute("""
                INSERT INTO chat_history (conversation_id, user_id, role, content, created_at)
                VALUES (%s, %s, %s, %s, clock_timestamp())
            """, (chat.id, chat.user_id, sender, text))
        
        conn.commit()
        cur.close()
        conn.close()
        return {"success": True, "message": "Chat saved"}
    except Exception as e:
        print(f"Error saving chat: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, user_id: int):
    """Permanently delete a chat from the database"""
    try:
        conn = psycopg2.connect(PG_CONN_STR)
        cur = conn.cursor()
        
        # Delete all messages for this conversation and user
        cur.execute("DELETE FROM chat_history WHERE conversation_id = %s AND user_id = %s", 
                   (chat_id, user_id))
        
        deleted_count = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        
        return {"success": True, "message": f"Chat deleted ({deleted_count} messages removed)"}
    except Exception as e:
        print(f"Error deleting chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
def test():
    return {"status": "ok", "message": "API is working"}

def sanitize_text(text: str) -> str:
    """Remove NUL characters (0x00) which are not supported by PostgreSQL TEXT columns."""
    if not text:
        return ""
    return text.replace('\x00', '')

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
        page_text = p.extract_text() or ""
        pages.append(sanitize_text(page_text))
    return "\n\n".join(pages)

def extract_txt_text(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    return sanitize_text(text)

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
                    sanitize_text(chunk),
                    emb.tolist()
                )
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        get_retriever().reload()
        
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

# Old non-user-specific endpoints removed - use /chats endpoints instead
# All chat operations now require user_id for proper data isolation
