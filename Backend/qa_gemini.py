import os
from dotenv import load_dotenv
from retriever import Retriever
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

retriever = Retriever()
MIN_SIMILARITY = 0.55  # Threshold to filter irrelevant documents

def build_context(docs):
    ctx = ""
    for d in docs:
        ctx += f"\n\n--- Retrieved Chunk (score={d['score']:.3f}) ---\n{d['text']}"
    return ctx

def condense_query(chat_history, latest_query):
    if not chat_history:
        return latest_query

    history_str = ""
    # Increase window for condensation to 10 messages for better context
    for msg in chat_history[-10:]:
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
    system_prompt = """You are a Technical Intent Classifier for SAP Treasury and Risk Management (TRM).

Analyze if the user wants a FORMAL PROCEDURE, RUNBOOK, STEP-BY-STEP GUIDE, CONFIGURATION SETUP, or TROUBLESHOOTING STEPS.
These are "procedural" queries that need detailed instructions.

If the user asks for a simple explanation, definition, or "short" clarification, it is NOT a runbook request.

If the query is procedural/technical (asking HOW TO DO something), output: INTENT: RUNBOOK_REQUEST | TOPIC: <brief 2-3 word topic>
Examples:
- "How do I settle a deal?" -> INTENT: RUNBOOK_REQUEST | TOPIC: Deal Settlement
- "What are the steps for month end?" -> INTENT: RUNBOOK_REQUEST | TOPIC: Month-End Procedures
- "Troubleshoot OT84 errors" -> INTENT: RUNBOOK_REQUEST | TOPIC: OT84 Troubleshooting
- "Configure product types" -> INTENT: RUNBOOK_REQUEST | TOPIC: Product Type Setup

If they just want a definition, list, background information, or explanation (asking WHAT IS something or "EXPLAIN" something), output: INTENT: GENERAL_QUERY
Examples:
- "What is Portfolio Analyzer?" -> INTENT: GENERAL_QUERY
- "Explain FX risk" -> INTENT: GENERAL_QUERY
- "What is a business partner?" -> INTENT: GENERAL_QUERY
- "Explain it in short" -> INTENT: GENERAL_QUERY
- "List the types of treasury instruments" -> INTENT: GENERAL_QUERY
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
            topic = "this topic"
            if "TOPIC:" in content:
                topic = content.split("TOPIC:")[1].strip()
            return 'RUNBOOK_REQUEST', topic
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
    denial_keywords = ['no', 'later', 'skip', 'don\'t', 'stop', 'nope', 'nevermind', 'n', 'close']
    
    is_simple_confirmation = any(keyword in query.lower() for keyword in confirmation_keywords) and len(query.split()) <= 5
    is_simple_denial = any(keyword in query.lower() for keyword in denial_keywords) and len(query.split()) <= 5
    
    force_general_query = False
    
    if (is_simple_confirmation or is_simple_denial) and conversation_history and len(conversation_history) > 0:
        last_message = conversation_history[-1].get('content', '') if conversation_history[-1].get('role') == 'assistant' else ''
        
        # New Interactive Portions Logic
        if "Would you like me to retrieve the formal runbook portion" in last_message:
            if is_simple_denial:
                print("DEBUG: User denied runbook portion. Switching to general answer.")
                force_general_query = True
            else:
                # Find the original technical query
                original_query = None
                for msg in reversed(conversation_history[:-1]):
                    if msg['role'] == 'user' and len(msg['content'].split()) > 2:
                        original_query = msg['content']
                        break
                
                if original_query:
                    print(f"DEBUG: Processing confirmation for technical query: {original_query}")
                    search_query = condense_query(conversation_history[:-1], original_query)
                    hits = retriever.query(search_query, top_k=10)
                    valid_hits = [h for h in hits if (1.0 - h['score']) >= MIN_SIMILARITY]
                    
                    if not valid_hits:
                        return {"answer": "I found the corresponding section, but it doesn't contain enough specific procedural detail to display as a runbook portion.", "sources": []}
                    
                    context = build_context(valid_hits)
                    response = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {"role": "system", "content": """You are a SAP TRM Expert. Extract the SPECIFIC procedural or technical portion requested.
    Formatting: Use "## 📋 [Procedure Name]", separators "---", numbered steps, and highlight T-Codes.
    If multiple steps are involved, list them clearly. End with source attribution."""},
                            {"role": "user", "content": f"Context:\n{context}\n\nTask: Provide the specific portion for '{original_query}'.\nAnswer:"}
                        ],
                        temperature=0.1,
                        max_tokens=800
                    )
                    answer = response.choices[0].message.content.strip()
                    sources_list = list(set([h['doc_name'] for h in valid_hits]))
                    return {"answer": answer, "sources": sources_list, "is_runbook": True}

        # Legacy Full Runbook Logic (keeping for compatibility)
        if 'Would you like me to retrieve' in last_message and 'portion' not in last_message:
            if is_simple_denial:
                print("DEBUG: User denied full runbook. Switching to general answer.")
                force_general_query = True
            else:
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
                        formatted_content = f"# 📘 {friendly}\n\n---\n\n{content}\n\n---\n\n**Document Source**: `runbooks/{actual}.md`  \n**Retrieved**: {friendly} runbook from local system"
                        return {"answer": formatted_content, "sources": ["Local Runbook System"]}
    
    if force_general_query:
        # Re-resolve the original query from the context if possible
        original_query = query
        for msg in reversed(conversation_history):
            if msg['role'] == 'user' and len(msg['content'].split()) > 2:
                original_query = msg['content']
                break
        query = original_query
        intent_type = 'GENERAL_QUERY'
        topic_hint = None
    else:
        intent_type, topic_hint = classify_intent(query)

    print(f"DEBUG: Intent detected: {intent_type} (Topic: {topic_hint})")

    if intent_type == 'RUNBOOK_REQUEST' and not is_simple_confirmation:
        return {
            "answer": f"I understand you're looking for information about **{topic_hint}**. Would you like me to retrieve the formal runbook portion for this?",
            "sources": [],
            "is_runbook": False
        }

    search_query = query
    if conversation_history:
        search_query = condense_query(conversation_history, query)
        print(f"DEBUG: Condensed '{query}' -> '{search_query}'")

    hits = retriever.query(search_query, top_k=10)
    
    # Filter hits based on similarity threshold
    valid_hits = [h for h in hits if (1.0 - h['score']) >= MIN_SIMILARITY]
    print(f"DEBUG: Retrieval found {len(hits)} hits, {len(valid_hits)} above threshold {MIN_SIMILARITY}")
    
    if not valid_hits:
        return {
            "answer": "I don't have enough information in my knowledge base to answer this. The requested topic does not appear to be related to SAP Treasury and Risk Management (TRM) documentation.", 
            "sources": [],
            "is_runbook": False
        }

    context = build_context(valid_hits)
    
    RUNBOOK_PROMPT = """You are a SAP TRM Expert. The user wants a FORMAL PROCEDURE or RUNBOOK section.
CRITICAL: Use this distinctive formatting:
- Use "## 📋 [Procedure Name]" for main headers
- Visual separators: "---" before and after key sections
- Numbered steps: "### Step X: [Action]"
- Highlight transaction codes: `TBB1`
- Use blockquotes for: > ⚠️ **Important**, > 💡 **Tip**, > 🎯 **Objective**
- Always end with: "---\n\n📚 **Source**: [Runbook Name]"

ONLY use the provided context."""

    CHAT_PROMPT = """You are a SAP TRM Expert Assistant with access to a specialized knowledge base.

RULES:
1. Answer questions confidently when the Context below contains relevant SAP TRM information
2. If the question is about SAP TRM topics and you have context, provide a clear, helpful answer
3. ONLY refuse to answer if:
   - The question is clearly about non-SAP-TRM topics (e.g., Java, Python, general programming)
   - The Context contains no relevant information at all
4. If refusing, respond with: "I don't have enough information in my knowledge base to answer this. The requested topic does not appear to be related to SAP Treasury and Risk Management (TRM) documentation."

Provide helpful, accurate responses using the Context when it's relevant to SAP TRM.
Use markdown for readability but DO NOT use formal runbook/procedure headers."""

    active_prompt = RUNBOOK_PROMPT if intent_type == 'RUNBOOK_REQUEST' else CHAT_PROMPT
    
    # Prepare messages for final generation
    messages = [{"role": "system", "content": active_prompt}]
    
    # Add recent history (last 15 messages) for much better contextual awareness
    if conversation_history:
        # We take the last 15 messages to provide deep context without hitting token limits
        for msg in conversation_history[-15:]:
            messages.append({"role": msg['role'], "content": msg['content']})

    # Prepare prompt with context
    final_user_prompt = f"Using the provided Context below (and our conversation history above if relevant), please answer the question.\n\nContext:\n{context}\n\nQuestion: {query}"
    messages.append({"role": "user", "content": final_user_prompt})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.1,
        max_tokens=800
    )
    
    answer = response.choices[0].message.content.strip()
    
    sources_list = list(set([h['doc_name'] for h in valid_hits]))
    is_runbook = (intent_type == 'RUNBOOK_REQUEST')
    
    runbook_style_type = topic_hint if is_runbook else None
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
