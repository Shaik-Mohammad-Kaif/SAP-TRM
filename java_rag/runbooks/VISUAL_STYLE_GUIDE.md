# SAP TRM Runbook Response - New Visual Style

## Example 1: Configuration Procedure

---

## 📋 Configuring Account Determination in SAP TRM

> 🎯 **Objective**: Set up account determination rules for automatic GL account assignment in SAP Treasury and Risk Management

### Step 1: Access Configuration

• **Transaction Code**: `OT84`  
• Navigate to: SPRO → TRM → Transaction Manager → Account Determination  
• Ensure you have authorization for configuration changes

### Step 2: Define Account Determination Key

• Enter **Company Code**  
• Select **Product Type** (e.g., MM-LOAN, FX-SPOT)  
• Define **Transaction Type**  
• Specify **Flow Type** (payment, receipt, etc.)  
• Set **Update Type** (accrual, settlement, etc.)

### Step 3: Assign GL Accounts

• Map to appropriate **GL Account** numbers  
• Optionally assign **Cost Center**  
• Optionally assign **Profit Center**

> ⚠️ **Important**: Ensure all mandatory fields are completed to avoid posting errors during transaction processing

### Step 4: Test Configuration

• Create a sample transaction using `TBB1`  
• Verify correct GL accounts are assigned  
• Check posting document with `FB03`

> 💡 **Tip**: Document all account determination rules in a configuration spreadsheet for audit purposes

---

📚 **Source**: SAP TRM System Administration › Account Determination Configuration

---

## Example 2: Incident Response

---

## 📋 Critical Liquidity Shortfall Response

> 🔴 **Severity**: CRITICAL  
> ⏱️ **Response Time**: 15 minutes

> 🎯 **Objective**: Restore adequate liquidity levels to meet payment obligations

### Step 1: Initial Assessment (5 minutes)

**Verify the Alert**:
• **Transaction Code**: `FEBA` (Cash Position)  
• Check real-time cash positions across all house banks  
• Verify against expected balances  
• Confirm this is not a data synchronization issue

**Assess Scope**:
• Total shortfall amount  
• Duration (intraday vs. overnight)  
• Affected currencies  
• Upcoming payment obligations

### Step 2: Immediate Actions (10 minutes)

**Review Payment Queue**:
• Access Transaction Manager: `TBB1`  
• Review payments due today  
• Identify critical vs. deferrable payments  
• Contact Incident Commander for prioritization

**Identify Funding Sources**:
• Check unused credit facility limits: `TCRA`  
• Review short-term investments for liquidation  
• Identify intercompany funding options  
• Contact banking partners for emergency facilities

### Step 3: Execute Funding (15-30 minutes)

**For Credit Facility Drawdown**:
• Transaction: `TBB1` → Money Market → Loan  
• Select approved banking partner  
• Enter drawdown amount and terms  
• Submit for expedited approval  
• Confirm with bank via phone

> ⚠️ **Important**: Document all decisions and actions taken during the incident

### Step 4: Communication

**Immediate Notifications** (within 15 minutes):
• CFO  
• Treasury Manager  
• Banking partners (if needed)  
• Payment operations team

**Escalation Matrix**:
• 🔴 **Critical**: CFO (immediate)  
• 🟡 **High**: Treasury Manager (30 min)  
• 🟢 **Normal**: Operations Team (1 hour)

> 💡 **Tip**: Use the pre-approved communication template: "URGENT: Liquidity Shortfall Alert"

---

📚 **Source**: SAP TRM Incident Response › Critical Liquidity Shortfall

---

## Example 3: Daily Operations

---

## 📋 Daily Transaction Management Procedures

> 🎯 **Objective**: Process daily treasury transactions accurately and efficiently

### Step 1: Deal Capture

**Access Transaction Manager**:
• **Transaction Code**: `TBB1`  
• Navigate to: SAP TRM → Transaction Manager

**Select Transaction Type**:
• Money Market  
• Foreign Exchange  
• Derivatives  
• Securities

### Step 2: Enter Deal Details

**Counterparty Information**:
• Select from approved business partner list  
• Verify counterparty is active  
• Check credit limit availability

**Transaction Details**:
• Deal date and value date  
• Amount and currency  
• Interest rate / exchange rate  
• Maturity date  
• Payment instructions

> ⚠️ **Important**: All mandatory fields must be completed before saving

### Step 3: Validation and Approval

**Validation Checks**:
• Review deal summary screen  
• Verify against source documents  
• Check for duplicate entries  
• Confirm pricing within acceptable ranges

**Approval Workflow**:
• Submit to authorized approver  
• Monitor approval status in workflow inbox  
• Address any rejection comments  
• Resubmit if necessary

### Step 4: Settlement Processing

**Daily Settlement Tasks**:
• Run settlement due list: `TBS1`  
• Filter by settlement date = current date  
• Verify settlement instructions  
• Generate payment instructions  
• Submit to Bank Communication Management (BCM)

> 💡 **Tip**: Schedule settlement processing before 2:00 PM to meet same-day deadlines

**Key Transaction Codes**:
• `TBB1` - Deal Entry  
• `TBB2` - Deal Display  
• `TBB3` - Deal Change  
• `TBS1` - Settlement Due List

---

📚 **Source**: SAP TRM Operational Procedures › Daily Transaction Management

---

## Style Features

### Visual Elements Used:

1. **Emojis for Quick Recognition**:
   - 📋 Procedure/Runbook
   - 🎯 Objective
   - ⚠️ Important/Warning
   - 💡 Tip/Best Practice
   - ⏱️ Timeline
   - 🔴 Critical
   - 🟡 High Priority
   - 🟢 Normal
   - 📚 Source

2. **Callout Boxes** (Blockquotes):
   - Highlights critical information
   - Stands out visually
   - Easy to scan

3. **Clear Hierarchy**:
   - ## for main headers
   - ### for steps
   - • for sub-bullets

4. **Consistent Formatting**:
   - Transaction codes always in `backticks`
   - Bold for labels and emphasis
   - Horizontal rules (---) for visual separation

5. **Source Attribution**:
   - Always at the bottom
   - Uses › separator for hierarchy
   - Wrapped in horizontal rules

This style makes runbook content:
✅ Instantly recognizable  
✅ Easy to scan  
✅ Professional looking  
✅ Action-oriented  
✅ Visually distinct from regular answers
