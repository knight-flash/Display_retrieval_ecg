import os
import json
import numpy as np
import pandas as pd
import torch
import wfdb
import random
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm

# Import useful functions from sibling script if possible, or redefine to be safe
# Re-defining to avoid import issues with relative paths/modules
def map_diagnosis(original_text):
    original_text = str(original_text).strip()
    raw_tags = []
    if original_text.startswith('[') and original_text.endswith(']'):
        try:
            import ast
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

# === Configuration ===
BASE_DIR = '/data2/2shared/yanmingke/heedb_clean_ecg/train'
TEXT_CSV_NAME = 'heedb_texts_filtered_95.csv'
ECG_EMB_NAME = 'heedb_ecg_embeddings_filtered_95.pt'
PATH_CSV_FILE = '/data2/2shared/yanmingke/heedb_embedding_final/train_processed_update.csv'

# Output for SameD_DiffE App
OUTPUT_BASE = 'database1'
OUTPUT_CASES = os.path.join(OUTPUT_BASE, 'cases')
OUTPUT_RETRIEVALS = os.path.join(OUTPUT_BASE, 'retrievals')

# TARGET_SAMPLES removed as per user request to read full file
DOWNSAMPLE_RATIO = 2 # Updated by user manually
DECIMAL_PLACES = 3

# === Search Target Configuration (USER EDIT HERE) ===
# 1. Targets for Visual Twins
# Finds twins for cases matching these combinations.
TWIN_SEARCH_GROUPS = [
    # ['sinus rhythm'],
    # ['left bundle branch block']
    ['atrial fibrillation', 'right bundle branch block'] 
]

# 2. Targets for Same Disease Diverse Manifestation
# Finds diverse appearances for cases matching these combinations.
DIVERSE_SEARCH_GROUPS = [
    # ['low voltage qrs'], 
    # ['atrial fibrillation'],
    # ['sinus bradycardia']
    # Example of combination: 
    ['atrial fibrillation', 'right bundle branch block'] 
]
# ====================================================

def setup_directories():
    os.makedirs(OUTPUT_CASES, exist_ok=True)
    os.makedirs(OUTPUT_RETRIEVALS, exist_ok=True)

def load_data():
    print("Loading Metadata and Embeddings...")
    csv_path = os.path.join(BASE_DIR, TEXT_CSV_NAME)
    if not os.path.exists(csv_path):
        print(f"Metadata CSV not found: {csv_path}")
        return None, None
    df = pd.read_csv(csv_path)
    df['original_index'] = df.index
    
    emb_path = os.path.join(BASE_DIR, ECG_EMB_NAME)
    if not os.path.exists(emb_path):
        print(f"Embedding file not found: {emb_path}")
        return None, None
    ecg_embs = torch.load(emb_path, map_location='cpu')
    ecg_embs = torch.nn.functional.normalize(ecg_embs, p=2, dim=1).numpy()
    
    if os.path.exists(PATH_CSV_FILE):
        print("Loading path mapping...")
        df_paths = pd.read_csv(PATH_CSV_FILE)
        path_map = df_paths.drop_duplicates(subset=['HashFileName']).set_index('HashFileName')['full_ecg_path'].to_dict()
        df['full_ecg_path'] = df['HashFileName'].map(path_map)
    
    return df, ecg_embs

def process_single_case_json(row, score, output_dir=OUTPUT_CASES):
    """Generates the case detail JSON"""
    try:
        # Resolve Path
        record_path = None
        if 'full_ecg_path' in row and pd.notna(row['full_ecg_path']):
            base = os.path.splitext(str(row['full_ecg_path']))[0]
            if os.path.exists(base + ".hea"):
                record_path = base
        
        if not record_path: return None

        # Read signal - Full read, no sampto limit
        record = wfdb.rdrecord(record_path)
        signals = np.nan_to_num(record.p_signal)
        
        # No padding/truncation logic here anymore, utilizing full signal.
            
        diagnosis_tags = map_diagnosis(row.get('labels', 'Unknown'))
        
        leads_data = {}
        for i, lead in enumerate(record.sig_name):
             leads_data[lead] = [round(float(x), DECIMAL_PLACES) for x in signals[:, i]]
             
        file_id = str(row['HashFileName'])
        
        detail_obj = {
            "id": file_id,
            "meta": {
                "age": int(row.get('Age', 0)) if pd.notna(row.get('Age')) else 60,
                "gender": row.get('Gender', 'Unknown'),
                "time": str(row.get('RecordingTime') or "Unknown")
            },
            "report": str(row.get('text', 'No report')),
            "samplingRate": record.fs,
            "leads": leads_data,
            "diagnosis": diagnosis_tags,
            "medicalCategory": diagnosis_tags[0] if diagnosis_tags else "Uncategorized",
            "cleanName": diagnosis_tags[0] if diagnosis_tags else "Unknown Case",
            "isQueryCase": False 
        }
        
        with open(os.path.join(output_dir, f"{file_id}.json"), 'w') as f:
            json.dump(detail_obj, f)
            
        # Retrieval Item Summary
        lead_i_key = 'I' if 'I' in leads_data else list(leads_data.keys())[0]
        preview = leads_data[lead_i_key][::DOWNSAMPLE_RATIO]
        
        return {
            "id": file_id,
            "fileName": f"cases/{file_id}.json",
            "medicalCategory": diagnosis_tags[0] if diagnosis_tags else "Uncategorized",
            "cleanName": diagnosis_tags[0] if diagnosis_tags else "Unknown Case",
            "diagnosis": diagnosis_tags,
            "report": str(row.get('text', 'No report')),
            "similarity": round(float(score), 3),
            "previewSignal": preview
        }
    except Exception as e:
        print(f"Error processing {row.get('HashFileName')}: {e}")
        return None

def check_tags_match(tags_set, required_tags):
    """Helper: match if all required tags are present in tags_set"""
    req_set = set([t.lower().strip() for t in required_tags])
    case_set = set([t.lower().strip() for t in tags_set])
    return req_set.issubset(case_set)

def get_patient_id(filename):
    """
    Extracts patient ID from filename format: de_PATIENTID_TimeCode_TimeCode
    Returns PATIENTID or full filename if format doesn't match.
    """
    try:
        parts = str(filename).split('_')
        if len(parts) >= 2 and parts[0] == 'de':
            return parts[1]
    except:
        pass
    return str(filename)

def find_visual_twins(df, embs, initial_max_overlap=1, target_groups=None):
    """
    Finds visual twins using 1xN Search Strategy with Dynamic Relaxation.
    """
    print(f"\n--- Finding Visual Twins (1xN Search with Dynamic Relax) ---")
    
    N = len(df)
    
    # Pre-process tags
    print("Pre-processing tags...")
    all_diag_sets = []
    for i in range(len(df)):
        all_diag_sets.append(set(map_diagnosis(df.iloc[i].get('labels', ''))))

    # 1. Select Source Candidates (Probe Pool)
    probe_indices = []
    if target_groups:
        print(f"Filtering probe candidates by {len(target_groups)} target groups...")
        for group in target_groups:
            for i, tags in enumerate(all_diag_sets):
                if check_tags_match(tags, group):
                    probe_indices.append(i)
        probe_indices = list(set(probe_indices))
        print(f"  Found {len(probe_indices)} distinct probe candidates.")
    else:
        probe_indices = list(range(N))
        
    if not probe_indices:
        print("No probe candidates found.")
        return []

    # 2. Pick Probes
    num_probes = 10
    if len(probe_indices) > num_probes:
        selected_probes = np.random.choice(probe_indices, num_probes, replace=False)
    else:
        selected_probes = probe_indices
        
    print(f"Selected {len(selected_probes)} probes for exhaustive 1xN search.")
    
    pairs = []
    
    # 3. 1xN Search Loop
    for probe_idx in selected_probes:
        probe_row = df.iloc[probe_idx]
        probe_id = get_patient_id(probe_row['HashFileName'])
        probe_vec = embs[probe_idx].reshape(1, -1)
        probe_diag = all_diag_sets[probe_idx]
        
        # Calculate Sim vs ALL
        sims = cosine_similarity(embs, probe_vec).flatten()
        
        # Look at top matches
        top_indices = np.argsort(sims)[::-1][:50]
        
        found_visual_twin = False
        
        # Try Relaxing Overlap Criteria
        max_overlap_limit = 5 
        
        found_pair = None
        fallback_identical = None
        
        # Collect candidates
        candidates = []
        for idx in top_indices:
            if idx == probe_idx: continue
            
            # FILER: Same Patient Check
            cand_row = df.iloc[idx]
            cand_id = get_patient_id(cand_row['HashFileName'])
            if cand_id == probe_id: continue

            if sims[idx] <= 0.95: break 
            
            cand_diag = all_diag_sets[idx]
            overlap = len(probe_diag.intersection(cand_diag))
            is_different = (probe_diag != cand_diag)
            
            cand = {
                'idx': idx,
                'sim': sims[idx],
                'overlap': overlap,
                'is_different': is_different
            }
            candidates.append(cand)
            
            if not is_different and fallback_identical is None:
                fallback_identical = cand

        # Iterate increasing allowed overlap
        for allowed_ov in range(initial_max_overlap, max_overlap_limit + 1):
            for cand in candidates:
                if cand['is_different'] and cand['overlap'] <= allowed_ov:
                    found_pair = cand
                    print(f"  MATCH Found! Sim: {cand['sim']:.4f} | Overlap: {cand['overlap']}")
                    break
            if found_pair: break
            
        if not found_pair:
            if fallback_identical:
                 print(f"  NO Contrast Found. Fallback to Identical Diagnosis. Sim: {fallback_identical['sim']:.4f}")
                 found_pair = fallback_identical
        
        if found_pair:
            cand_idx = found_pair['idx']
            pair = {
                'score': float(found_pair['sim']),
                'case1': probe_row,
                'case2': df.iloc[cand_idx],
                'diag1': list(probe_diag),
                'diag2': list(all_diag_sets[cand_idx])
            }
            pairs.append(pair)
            
        if len(pairs) >= 5: break

    print(f"Total pairs found: {len(pairs)}")
    return pairs

def find_same_disease_diverse(df, embs, target_groups=None, exact_match=True):
    print(f"\n--- Finding Diverse Manifestations ---")
    print(f"Exact Match: {exact_match}")
    
    if not target_groups:
        target_groups = [['acute mi'], ['atrial fibrillation'], ['nsr']]
    
    results = []
    
    print("Pre-processing tags...")
    all_diag_sets = []
    for i in range(len(df)):
        all_diag_sets.append(set(map_diagnosis(df.iloc[i].get('labels', ''))))
    
    for group in target_groups:
        group_str = " + ".join(group)
        print(f"Processing Target Group: [{group_str}]")
        
        candidates = []
        for i, tags in enumerate(all_diag_sets):
            if check_tags_match(tags, group):
                candidates.append(i)
        
        if len(candidates) < 10:
            print(f"  Not enough candidates ({len(candidates)})")
            continue
            
        found_group = False
        random.shuffle(candidates)
        
        for core_idx in candidates[:30]:
            core_row = df.iloc[core_idx]
            core_id = get_patient_id(core_row['HashFileName'])
            
            core_vec = embs[core_idx].reshape(1, -1)
            core_tags = all_diag_sets[core_idx]
            
            group_indices = []
            
            if exact_match:
                for idx in candidates:
                    if idx == core_idx: continue
                    # FILER: Same Patient Check
                    cand_row = df.iloc[idx]
                    cand_id = get_patient_id(cand_row['HashFileName'])
                    if cand_id == core_id: continue
                    
                    if all_diag_sets[idx] == core_tags: 
                        group_indices.append(idx)
            else:
                for idx in candidates:
                    if idx == core_idx: continue
                    # FILER: Same Patient Check
                    cand_row = df.iloc[idx]
                    cand_id = get_patient_id(cand_row['HashFileName'])
                    if cand_id == core_id: continue
                    
                    group_indices.append(idx)
                    
            if len(group_indices) < 5: continue
            
            group_embs = embs[group_indices]
            sims = cosine_similarity(group_embs, core_vec).flatten()
            
            sorted_args = np.argsort(sims)
            
            valid_diverse = []
            for arg in sorted_args:
                sim = sims[arg]
                if sim < 0.75: 
                    real_idx = group_indices[arg]
                    valid_diverse.append((real_idx, sim))
                    if len(valid_diverse) >= 5: break
            
            if len(valid_diverse) >= 3:
                results.append({
                    'disease': group_str,
                    'core_idx': core_idx,
                    'diverse_cases': valid_diverse,
                    'common_tags': list(core_tags)
                })
                found_group = True
                break
        
        if not found_group:
            print(f"  Could not find diverse group for [{group_str}]")
            
    return results

def main():
    setup_directories()
    df, embs = load_data()
    if df is None: return

    manifest = []
    
    # 1. Visual Twins
    twins = find_visual_twins(df, embs, initial_max_overlap=1, target_groups=TWIN_SEARCH_GROUPS)
    for i, twin in enumerate(twins):
        print(f"Twin Pair {i}: {twin['diag1']} vs {twin['diag2']} (Score: {twin['score']:.4f})")
        
        score = twin['score']
        item1 = process_single_case_json(twin['case1'], 1.0)
        item2 = process_single_case_json(twin['case2'], score)
        
        if item1 and item2:
            retrieval_list = [item2]
            r_name = f"retrieval_{item1['id']}.json"
            with open(os.path.join(OUTPUT_RETRIEVALS, r_name), 'w') as f:
                json.dump(retrieval_list, f)
            
            is_twin = (set(twin['diag1']) != set(twin['diag2']))
            task_desc = "Visual Twins" if is_twin else "High Fidelity Match"
            
            desc_name = str(twin['diag1'][0]).title()
            
            manifest_item = {
                "id": item1['id'],
                "taskType": "VisualTwins",
                "description": f"{task_desc}",
                "cleanName": desc_name,
                "diagnosis": twin['diag1'],
                "fileName": item1['fileName'],
                "retrievalFile": f"retrievals/{r_name}",
                "timestamp": item1['report']
            }
            manifest.append(manifest_item)
            
    # 2. Diverse Manifestations
    diverse_groups = find_same_disease_diverse(
        df, 
        embs, 
        target_groups=DIVERSE_SEARCH_GROUPS, 
        exact_match=True 
    )
    
    for grp in diverse_groups:
        disease = grp['disease']
        core_idx = grp['core_idx']
        core_row = df.iloc[core_idx]
        
        print(f"Diverse Group: {disease} (Core ID: {core_row['HashFileName']})")
        
        core_item = process_single_case_json(core_row, 1.0)
        if not core_item: continue
        
        retrieval_list = []
        for div_idx, sim in grp['diverse_cases']:
            div_row = df.iloc[div_idx]
            div_item = process_single_case_json(div_row, sim)
            if div_item:
                retrieval_list.append(div_item)
                
        if retrieval_list:
            r_name = f"retrieval_{core_item['id']}.json"
            with open(os.path.join(OUTPUT_RETRIEVALS, r_name), 'w') as f:
                json.dump(retrieval_list, f)
            
            nice_diagnosis = grp.get('common_tags', core_item['diagnosis'])
            nice_name = disease.title() # The group string "A + B"
                
            manifest_item = {
                "id": core_item['id'],
                "taskType": "SameD_DiffE",
                "description": f"Diverse: {nice_name}",
                "cleanName": nice_name,
                 "diagnosis": nice_diagnosis,
                "fileName": core_item['fileName'],
                "retrievalFile": f"retrievals/{r_name}",
                "timestamp": core_item['report']
            }
            manifest.append(manifest_item)

    # Save Manifest
    man_path = os.path.join(OUTPUT_BASE, 'manifest.json')
    with open(man_path, 'w') as f:
        json.dump(manifest, f)
    print(f"Saved manifest to {man_path} with {len(manifest)} tasks.")

if __name__ == "__main__":
    main()
