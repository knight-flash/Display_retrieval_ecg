
import os
import json
import numpy as np
import pandas as pd
import torch
import wfdb
import ast
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm

# === Configuration ===

# 1. Inputs
# ICD Data - Corrected Path based on user log
# User path: /data2/2shared/AAA_public_data/HEEDB/HEEDB/icd10_codes.csv
ICD_CSV_PATH = '/data2/2shared/AAA_public_data/HEEDB/HEEDB/icd10_codes.csv'
TARGET_ICD_CODE = 'I49.8' # Other cardiac arrhythmias

# HEEDB Config (Gallery)
HEEDB_BASE_DIR = '/data2/2shared/yanmingke/heedb_clean_ecg/train'
HEEDB_TEXT_CSV = 'heedb_texts_filtered_95.csv'
HEEDB_EMB_NAME = 'heedb_ecg_embeddings_filtered_95.pt'
HEEDB_PATH_MAP = '/data2/2shared/yanmingke/heedb_embedding_final/train_processed_update.csv'

# MIMIC Config (Probe/Query) - Using same paths as generate_rare_retrieval.py
MIMIC_BASE_DIR = '/data2/2shared/AAA_public_data/mimic-iv-ecg-diagnostic-electrocardiogram-matched-subset-1.0'
MIMIC_META_CSV = '/data2/2shared/yanmingke/mimic/brugada/clean/mimic_ecg_labels_cleaned.csv'
MIMIC_EMB_FILE = '/data2/2shared/yanmingke/mimic/brugada/clean/ecg_embeddings_cleaned.pt'

# 2. Query Cases (Hardcoded)
QUERY_GROUPS = {
    "Type 1": ["mimic_42286026", "mimic_41125963", "mimic_44404039"],
    "Type 2": ["mimic_48555490", "mimic_49812178", "mimic_43447564"]
}
# Flatten for easy processing
ALL_QUERY_IDS = [qid for group in QUERY_GROUPS.values() for qid in group]


# 3. Output
OUTPUT_BASE = 'database_icd' # output directory
OUTPUT_CASES = os.path.join(OUTPUT_BASE, 'cases')
OUTPUT_RETRIEVALS = os.path.join(OUTPUT_BASE, 'retrievals')

# 4. Parameters
DECIMAL_PLACES = 3
DOWNSAMPLE_RATIO = 2 # Visualization downsample

def setup_directories():
    os.makedirs(OUTPUT_CASES, exist_ok=True)
    os.makedirs(OUTPUT_RETRIEVALS, exist_ok=True)
    print(f"Output directories ensured at: {os.path.abspath(OUTPUT_BASE)}")

def map_diagnosis(original_text):
    """Parses diagnosis string/list into a clean list of tags."""
    original_text = str(original_text).strip()
    raw_tags = []
    if original_text.startswith('[') and original_text.endswith(']'):
        try:
            tags = ast.literal_eval(original_text)
            if isinstance(tags, list):
                raw_tags = [str(t).strip() for t in tags if str(t).strip()]
        except:
            pass
    if not raw_tags:
         if '|' in original_text:
             raw_tags = original_text.split('|')
         elif ',' in original_text:
             raw_tags = original_text.split(',')
         else:
             raw_tags = [original_text]
    final_tags = []
    for t in raw_tags:
        clean_t = t.strip().strip("'").strip('"')
        if not clean_t or clean_t.lower() == 'nan': continue
        if clean_t not in final_tags: final_tags.append(clean_t)
    if not final_tags: return ["Unclassified"]
    return final_tags

def load_icd_filtered_patients():
    """Loads ICD CSV and returns a set of PatientIDs with TARGET_ICD_CODE."""
    print(f"Loading ICD Data from {ICD_CSV_PATH}...")
    if not os.path.exists(ICD_CSV_PATH):
        print(f"ERROR: ICD CSV not found: {ICD_CSV_PATH}")
        return set()
    
    # Read strict columns to avoid errors
    df_icd = pd.read_csv(ICD_CSV_PATH, usecols=['BDSPPatientID', 'DIAGNOSIS_ICD10_CD'])
    
    # Filter
    filtered = df_icd[df_icd['DIAGNOSIS_ICD10_CD'] == TARGET_ICD_CODE]
    valid_pids = set(filtered['BDSPPatientID'].astype(str).unique())
    
    print(f"  Found {len(filtered)} records with {TARGET_ICD_CODE}.")
    print(f"  Unique Patients to Keep: {len(valid_pids)}")
    return valid_pids

def load_heedb_data(valid_patient_ids):
    print("Loading HEEDB Data (Gallery)...")
    csv_path = os.path.join(HEEDB_BASE_DIR, HEEDB_TEXT_CSV)
    if not os.path.exists(csv_path):
        print(f"ERROR: HEEDB Metadata not found: {csv_path}")
        return None, None
    
    df = pd.read_csv(csv_path)
    original_count = len(df)
    
    # --- FILTERING LOGIC ---
    # Parse PatientID from HashFileName: de_PatientID_Time1_Time2
    print("  Parsing PatientIDs from HashFileName...")
    
    def extract_pid(fname):
        parts = str(fname).split('_')
        if len(parts) >= 2:
            return parts[1] # de_[ID]_...
        return None

    df['parsed_pid'] = df['HashFileName'].apply(extract_pid)

    # DEBUG: Show what we parsed
    print("\n--- DEBUG: Parsing Check ---")
    print(df[['HashFileName', 'parsed_pid']].head(5))
    print("----------------------------\n")
    
    # Filter
    # Ensure parsed PIDs and valid_pids are same type (str)
    df = df[df['parsed_pid'].isin(valid_patient_ids)]
    
    if len(df) == 0:
        print("CRITICAL: Filter resulted in 0 records. Check if IDs match format (e.g. 123456789).")
        # debug
        print(f"  Sample Valid IDs (from ICD): {list(valid_patient_ids)[:5]}")
        print(f"  Sample Parsed IDs (from HEEDB): {df['parsed_pid'].head().tolist() if 'parsed_pid' in df else 'None'}")
        return None, None
    
    print(f"  HEEDB Filtered: {len(df)} / {original_count} records.")
    
    if len(df) == 0:
        print("ERROR: Filter resulted in 0 records. Check IDs.")
        return None, None

    # Load Embeddings
    # We need to slice embeddings to match the filtered DF indices
    # This requires we know the original indices
    emb_path = os.path.join(HEEDB_BASE_DIR, HEEDB_EMB_NAME)
    if not os.path.exists(emb_path):
        print(f"ERROR: HEEDB Embeddings not found: {emb_path}")
        return None, None
        
    full_embs = torch.load(emb_path, map_location='cpu')
    full_embs = torch.nn.functional.normalize(full_embs, p=2, dim=1).numpy()
    
    # Get indices of filtered DF in original DF
    # Assuming df.index is preserved from read_csv if we didn't reset_index yet
    filtered_indices = df.index.to_numpy()
    filtered_embs = full_embs[filtered_indices]
    
    # IMPORTANT: Reset index of DF so it aligns with 0..N of filtered_embs
    df = df.reset_index(drop=True)
    
    # Map Paths
    if os.path.exists(HEEDB_PATH_MAP):
        print("  Loading HEEDB path mapping...")
        df_paths = pd.read_csv(HEEDB_PATH_MAP)
        path_map = df_paths.drop_duplicates(subset=['HashFileName']).set_index('HashFileName')['full_ecg_path'].to_dict()
        df['full_ecg_path'] = df['HashFileName'].map(path_map)
    
    return df, filtered_embs

def load_mimic_data():
    print("Loading MIMIC Data (Probe)...")
    if not os.path.exists(MIMIC_META_CSV):
        print(f"ERROR: MIMIC Metadata not found: {MIMIC_META_CSV}")
        return None, None
        
    df = pd.read_csv(MIMIC_META_CSV)
    
    # Load Embeddings
    if not os.path.exists(MIMIC_EMB_FILE):
        print(f"ERROR: MIMIC Embeddings not found: {MIMIC_EMB_FILE}")
        return None, None
        
    ecg_embs = torch.load(MIMIC_EMB_FILE, map_location='cpu')
    ecg_embs = torch.nn.functional.normalize(ecg_embs, p=2, dim=1).numpy()
    
    return df, ecg_embs

def process_ecg_file(file_path, details_dict, output_dir):
    """Reads WFDB file and writes JSON details (Downsampled)."""
    try:
        real_path = str(file_path)
        base_path = os.path.splitext(real_path)[0]

        record = wfdb.rdrecord(base_path)
        signals = np.nan_to_num(record.p_signal)
        
        leads_data = {}
        for i, lead in enumerate(record.sig_name):
             leads_data[lead] = [round(float(x), DECIMAL_PLACES) for x in signals[:, i]]
             
        file_id = details_dict['id']
        
        final_obj = {
            "id": file_id,
            "meta": details_dict['meta'],
            "report": details_dict['report'],
            "samplingRate": record.fs,
            "leads": leads_data,
            "diagnosis": details_dict['diagnosis'],
            "medicalCategory": details_dict['diagnosis'][0],
            "cleanName": details_dict['diagnosis'][0],
            "isQueryCase": details_dict.get('isQuery', False)
        }
        
        with open(os.path.join(output_dir, f"{file_id}.json"), 'w') as f:
            json.dump(final_obj, f)
            
        # Return Preview (Lead I or II)
        preview_lead = 'II' if 'II' in leads_data else (list(leads_data.keys())[0])
        return leads_data[preview_lead][::DOWNSAMPLE_RATIO]
        
    except Exception as e:
        print(f"  Error reading ECG {file_path}: {e}")
        return None

def main():
    setup_directories()
    
    # 1. Load ICD Valid Set
    valid_pids = load_icd_filtered_patients()
    if not valid_pids:
        print("Warning: No valid patients found from ICD file. Proceeding with caution (Filtered set might be empty).")

    # 2. Load Gallery (HEEDB) with Filteirng
    h_df, h_embs = load_heedb_data(valid_pids)
    if h_df is None: return

    # 3. Load Probe (MIMIC)
    m_df, m_embs = load_mimic_data()
    if m_df is None: return

    # 4. Find Query Indices
    # Note: MIMIC IDs in ALL_QUERY_IDS are likely 'mimic_' + study_id
    # We need to map back to m_df indices.
    # m_df should have 'study_id'.
    
    m_df['full_id'] = m_df['study_id'].apply(lambda x: f"mimic_{x}")
    query_indices = []
    
    for qid in ALL_QUERY_IDS:
        matches = m_df.index[m_df['full_id'] == qid].tolist()
        if matches:
            query_indices.append((qid, matches[0]))
        else:
            print(f"⚠️ Query ID {qid} not found in MIMIC metadata.")

    print(f"Found {len(query_indices)} / {len(ALL_QUERY_IDS)} query cases in metadata.")
    
    manifest = []
    
    # 5. Retrieval Loop
    for qid, q_idx in tqdm(query_indices, desc="Processing Queries"):
        
        # --- Identify Type ---
        q_type = "Unknown Group"
        for g_name, g_ids in QUERY_GROUPS.items():
            if qid in g_ids:
                q_type = g_name
                break
        
        row = m_df.iloc[q_idx]
        
        # Probe File
        rel_path = row['path']
        # Try finding file
        probe_path = None
        candidates_roots = [
            MIMIC_BASE_DIR, 
            '/data2/2shared/yanmingke/mimic',
            '/data2/2shared/yanmingke/mimic_iv_ecg'
        ]
        for root in candidates_roots:
             test_p = os.path.join(root, rel_path)
             if os.path.exists(os.path.splitext(test_p)[0] + ".hea"):
                 probe_path = test_p
                 break
        
        if not probe_path:
             print(f"Skipping {qid}: Waveform file not found.")
             continue

        # Probe Details
        probe_diag = map_diagnosis(row.get('labels', 'Unknown'))
        
        probe_details = {
            "id": qid,
            "meta": {"age": "Unk", "gender": "Unk", "time": "MIMIC Query"},
            "report": str(row.get('final_report', 'No Report')),
            "diagnosis": probe_diag,
            "isQuery": True
        }
        
        probe_sig = process_ecg_file(probe_path, probe_details, OUTPUT_CASES)
        if probe_sig is None: continue
        
        # --- Retrieval ---
        query_vec = m_embs[q_idx].reshape(1, -1)
        sims = cosine_similarity(h_embs, query_vec).flatten()
        
        # Top 20
        top_k_indices = np.argsort(sims)[::-1][:10]
        
        retrieved_items = []
        
        for rank, t_idx in enumerate(top_k_indices):
            t_sim = sims[t_idx]
            t_row = h_df.iloc[t_idx]
            t_id = str(t_row['HashFileName'])
            
            t_diag = map_diagnosis(t_row.get('labels', ''))
            
            t_obj = {
                "id": t_id,
                "meta": {
                    "age": int(t_row.get('Age', 0)),
                    "gender": t_row.get('Gender', 'U'),
                    "time": str(t_row.get('RecordingTime', ''))
                },
                "report": str(t_row.get('text', '')),
                "diagnosis": t_diag,
                "isQuery": False
            }
            
            t_sig = process_ecg_file(t_row.get('full_ecg_path'), t_obj, OUTPUT_CASES)
            
            if t_sig is not None:
                retrieved_items.append({
                    "id": t_id,
                    "fileName": f"cases/{t_id}.json",
                    "medicalCategory": t_diag[0],
                    "cleanName": t_diag[0],
                    "diagnosis": t_diag,
                    "report": t_obj['report'],
                    "similarity": round(float(t_sim), 3),
                    "previewSignal": t_sig,
                    "type": "Result"
                })

        # Save Retrieval
        r_filename = f"retrieval_{qid}.json"
        with open(os.path.join(OUTPUT_RETRIEVALS, r_filename), 'w') as f:
            json.dump(retrieved_items, f)
            
        # Add to Manifest
        manifest.append({
            "id": qid,
            "taskType": "ICD Retrieval", 
            "description": f"{q_type} Search (ICD Filtered)",
            "cleanName": f"Type: {q_type}",
            "diagnosis": probe_diag,
            "fileName": f"cases/{qid}.json",
            "retrievalFile": f"retrievals/{r_filename}",
            "timestamp": "ICD-I49.8"
        })

    # Save Manifest
    man_path = os.path.join(OUTPUT_BASE, 'manifest.json')
    with open(man_path, 'w') as f:
        json.dump(manifest, f)
        
    print(f"\n✅ Generation Complete. Saved {len(manifest)} tasks to {OUTPUT_BASE}")

if __name__ == "__main__":
    main()
