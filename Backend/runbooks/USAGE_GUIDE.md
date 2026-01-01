# SAP TRM Runbook Display - User Guide

## How to Get Runbooks

Your RAG agent now has **two ways** to help you with SAP TRM runbooks:

### Option 1: Quick Answers (RAG Search)
Ask specific questions and get targeted answers from the runbooks.

**Examples**:
- "What are the daily transaction management procedures?"
- "How do I respond to a liquidity shortfall?"
- "How do I configure account determination?"

**Result**: Agent provides a concise answer with relevant information from the runbooks.

---

### Option 2: Full Runbook Display
Request the complete runbook document for comprehensive reference.

**How to Request**:
Use phrases like:
- "Show me the SAP TRM operational procedures runbook"
- "Get the incident response runbook"
- "Display the full system administration guide"
- "I need the complete operational procedures"

**Result**: Agent offers to retrieve the full runbook. Reply "yes" to get the complete document.

---

## Available Runbooks

### 📘 1. SAP TRM Operational Procedures
**What's Inside**:
- Daily transaction management (deal capture, settlement)
- Cash and liquidity management
- Risk management operations (market risk, credit risk)
- Month-end procedures
- Master data management
- Integration procedures
- Compliance and controls

**When to Use**: For daily operations, routine procedures, and operational guidance

**Request Examples**:
- "Show me the operational procedures runbook"
- "Get the daily operations guide"
- "I need the transaction management procedures"

---

### 🚨 2. SAP TRM Incident Response
**What's Inside**:
- Critical incident scenarios:
  - Liquidity shortfalls
  - Unauthorized payments
  - System outages
  - Hedge ratio breaches
  - Posting failures
  - Market data feed failures
- Escalation matrix
- Communication templates
- Post-incident review process

**When to Use**: During emergencies, critical incidents, or when planning incident response

**Request Examples**:
- "Show me the incident response runbook"
- "Get the emergency procedures guide"
- "I need the critical incident procedures"

---

### ⚙️ 3. SAP TRM System Administration
**What's Inside**:
- System architecture
- Configuration management (account determination, product types)
- Common issues and resolutions
- Performance optimization
- Data management
- Integration troubleshooting
- Security and access control
- Monitoring and alerting

**When to Use**: For technical configuration, troubleshooting, and system administration

**Request Examples**:
- "Show me the system administration runbook"
- "Get the configuration guide"
- "I need the troubleshooting procedures"

---

## Example Conversations

### Example 1: Quick Answer
```
User: "What are the daily transaction management procedures?"

Agent: "The daily transaction management procedures for SAP TRM include:

1. Deal Capture and Processing:
   - Access Transaction Manager (TBB1)
   - Select transaction type (Money Market, FX, Derivatives, Securities)
   - Enter counterparty details from approved business partner list
   ...

Sources: 01_SAP_TRM_Operational_Procedures"
```

---

### Example 2: Full Runbook Request
```
User: "Show me the SAP TRM operational procedures runbook"

Agent: "I detected you might need the SAP TRM Operational Procedures runbook. 
Would you like me to retrieve the full document for you? (Reply with 'yes' or 'no')

Alternatively, I can answer your specific question using the knowledge base."

User: "yes"

Agent: [Displays full runbook with professional formatting]

# 📘 SAP TRM Operational Procedures

---

## Overview
This runbook provides comprehensive operational procedures...

[Full runbook content with all sections]

---

**Document Source**: `runbooks/operational_procedures.md`
**Retrieved**: SAP TRM Operational Procedures runbook from local system

💡 **Tip**: You can ask me specific questions about any section of this runbook 
for more detailed explanations.
```

---

## Tips for Best Results

### For Quick Answers:
✅ **DO**: Ask specific questions
- "How do I process a settlement?"
- "What is the escalation procedure for incidents?"
- "How do I fix posting errors?"

❌ **DON'T**: Ask vague questions
- "Tell me about SAP TRM"
- "What can you do?"

### For Full Runbooks:
✅ **DO**: Use explicit runbook request phrases
- "Show me the runbook"
- "Get the full guide"
- "Display the complete procedures"

✅ **DO**: Specify which runbook you want
- "Show me the **incident response** runbook"
- "Get the **operational procedures** guide"

---

## Runbook Features

### Professional Formatting
- ✅ Clear section headers
- ✅ Table of contents
- ✅ Step-by-step procedures
- ✅ Transaction codes (TBB1, FEBA, etc.)
- ✅ Troubleshooting guides
- ✅ Escalation matrices
- ✅ Communication templates

### Easy Navigation
- ✅ Organized by topic
- ✅ Searchable content
- ✅ Cross-references
- ✅ Quick reference sections

### Comprehensive Coverage
- ✅ 13 KB - Operational Procedures
- ✅ 21 KB - Incident Response
- ✅ 25 KB - System Administration
- ✅ Total: 60+ KB of SAP TRM documentation

---

## API Endpoints

### List Available Runbooks
```bash
GET http://127.0.0.1:8000/runbooks
```

**Response**:
```json
{
  "runbooks": [
    {
      "id": "operational_procedures",
      "name": "SAP TRM Operational Procedures",
      "description": "Daily transaction management, cash & liquidity...",
      "keywords": ["transaction", "settlement", "cash position"]
    },
    ...
  ]
}
```

### Ask Questions
```bash
POST http://127.0.0.1:8000/ask
```

**Request**:
```json
{
  "query": "Show me the operational procedures runbook",
  "conversation_history": [],
  "conversation_id": "user123"
}
```

---

## Troubleshooting

### Issue: Agent doesn't offer runbook
**Solution**: Use more explicit phrases:
- "Show me the runbook"
- "Get the full guide"
- "Display the complete procedures"

### Issue: Agent gives short answer instead of full runbook
**Solution**: This is by design! The agent provides:
- **Short answers** for specific questions
- **Full runbooks** when explicitly requested

If you want the full runbook, say:
- "Show me the full runbook"
- "I need the complete guide"

### Issue: Wrong runbook offered
**Solution**: Be specific about which runbook:
- "Show me the **incident response** runbook"
- "Get the **operational procedures** guide"
- "Display the **system administration** manual"

---

## Summary

✅ **Two modes**: Quick answers OR full runbooks  
✅ **Smart detection**: Agent knows which mode you want  
✅ **Professional formatting**: Beautiful, easy-to-read display  
✅ **Comprehensive**: 3 complete SAP TRM runbooks  
✅ **Always available**: Both in RAG and as full documents  

**Try it now!** Ask: "Show me the SAP TRM operational procedures runbook"
