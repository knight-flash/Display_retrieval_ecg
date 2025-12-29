import os
import json
import random
import numpy as np

# Output for SameD_DiffE App
OUTPUT_BASE = './SameD_DiffE/src/data/database'
OUTPUT_CASES = os.path.join(OUTPUT_BASE, 'cases')
OUTPUT_RETRIEVALS = os.path.join(OUTPUT_BASE, 'retrievals')

# Source of truth (existing cases to reuse signal data)
SOURCE_CASES_DIR = './System_Improved/src/data/database/cases'

def setup_directories():
    os.makedirs(OUTPUT_CASES, exist_ok=True)
    os.makedirs(OUTPUT_RETRIEVALS, exist_ok=True)

def load_existing_cases():
    cases = []
    if os.path.exists(SOURCE_CASES_DIR):
        for f in os.listdir(SOURCE_CASES_DIR):
            if f.endswith('.json'):
                try:
                    with open(os.path.join(SOURCE_CASES_DIR, f), 'r') as file:
                         cases.append(json.load(file))
                except: pass
    return cases

def generate_mock_signal():
    # Simple sine wave with noise if no real data
    x = np.linspace(0, 10, 5000)
    return (np.sin(x) + np.random.normal(0, 0.1, 5000)).tolist()

def create_case(id, diagnosis, leads=None):
    if not leads:
        leads = {"I": generate_mock_signal(), "II": generate_mock_signal()}
        
    return {
        "id": id,
        "meta": {"age": 65, "gender": "Male", "time": "2024-01-01 12:00:00"},
        "report": f"Mock report for {diagnosis}",
        "samplingRate": 500,
        "leads": leads,
        "diagnosis": [diagnosis],
        "medicalCategory": "MockCategory",
        "cleanName": diagnosis
    }

def main():
    setup_directories()
    existing_cases = load_existing_cases()
    print(f"Loaded {len(existing_cases)} existing cases to reuse.")
    
    manifest = []
    
    # === 1. Visual Twins (Sim > 0.98, Diff Diag) ===
    print("Generating Visual Twins...")
    # We create 2 cases with IDENTICAL signals (Sim=1.0) but DIFFERENT tags
    
    twin_id_1 = "twin_case_a"
    twin_id_2 = "twin_case_b"
    
    # Reuse signal from first existing case if available
    leads = existing_cases[0]['leads'] if existing_cases else None
    
    case1 = create_case(twin_id_1, "Acute MI", leads)
    case2 = create_case(twin_id_2, "Normal Sinus Rhythm", leads) # Visual Twin!
    
    # Save Cases
    with open(os.path.join(OUTPUT_CASES, f"{twin_id_1}.json"), 'w') as f: json.dump(case1, f)
    with open(os.path.join(OUTPUT_CASES, f"{twin_id_2}.json"), 'w') as f: json.dump(case2, f)
    
    # Create Retrieval (Case 1 query -> Case 2 result)
    r_item = {
        "id": twin_id_2,
        "fileName": f"cases/{twin_id_2}.json",
        "cleanName": "Normal Sinus Rhythm",
        "diagnosis": ["Normal Sinus Rhythm"],
        "medicalCategory": "Normal",
        "similarity": 0.995,
        "previewSignal": case2['leads'].get('I', [])[::10]
    }
    
    r_name = f"retrieval_{twin_id_1}.json"
    with open(os.path.join(OUTPUT_RETRIEVALS, r_name), 'w') as f:
        json.dump([r_item], f)
        
    manifest.append({
        "id": twin_id_1,
        "taskType": "VisualTwins",
        "description": "Visual Twins: Acute MI vs Normal (Mock)",
        "cleanName": "Acute MI",
        "diagnosis": ["Acute MI"],
        "fileName": f"cases/{twin_id_1}.json",
        "retrievalFile": f"retrievals/{r_name}",
        "timestamp": "MockTime"
    })
    
    # === 2. SameD DiffE (Same Diag, Diverse) ===
    print("Generating SameD DiffE...")
    core_id = "samed_core"
    
    # Create Core Case
    case_core = create_case(core_id, "Atrial Fibrillation")
    with open(os.path.join(OUTPUT_CASES, f"{core_id}.json"), 'w') as f: json.dump(case_core, f)
    
    # Create 3 Diverse Cases (Same Diag, but let's pretend strictly different signals)
    r_list = []
    for i in range(3):
        d_id = f"samed_diff_{i}"
        d_case = create_case(d_id, "Atrial Fibrillation") # Same Diag
        with open(os.path.join(OUTPUT_CASES, f"{d_id}.json"), 'w') as f: json.dump(d_case, f)
        
        r_list.append({
             "id": d_id,
        "fileName": f"cases/{d_id}.json",
        "cleanName": "Atrial Fibrillation",
        "diagnosis": ["Atrial Fibrillation"],
        "medicalCategory": "Rhythm",
        "similarity": 0.45 + (i*0.1), # Low similarity
        "previewSignal": d_case['leads'].get('I', [])[::10]
        })
        
    r_name_core = f"retrieval_{core_id}.json"
    with open(os.path.join(OUTPUT_RETRIEVALS, r_name_core), 'w') as f:
        json.dump(r_list, f)
        
    manifest.append({
        "id": core_id,
        "taskType": "SameD_DiffE",
        "description": "Diverse Manifestations: AFib (Mock)",
        "cleanName": "Atrial Fibrillation",
        "diagnosis": ["Atrial Fibrillation"],
        "fileName": f"cases/{core_id}.json",
        "retrievalFile": f"retrievals/{r_name_core}",
        "timestamp": "MockTime"
    })
    
    # Save Manifest
    with open(os.path.join(OUTPUT_BASE, 'manifest.json'), 'w') as f:
        json.dump(manifest, f)
    print("Mock Manifest Generated.")

if __name__ == "__main__":
    main()
