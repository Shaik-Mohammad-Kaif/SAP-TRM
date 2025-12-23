import os
from dotenv import load_dotenv
from retriever import Retriever
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

retriever = Retriever()

def build_context(docs):
    ctx = ""
    for d in docs:
        ctx += f"\n\n--- Retrieved Chunk (score={d['score']:.3f}) ---\n{d['text']}"
    return ctx

def condense_query(chat_history, latest_query):
    if not chat_history:
        return latest_query

    history_str = ""
    for msg in chat_history[-4:]:
        role = "User" if msg['role'] == "user" else "Assistant"
        history_str += f"{role}: {msg['content']}\n"
    
    prompt = f"""Given the conversation, rephrase the Follow Up Input to be a standalone question. 
If the input is already standalone, return it unchanged.
Chat History:
{history_str}
Follow Up Input: {latest_query}
Standalone Question:"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Rephrase query to be standalone. output ONLY the question."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Condensation error: {e}")
        return latest_query

def classify_intent(query):
    query_lower = query.lower()
    
    request_verbs = ['show', 'get', 'give', 'list', 'display', 'format as', 'generate', 'provide', 'runbook for', 'procedure for', 'how to', 'steps for']
    
    sap_trm_keywords = {
        'operational_procedures': [
            'daily transaction', 'transaction management', 'deal capture', 'settlement',
            'cash position', 'liquidity management', 'month-end', 'master data',
            'business partner', 'product type', 'operational procedure', 'daily operation'
        ],
        'incident_response': [
            'incident', 'emergency', 'critical', 'liquidity shortfall', 'unauthorized payment',
            'system outage', 'breach', 'escalation', 'response procedure', 'crisis'
        ],
        'system_administration': [
            'configuration', 'account determination', 'troubleshoot', 'performance',
            'ot84', 'product configuration', 'system admin', 'technical issue',
            'posting failure', 'integration', 'fi integration', 'error', 'fix'
        ],
        'deployment': ['deploy', 'deployment', 'install'],
        'system_config': ['system config', 'configuration settings', 'setup'],
        'backup_recovery': ['backup', 'recovery', 'restore', 'disaster recovery']
    }
    
    is_explicit = any(word in query_lower for word in ['runbook', 'manual', 'documentation', 'formal procedure'])
    has_request_verb = any(verb in query_lower for verb in request_verbs)
    
    scores = {}
    for runbook_type, keywords in sap_trm_keywords.items():
        score = sum(1 for keyword in keywords if keyword in query_lower)
        if score > 0:
            scores[runbook_type] = score
    
    if is_explicit or (scores and has_request_verb):
        best_match = max(scores.items(), key=lambda x: x[1])[0] if scores else 'sap_trm_general'
        return 'RUNBOOK_REQUEST', best_match

    system_prompt = """You are a Technical Intent Classifier for SAP Treasury and Risk Management (TRM).
Analyze if the user wants a FORMAL PROCEDURE/RUNBOOK (steps, transaction codes, specific instructions) 
or just information/explanation about a concept.

If they want a formal procedure, output: INTENT: RUNBOOK_REQUEST | TYPE: <type>
Types: operational, incident, system_admin, general
If they just want an explanation or information, output: INTENT: GENERAL_QUERY

Examples:
- "What is the purpose of Portfolio Analyzer?" -> INTENT: GENERAL_QUERY
- "How do I settle a deal in SAP TRM?" -> INTENT: RUNBOOK_REQUEST | TYPE: operational
- "Explain FX risk" -> INTENT: GENERAL_QUERY
- "Give me the month end checklist" -> INTENT: RUNBOOK_REQUEST | TYPE: operational
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant", 
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.0,
            max_tokens=60
        )
        content = response.choices[0].message.content.strip()
        if "RUNBOOK_REQUEST" in content:
            type_match = "general"
            if "TYPE:" in content:
                type_match = content.split("TYPE:")[1].strip().lower()
            return 'RUNBOOK_REQUEST', type_match
        return 'GENERAL_QUERY', None
    except:
        return 'GENERAL_QUERY', None

def get_runbook(filename):
    base_path = os.path.join(os.getcwd(), "runbooks")
    
    filename_map = {
        'operational': '01_SAP_TRM_Operational_Procedures',
        'incident': '02_SAP_TRM_Incident_Response',
        'system_admin': '03_SAP_TRM_System_Administration_Troubleshooting',
        'deployment': 'deployment',
        'system_config': 'system_config',
        'backup_recovery': 'backup_recovery'
    }
    
    actual_filename = filename_map.get(filename, filename)
    
    file_path = os.path.join(base_path, actual_filename)
    
    if not os.path.abspath(file_path).startswith(base_path):
        return "Error: Access denied."
    
    if os.path.exists(file_path):
        with open(file_path, "r", encoding='utf-8') as f:
            return f.read()
    
    for ext in ['.md', '.txt', '.json', '.yaml', '.yml']:
        file_with_ext = os.path.join(base_path, actual_filename + ext)
        if os.path.exists(file_with_ext):
            with open(file_with_ext, "r", encoding='utf-8') as f:
                return f.read()
    
    for f in os.listdir(base_path):
        if actual_filename.lower() in f.lower() or f.lower() in actual_filename.lower():
             with open(os.path.join(base_path, f), "r", encoding='utf-8') as f_obj:
                return f_obj.read()
                
    return f"I couldn't find a runbook named '{filename}'. Available files: {', '.join(os.listdir(base_path))}"

def answer_question(query, conversation_history=None):
    confirmation_keywords = ['yes', 'confirm', 'get it', 'show me', 'please', 'go ahead', 'sure', 'ok', 'okay']
    is_simple_confirmation = any(keyword in query.lower() for keyword in confirmation_keywords) and len(query.split()) <= 5
    
    if is_simple_confirmation and conversation_history and len(conversation_history) > 0:
        last_message = conversation_history[-1].get('content', '') if conversation_history[-1].get('role') == 'assistant' else ''
        if 'Would you like me to retrieve' in last_message:
            runbook_reverse_map = {
                'Deployment Guide': 'deployment',
                'System Configuration Guide': 'system_config',
                'Backup & Recovery Guide': 'backup_recovery',
                'SAP TRM Operational Procedures': 'operational',
                'SAP TRM Incident Response': 'incident',
                'SAP TRM System Administration': 'system_admin'
            }
            for friendly, actual in runbook_reverse_map.items():
                if friendly in last_message:
                    content = get_runbook(actual)
                    formatted_content = f"# 📘 {friendly}\n\n---\n\n{content}\n\n---\n\n**Document Source**: `runbooks/{actual}.md`  \n**Retrieved**: {friendly} runbook from local system\n\n💡 **Tip**: You can ask me specific questions about any section of this runbook."
                    return {"answer": formatted_content, "sources": ["Local Runbook System"]}

    intent_type, runbook_hint = classify_intent(query)
    print(f"DEBUG: Intent detected: {intent_type} (Hint: {runbook_hint})")

    search_query = query
    if conversation_history:
        search_query = condense_query(conversation_history, query)
        print(f"DEBUG: Condensed '{query}' -> '{search_query}'")

    hits = retriever.query(search_query, top_k=10)
    print(f"DEBUG: Retrieval found {len(hits)} hits")
    
    if not hits:
        return {"answer": "I don't have enough documents in my knowledge base to answer this question.", "sources": []}

    context = build_context(hits)
    
    RUNBOOK_PROMPT = """You are a SAP TRM Expert. The user wants a FORMAL PROCEDURE or RUNBOOK section.
CRITICAL: Use this distinctive formatting:
- Use "## 📋 [Procedure Name]" for main headers
- Visual separators: "---" before and after key sections
- Numbered steps: "### Step X: [Action]"
- Highlight transaction codes: `TBB1`
- Use blockquotes for: > ⚠️ **Important**, > 💡 **Tip**, > 🎯 **Objective**
- Always end with: "---\n\n📚 **Source**: [Runbook Name]"

ONLY use the provided context."""

    CHAT_PROMPT = """You are a SAP TRM Expert Assistant. The user is asking a general question.
Provide a helpful, accurate, and professional response based ONLY on the provided context.
Use markdown for readability but DO NOT use the formal runbook/procedure headers or separators.
Answer naturally as if in a professional conversation.

If the user is asking for a definition or a "what is" style question, give a clear explanation.
If the answer is not in the context, say "I don't have enough information in my knowledge base to answer this." """

    active_prompt = RUNBOOK_PROMPT if intent_type == 'RUNBOOK_REQUEST' else CHAT_PROMPT
    
    prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": active_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=800
    )
    
    answer = response.choices[0].message.content.strip()
    
    sources_list = list(set([h['doc_name'] for h in hits]))
    is_runbook = (intent_type == 'RUNBOOK_REQUEST')
    
    runbook_style_type = runbook_hint if is_runbook else None
    if is_runbook and (not runbook_style_type or runbook_style_type == 'general'):
         for source in sources_list:
            source_lower = source.lower()
            if 'operational' in source_lower: runbook_style_type = 'operational'; break
            if 'incident' in source_lower: runbook_style_type = 'incident'; break
            if 'system' in source_lower or 'admin' in source_lower: runbook_style_type = 'system_admin'; break

    return {
        "answer": answer,
        "sources": sources_list,
        "is_runbook": is_runbook,
        "runbook_type": runbook_style_type
    }

if __name__ == "__main__":
    print(answer_question("What is FX settlement risk?"))
