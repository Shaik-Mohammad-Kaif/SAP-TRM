import os
import psycopg2
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

PG_CONN_STR = os.getenv("PG_CONN_STR", "postgresql://murex:murex@127.0.0.1:5433/murexdb")
EMBED_MODEL_NAME = "BAAI/bge-large-en-v1.5"
EMBEDDING_DIM = 1024

class Retriever:
    def __init__(self):
        print(f"Loading embedding model: {EMBED_MODEL_NAME}...")
        self.model = SentenceTransformer(EMBED_MODEL_NAME)
        self.conn_str = PG_CONN_STR

    def query(self, query: str, top_k: int = 5):
        query_text = f"Represent this query: {query}"
        query_embedding = self.model.encode(
            query_text,
            convert_to_numpy=True,
            normalize_embeddings=True
        ).tolist()

        conn = psycopg2.connect(self.conn_str)
        cur = conn.cursor()

        cur.execute("""
            SELECT doc_name, chunk_id, chunk_text, 
                   1 - (embedding <=> %s::vector) as similarity
            FROM doc_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding, query_embedding, top_k))

        rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for row in rows:
            results.append({
                "doc_name": row[0],
                "chunk_id": row[1],
                "text": row[2],
                "score": float(1.0 - row[3]), 
                "metadata": {"doc_name": row[0], "chunk_id": row[1]}
            })

        return results

    def reload(self):
        pass

if __name__ == "__main__":
    retriever = Retriever()
    results = retriever.query("What is FX settlement risk?", top_k=3)

    for r in results:
        print(f"Distance: {r['score']:.4f}")
        print(f"Text: {r['text'][:200]}...")
        print("-" * 60)
