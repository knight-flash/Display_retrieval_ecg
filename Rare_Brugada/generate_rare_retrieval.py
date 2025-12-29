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
# HEEDB Config (Gallery)
HEEDB_BASE_DIR = '/data2/2shared/yanmingke/heedb_clean_ecg/train'
HEEDB_TEXT_CSV = 'heedb_texts_filtered_95.csv'
HEEDB_EMB_NAME = 'heedb_ecg_embeddings_filtered_95.pt'
HEEDB_PATH_MAP = '/data2/2shared/yanmingke/heedb_embedding_final/train_processed_update.csv'

# MIMIC Config (Probe/Query)
MIMIC_BASE_DIR = '/data2/2shared/AAA_public_data/mimic-iv-ecg-diagnostic-electrocardiogram-matched-subset-1.0' # Updated per user request
MIMIC_META_CSV = '/data2/2shared/yanmingke/mimic/brugada/clean/mimic_ecg_labels_cleaned.csv'
MIMIC_EMB_FILE = '/data2/2shared/yanmingke/mimic/brugada/clean/ecg_embeddings_cleaned.pt'

# Output Configuration
OUTPUT_BASE = 'database2' # Relative to Rare_Brugada root
OUTPUT_CASES = os.path.join(OUTPUT_BASE, 'cases')
OUTPUT_RETRIEVALS = os.path.join(OUTPUT_BASE, 'retrievals')

# Search Config
# Search Config
TARGET_SUBJECT_IDS = [
    10568395, 11751957, 11899066, 12149753, 12213737, 
    12433362, 13733689, 14580383, 14991275, 19039321, 19188032
]
DOWNSAMPLE_RATIO = 2
DECIMAL_PLACES = 3

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

def load_heedb_data():
    print("Loading HEEDB Data (Gallery)...")
    csv_path = os.path.join(HEEDB_BASE_DIR, HEEDB_TEXT_CSV)
    if not os.path.exists(csv_path):
        print(f"ERROR: HEEDB Metadata not found: {csv_path}")
        return None, None

    df = pd.read_csv(csv_path)
    # Load Embeddings
    emb_path = os.path.join(HEEDB_BASE_DIR, HEEDB_EMB_NAME)
    if not os.path.exists(emb_path):
        print(f"ERROR: HEEDB Embeddings not found: {emb_path}")
        return None, None
        
    ecg_embs = torch.load(emb_path, map_location='cpu')
    ecg_embs = torch.nn.functional.normalize(ecg_embs, p=2, dim=1).numpy()
    
    # Map Paths
    if os.path.exists(HEEDB_PATH_MAP):
        print("  Loading HEEDB path mapping...")
        df_paths = pd.read_csv(HEEDB_PATH_MAP)
        path_map = df_paths.drop_duplicates(subset=['HashFileName']).set_index('HashFileName')['full_ecg_path'].to_dict()
        df['full_ecg_path'] = df['HashFileName'].map(path_map)
    else:
        print(f"WARNING: HEEDB Path map not found: {HEEDB_PATH_MAP}")

    print(f"  HEEDB Data Loaded: {len(df)} records.")
    return df, ecg_embs

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
    
    print(f"  MIMIC Data Loaded: {len(df)} records.")
    return df, ecg_embs

def process_ecg_file(file_path, details_dict, output_dir):
    """Reads WFDB file and writes JSON details."""
    try:
        # Handle relative MIMIC paths if needed
        # Assuming df['path'] in MIMIC CSV is relative to MIMIC_BASE_DIR?
        # User CSV sample showed "files/p1000/..."
        # If absolute path is not provided, we might need to construct it.
        # But 'process_single_case' logic below handles it per dataset.
        
        # Determine real path
        real_path = str(file_path)
        base_path = os.path.splitext(real_path)[0]
        
        if not (os.path.exists(base_path + ".hea") or os.path.exists(base_path + ".dat")):
             # Try prepending MIMIC Base if logic suggests
             pass

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
            
        # Return Preview (Lead I)
        lead_i = 'I' if 'I' in leads_data else list(leads_data.keys())[0]
        return leads_data[lead_i][::DOWNSAMPLE_RATIO]
        
    except Exception as e:
        print(f"Error reading ECG {file_path}: {e}")
        return None

def main():
    setup_directories()
    
    # 1. Load Data
    h_df, h_embs = load_heedb_data()
    m_df, m_embs = load_mimic_data()
    
    if h_df is None or m_df is None:
        print("Data loading failed. Exiting.")
        return

    # 2. Filter MIMIC Probes
    # Prioritize TARGET_SUBJECT_ID, but keep Brugada labeled ones too?
    # User said: "subject_id as example... Brugada too rare... find corresponding subject_id"
    # We will search for the specific subject ID.
    
    print(f"Filtering for {len(TARGET_SUBJECT_IDS)} Target Subject IDs or Brugada Label...")
    
    # Filter logic: specific ID OR brugada_label=1
    if 'subject_id' in m_df.columns:
        m_df['subject_id'] = m_df['subject_id'].astype(str)
        
    target_strs = set([str(x) for x in TARGET_SUBJECT_IDS])
    
    probe_indices = []
    
    for idx, row in m_df.iterrows():
        sid = str(row.get('subject_id', ''))
        is_target = sid in target_strs
        is_brugada = str(row.get('brugada_label', '0')) == '1'
        
        if is_target or is_brugada:
            probe_indices.append(idx)
            
    probe_indices = sorted(list(set(probe_indices)))
    print(f"Found {len(probe_indices)} probe candidates.")
    
    manifest = []
    
    # 3. Retrieval Loop
    for p_idx in tqdm(probe_indices, desc="Processing Probes"):
        row = m_df.iloc[p_idx]
        p_id = f"mimic_{row['study_id']}" # Unique ID
        
        # --- Process Probe Case ---
        # Construct path: MIMIC CSV has relative path 'path' column usually?
        # sample: "files/p1000/p10000032/s40689238/40689238"
        rel_path = row['path']
        full_path = os.path.join(MIMIC_BASE_DIR, rel_path) # Adjust if needed
        # MIMIC usually has folder structure. Assuming 'files' is inside MIMIC_BASE_DIR? 
        # Actually user path is `/data2/.../mimic/brugada/clean`. 
        # The 'path' in csv is likely relative to the mimic root database, NOT the 'clean' folder.
        # But we only have what we have. If file not found, we skip.
        # Let's try to find it.
        # If absolute path logic is complex, we might fail here. 
        # *Self-Correction*: User said "mimic/brugada/clean/mimic_ecg_labels_cleaned.csv".
        # The 'path' in csv suggests standard MIMIC-IV-ECG structure.
        # If the user only has the 'clean' folder with ONE csv and ONE pt, maybe they DON'T have the heavy waveforms?
        # User said: "only find corresponding subject_id and its ecg from discharge summary".
        # Maybe the ECG files are NOT in the clean folder.
        # Assumption: The user has the MIMIC waveform database mounted at a standard location, OR the 'path' leads to it.
        # I will try to use the raw path. If it fails, I will notify.
        # HOWEVER, for the sake of the script, I will assume `files/...` is valid relative to some root. 
        # I will try `/data2/2shared/yanmingke/mimic` + `rel_path`?
        # Let's try checks.
        
        probe_path = None
        # Try constructing path
        # 1. Relative to CSV dir?
        # 2. Relative to common MIMIC root?
        # Hack: Check if file exists in obvious places
        candidates_roots = [
            MIMIC_BASE_DIR, 
            '/data2/2shared/yanmingke/mimic',
            '/data2/2shared/yanmingke/mimic_iv_ecg',
            '/date2/2shared/yanmingke/mimic' # Typo check
        ]
        
        for root in candidates_roots:
             test_p = os.path.join(root, rel_path)
             if os.path.exists(os.path.splitext(test_p)[0] + ".hea"):
                 probe_path = test_p
                 break
                 
        if not probe_path:
             # If we can't find file, we can't visualize. Skip.
             print(f"Skipping {p_id}: Waveform file not found for path {rel_path}")
             continue
             
        # Metadata
        probe_diag = map_diagnosis(row.get('labels', 'Unknown'))
        probe_meta = {
            "age": "Unknown", # MIMIC usually doesn't have Age directly in this CSV? Or maybe it does.
            "gender": "Unknown",
            "time": str(row.get('final_report', 'Unknown Report'))[:100] + "..." # Use report snippet as time/desc
        }
        
        # Generate Probe JSON
        probe_details = {
            "id": p_id,
            "meta": probe_meta,
            "report": str(row.get('final_report', 'No Report')),
            "diagnosis": probe_diag,
            "isQuery": True
        }
        
        probe_signal = process_ecg_file(probe_path, probe_details, OUTPUT_CASES)
        if probe_signal is None: continue
        
        # --- Perform Retrieval ---
        probe_vec = m_embs[p_idx].reshape(1, -1)
        sims = cosine_similarity(h_embs, probe_vec).flatten()
        
        # 1. Visual Twin (Top 5)
        top_indices = np.argsort(sims)[::-1][:5]
        
        retrieved_items = []
        
        # Process Top 5
        for rank, top_idx in enumerate(top_indices):
            twin_sim = sims[top_idx]
            twin_row = h_df.iloc[top_idx]
            
            twin_path = twin_row.get('full_ecg_path')
            twin_id = str(twin_row['HashFileName'])
            twin_diag = map_diagnosis(twin_row.get('labels', ''))
            
            twin_details = {
                "id": twin_id,
                "meta": {
                    "age": int(twin_row.get('Age', 0)),
                    "gender": twin_row.get('Gender', 'U'),
                    "time": str(twin_row.get('RecordingTime', ''))
                },
                "report": str(twin_row.get('text', '')),
                "diagnosis": twin_diag,
                "isQuery": False
            }
            
            twin_signal = process_ecg_file(twin_path, twin_details, OUTPUT_CASES)
            
            if twin_signal is not None:
                 retrieved_items.append({
                     "id": twin_id,
                     "fileName": f"cases/{twin_id}.json", # Frontend expects this format
                     "medicalCategory": twin_diag[0],
                     "cleanName": twin_diag[0],
                     "diagnosis": twin_diag,
                     "report": twin_details['report'],
                     "similarity": round(float(twin_sim), 3),
                     "previewSignal": twin_signal,
                     "type": f"VisualTwin_{rank+1}"
                 })
             
        # 2. Diverse Manifestation (Brugada or High Sim Diverse)
        # Strategy: Look for "Brugada" in HEEDB text. 
        # If found, pick top matches from that subset.
        # If NOT found, pick matches with Sim ~ 0.8-0.9 to show "Similar but Diverse"
        
        # Search HEEDB for Brugada
        brugada_indices = []
        for i, h_row in h_df.iterrows():
             txt = str(h_row.get('labels', '')) + " " + str(h_row.get('text', ''))
             if 'brugada' in txt.lower():
                 brugada_indices.append(i)
                 
        start_idx = len(retrieved_items) # Marker
        
        diverse_candidates = []
        
        if len(brugada_indices) > 0:
            print(f"  Found {len(brugada_indices)} Brugada cases in HEEDB.")
            # Rank by similarity to probe
            sub_sims = sims[brugada_indices]
            sorted_sub = np.argsort(sub_sims)[::-1]
            
            # Pick top 5
            for rank_i in sorted_sub[:5]:
                real_idx = brugada_indices[rank_i]
                diverse_candidates.append((real_idx, sims[real_idx], "HEEDB Brugada"))
        else:
            # Fallback: Top matches skipped by Twin?
            # Or matches in specific range [0.85, 0.95]
            sorted_all = np.argsort(sims)[::-1]
            # Skip top 1 (Twin)
            for idx in sorted_all[1:10]:
                diverse_candidates.append((idx, sims[idx], "Diverse Sim"))
                
        # Process Diverse
        existing_ids = set([item['id'] for item in retrieved_items])
        
        for d_idx, d_sim, d_type in diverse_candidates:
             d_row = h_df.iloc[d_idx]
             d_id = str(d_row['HashFileName'])
             if d_id in existing_ids: continue # Skip if already in top 5
             
             d_diag = map_diagnosis(d_row.get('labels', ''))
             d_obj = {
                 "id": d_id,
                 "meta": {"age": int(d_row.get('Age', 0)), "gender": d_row.get('Gender', 'U'), "time": str(d_row.get('RecordingTime', ''))},
                 "report": str(d_row.get('text', '')),
                 "diagnosis": d_diag,
                 "isQuery": False
             }
             d_sig = process_ecg_file(d_row.get('full_ecg_path'), d_obj, OUTPUT_CASES)
             if d_sig is not None:
                 retrieved_items.append({
                     "id": d_id,
                     "fileName": f"cases/{d_id}.json",
                     "medicalCategory": d_diag[0],
                     "cleanName": d_diag[0],
                     "diagnosis": d_diag,
                     "report": d_obj['report'],
                     "similarity": round(float(d_sim), 3),
                     "previewSignal": d_sig,
                     "type": d_type
                 })
        
        # Save Retrieval List
        if retrieved_items:
             r_filename = f"retrieval_{p_id}.json"
             with open(os.path.join(OUTPUT_RETRIEVALS, r_filename), 'w') as f:
                 json.dump(retrieved_items, f)
                 
             # Add to Manifest
             title = "Rare Brugada Search"
             desc = "MIMIC Brugada vs HEEDB"
             
             manifest.append({
                 "id": p_id,
                 "taskType": "VisualTwins", # Using VisualTwins mode for now as it shows side-by-side
                 "description": desc,
                 "cleanName": "Brugada Syndrome",
                 "diagnosis": probe_diag,
                 "fileName": f"cases/{p_id}.json",
                 "retrievalFile": f"retrievals/{r_filename}",
                 "timestamp": "2025-12-28"
             })
             
    # Save Manifest
    man_path = os.path.join(OUTPUT_BASE, 'manifest.json')
    with open(man_path, 'w') as f:
        json.dump(manifest, f)
    print(f"\nManifest saved to {man_path}. Total Tasks: {len(manifest)}")

if __name__ == "__main__":
    main()
