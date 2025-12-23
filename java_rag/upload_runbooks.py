import requests
import os

API_URL = "http://127.0.0.1:8000/upload"

runbooks = [
    "d:/java_rag/pdfs/00_SAP_TRM_Runbooks_Index.txt",
    "d:/java_rag/pdfs/01_SAP_TRM_Operational_Procedures.txt",
    "d:/java_rag/pdfs/02_SAP_TRM_Incident_Response.txt",
    "d:/java_rag/pdfs/03_SAP_TRM_System_Administration_Troubleshooting.txt"
]

def upload_file(file_path):
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    filename = os.path.basename(file_path)
    print(f"\n📤 Uploading: {filename}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, 'text/plain')}
            response = requests.post(API_URL, files=files)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success! Created {result.get('chunks_created', 0)} chunks")
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print("SAP TRM Runbooks Upload to RAG Knowledge Base")
    print("=" * 60)
    
    success_count = 0
    total_count = len(runbooks)
    
    for runbook in runbooks:
        if upload_file(runbook):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"Upload Complete: {success_count}/{total_count} successful")
    print("=" * 60)
    
    if success_count == total_count:
        print("\n✅ All runbooks uploaded successfully!")
        print("\nYou can now ask questions like:")
        print("  - 'What are the daily transaction management procedures for SAP TRM?'")
        print("  - 'How do I respond to a critical liquidity shortfall?'")
        print("  - 'How do I configure account determination in SAP TRM?'")
    else:
        print(f"\n⚠️ {total_count - success_count} runbook(s) failed to upload")

if __name__ == "__main__":
    main()
