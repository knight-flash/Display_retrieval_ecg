import json
import os
import glob

def fix_database_manifest(db_path):
    manifest_path = os.path.join(db_path, 'manifest.json')
    index_path = os.path.join(db_path, 'index.json')
    
    if os.path.exists(manifest_path):
        print(f"Manifest already exists for {db_path}")
        return

    if not os.path.exists(index_path):
        print(f"No index.json found in {db_path}, skipping.")
        return

    print(f"Generating manifest for {db_path} from index.json...")
    
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            cases = json.load(f)
        
        # Find query cases
        query_cases = [c for c in cases if c.get('isQueryCase', False)]
        
        if not query_cases:
            # Fallback: take the first case if no explicit query case
            print("No explicit query case found, using first case.")
            query_cases = [cases[0]] if cases else []

        manifest = []
        for qc in query_cases:
            manifest.append({
                "id": qc.get('id'),
                "cleanName": qc.get('cleanName', 'Unknown'),
                "diagnosis": qc.get('diagnosis', []),
                "fileName": qc.get('fileName', f"cases/{qc.get('id')}.json"),
                "retrievalFile": "index.json", # Point to index.json as the retrieval source
                "timestamp": "Unknown"
            })
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)
        print(f"Created manifest.json for {db_path}")

    except Exception as e:
        print(f"Error processing {db_path}: {e}")

def main():
    root_data = 'src/data' # Adjust if needed
    if not os.path.exists(root_data):
        # Try full path from previous context
        root_data = r'c:\Users\knightlyflash\Desktop\博士\clip\recommendation\System_Improved\src\data'
    
    print(f"Scanning {root_data}...")
    
    for db_dir in glob.glob(os.path.join(root_data, '*')):
        if os.path.isdir(db_dir):
            fix_database_manifest(db_dir)

if __name__ == "__main__":
    main()
