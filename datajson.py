
import os
import json
import numpy as np
import pandas as pd
import torch
import wfdb
import random
import sys
from sklearn.metrics.pairwise import cosine_similarity

# === Configuration ===
# Input Paths (Server)
BASE_DIR = '/data2/2shared/yanmingke/heedb_embedding_train/final_combined/'

# If embeddings are in a different spot, adjust accordingly. 
# Based on previous script: 
# ECG_EMB_NAME = 'heedb_ecg_embeddings.pt' in BASE_DIR

TEXT_CSV_NAME = 'heedb_texts.csv'
ECG_EMB_NAME = 'heedb_ecg_embeddings.pt'
PATH_CSV_FILE = '/data2/2shared/yanmingke/heedb_embedding_final/train_processed_update.csv'

# Output Paths
OUTPUT_BASE = './System_Improved/src/data/database'
OUTPUT_CASES = os.path.join(OUTPUT_BASE, 'cases')

# Hierarchy Map Path
HIERARCHY_MAP_PATH = '/home/yanmingke/ecgfounder2/retrieval/new_dataset/type/heedb_hierarchy_map.json'


# Parameters
TARGET_QUERY_LABEL = "acute mi"  # Loose search term
TOP_K = 50
TARGET_SAMPLES = 5000
DOWNSAMPLE_RATIO = 10
DECIMAL_PLACES = 3

# Query Case Configuration
# Using a list of IDs for multi-case generation
QUERY_CASE_IDS = [
    "de_115848437_20110314222032_20110316150047", # Original
    "de_111774466_20171006105918_20171006123309",  # Another sample (from previous context)
    # Add more IDs here as needed
]

def setup_directories():
    if os.path.exists(OUTPUT_BASE):
        # We don't delete base because we might want to keep existing cases
        pass
    os.makedirs(OUTPUT_CASES, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_BASE, 'retrievals'), exist_ok=True) # New dir for retrieval lists

def load_hierarchy_map(hierarchy_path):
    """加载医学层级映射文件"""
    if not os.path.exists(hierarchy_path):
        print(f"❌ Hierarchy map not found: {hierarchy_path}")
        return {}
    
    with open(hierarchy_path, 'r') as f:
        return json.load(f)

def get_category_priority(category):
    """为医学分类分配优先级权重"""
    category_weights = {
        "Ischemia/Infarct": 100,  # 缺血梗死 - 最高优先级
        "Rhythm": 200,            # 心律异常
        "Conduction": 300,        # 传导阻滞
        "Hypertrophy": 400,       # 肥厚扩大
        "Ectopic": 500,           # 异位搏动
        "Other": 600,             # 其他异常
        "Global": 900,            # 全局描述 (如 Abnormal ECG) - 低优先级
        "Uncategorized": 2000     # 未分类/非特异性 - 最低优先级 (即使是 Level 3 也会被明确 Level 2 覆盖)
    }
    return category_weights.get(category, 2000)

def get_medical_priority(diagnosis_list, hierarchy_map):
    """
    基于现有层级映射计算医学优先级
    直接使用 heedb_hierarchy_map.json 中的 level, category, group_id
    """
    if not diagnosis_list:
        return 3, "Uncategorized", "unknown", "Unknown", 3800  # 默认最低优先级
    
    # 找到最高优先级的诊断（Level 1 > Level 2 > Level 3）
    best_priority = float('inf')
    best_info = None
    
    for diagnosis in diagnosis_list:
        # 尝试匹配层级映射
        diagnosis_key = diagnosis.lower().strip()
        
        if diagnosis_key in hierarchy_map:
            info = hierarchy_map[diagnosis_key]
            level = info['level']
            category = info['category']
            group_id = info['group_id']
            clean_name = info['clean_name']
            
            # 计算优先级分数（数字越小优先级越高）
            # 新公式：(4 - level) * 1000 + weight
            # Level 3 (Specific) -> 1000 + weight
            # Level 2 (Category) -> 2000 + weight
            # Level 1 (Global)   -> 3000 + weight
            priority_score = (4 - level) * 1000 + get_category_priority(category)
            
            if priority_score < best_priority:
                best_priority = priority_score
                best_info = (level, category, group_id, clean_name, priority_score)
    
    return best_info if best_info else (3, "Uncategorized", "unknown", "Unknown", 5000)


def map_diagnosis(original_text):
    """
    Parse diagnosis string into a clean list of tags.
    Supports:
    - Lists: "['tag1', 'tag2']"
    - Pipe-separated: "tag1|tag2"
    - Comma-separated: "tag1, tag2"
    Returns cleaned tags for medical priority calculation.
    """
    original_text = str(original_text).strip()
    
    # 1. Parsing
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

    # 2. Cleaning & Normalization
    final_tags = []
    for t in raw_tags:
        clean_t = t.strip().strip("'").strip('"')
        
        if not clean_t or clean_t.lower() == 'nan':
            continue
            
        # Keep original cleaned tag for hierarchy map matching
        if clean_t not in final_tags:
            final_tags.append(clean_t)
            
    if not final_tags:
        return ["Unclassified"]
        
    return final_tags

def load_data():
    print("1. Loading Embeddings and Metadata...")
    
    # 1. Load CSV (Base Metadata)
    csv_path = os.path.join(BASE_DIR, TEXT_CSV_NAME)
    if not os.path.exists(csv_path):
        print(f"❌ Metadata CSV not found: {csv_path}")
        return None, None
        
    df = pd.read_csv(csv_path)
    # 记录原始长度，用于后续校验
    original_len = len(df)
    df['original_index'] = df.index
    
    # 2. Load Embeddings
    emb_path = os.path.join(BASE_DIR, ECG_EMB_NAME)
    if not os.path.exists(emb_path):
        print(f"❌ Embedding file not found: {emb_path}")
        return None, None
        
    ecg_embs = torch.load(emb_path, map_location='cpu')
    ecg_embs = torch.nn.functional.normalize(ecg_embs, p=2, dim=1).numpy()
    
    # 校验：向量数量必须等于元数据行数
    if len(ecg_embs) != original_len:
        print(f"⚠️ Warning: Embedding count ({len(ecg_embs)}) != CSV row count ({original_len})")
        # 如果长度不一致，后续索引必错，建议在此处直接报错停止
        # return None, None 

    # 3. Load Paths (FIXED: Use Mapping instead of Merge)
    if os.path.exists(PATH_CSV_FILE):
        print("   Loading path mapping...")
        df_paths = pd.read_csv(PATH_CSV_FILE)
        
        # 核心修复步骤：
        # 1. 去重：确保每个 HashFileName 只对应一个路径 (随机取第一个)
        # 2. 转换为字典：{ 'file_id_1': '/path/to/1', ... }
        path_map = df_paths.drop_duplicates(subset=['HashFileName']).set_index('HashFileName')['full_ecg_path'].to_dict()
        
        # 3. 使用 map 映射：这绝对不会改变 df 的行数或顺序
        df['full_ecg_path'] = df['HashFileName'].map(path_map)
        
        # 校验修复结果
        if len(df) != original_len:
            print(f"❌ Critical Error: DataFrame length changed after path mapping! {original_len} -> {len(df)}")
            return None, None
    else:
        print(f"⚠️ Path CSV not found: {PATH_CSV_FILE}")
    
    return df, ecg_embs

def process_single_case(row, score, input_dir_fallback, hierarchy_map, query_case_id):
    """
    Read WFDB and return (index_item, detail_json)
    """
    try:
        # Determine path
        record_path = None
        if 'full_ecg_path' in row and pd.notna(row['full_ecg_path']):
            # Usually full_ecg_path points to .mat or .dat, strip extension for wfdb
            p = str(row['full_ecg_path'])
            # Remove extension if present
            base = os.path.splitext(p)[0]
            if os.path.exists(base + ".hea"):
                record_path = base
        
        # Fallback search if path invalid
        if not record_path:
             # Try searching in fallback dir (if defined)
             pass
             
        if not record_path or not os.path.exists(record_path + ".hea"):
            # print(f"File not found for {row['HashFileName']}")
            return None

        # Read WFDB
        record = wfdb.rdrecord(record_path, sampto=TARGET_SAMPLES)
        signals = np.nan_to_num(record.p_signal)
        
        # Crop/Pad
        if signals.shape[0] < TARGET_SAMPLES:
            # Pad
            pad_len = TARGET_SAMPLES - signals.shape[0]
            signals = np.pad(signals, ((0, pad_len), (0, 0)))
        elif signals.shape[0] > TARGET_SAMPLES:
            signals = signals[:TARGET_SAMPLES, :]
            
        # Metadata
        original_diag = str(row.get('labels', 'Unknown'))
        diagnosis_tags = map_diagnosis(original_diag)
        report_text = str(row.get('text', 'No report available.'))
        
        # Demographics
        age = row.get('Age', np.nan) 
        if pd.isna(age): age = random.randint(40, 90)
        else: age = int(age)
        
        gender = row.get('Gender', 'Unknown')
        if pd.isna(gender) or str(gender).lower() == 'nan': gender = random.choice(['Male', 'Female'])
        
        demographics_str = f"{gender}, {age} yr"
        
        # Medical Priority (using hierarchy map)
        level, category, group_id, clean_name, priority_score = get_medical_priority(diagnosis_tags, hierarchy_map)
        
        # Check if this is the query case
        is_query_case = str(row['HashFileName']) == str(query_case_id)
        
        # Leads Data
        leads_data = {}
        lead_names = record.sig_name
        for i, lead in enumerate(lead_names):
             leads_data[lead] = [round(float(x), DECIMAL_PLACES) for x in signals[:, i]]
             
        # ID
        file_id = str(row['HashFileName'])
        
        # Detail Object
        detail_obj = {
            "id": file_id,
            "meta": {
                "age": age,
                "gender": gender,
                "time": str(row.get('RecordingTime') or row.get('AcquisitionDate') or row.get('date_time') or row.get('time') or row.get('Date') or "Unknown")
            },
            "report": report_text,
            "samplingRate": record.fs,
            "leads": leads_data,
            "diagnosis": diagnosis_tags,
            "medicalCategory": category,
            "medicalGroup": group_id,
            "cleanName": clean_name
        }
        
        # Save Detail
        json_name = f"{file_id}.json"
        with open(os.path.join(OUTPUT_CASES, json_name), 'w') as f:
            json.dump(detail_obj, f)
            
        # Index Item
        # Preview: Lead I
        lead_i_key = 'I' if 'I' in leads_data else list(leads_data.keys())[0]
        preview = leads_data[lead_i_key][::DOWNSAMPLE_RATIO]
        
        index_item = {
            "id": file_id,
            "fileName": f"cases/{json_name}",
            "medicalPriority": priority_score,     # 医学优先级分数
            "medicalLevel": level,                 # 医学层级 (1-3)
            "medicalCategory": category,            # 医学分类
            "medicalGroup": group_id,              # 医学分组
            "cleanName": clean_name,               # 标准化名称
            "isQueryCase": is_query_case,      # 新增：查询病例标识
            "diagnosis": diagnosis_tags,           # 诊断标签列表
            "report": report_text,                 # 报告文本
            "demographics": demographics_str,      # 人口统计信息
            "similarity": round(float(score), 2),  # 相似度分数
            "previewSignal": preview               # 预览信号
        }
        
        return index_item
        
    except Exception as e:
        print(f"❌ Error processing {row.get('HashFileName')}: {e}")
        print(f"   Path: {row.get('full_ecg_path', 'N/A')}")
        return None

def run_retrieval_for_case(case_id, df, ecg_embs, hierarchy_map):
    """
    Process a single query case ID: find similar cases, generate JSONs, return summary info.
    """
    # 2. Select Query Case
    query_row = df[df['HashFileName'] == case_id]
    if len(query_row) == 0:
        print(f"❌ Query case {case_id} not found. Skipping.")
        return None
    
    query_row = query_row.iloc[0]
    query_idx = query_row['original_index']
    query_id = query_row['HashFileName']
    
    print(f"\n--- Processing Query Case: {query_id} ---")
    
    # 3. Get Query Case Medical Info
    query_diagnosis_tags = map_diagnosis(str(query_row.get('labels', 'Unknown')))
    query_level, query_category, query_group_id, query_clean_name, query_priority = get_medical_priority(query_diagnosis_tags, hierarchy_map)
    
    # Ensure Query Case Detail JSON exists (important for Monitor!)
    # We pass score=1.0 for self
    query_detail_item = process_single_case(query_row, 1.0, None, hierarchy_map, query_id)
    if not query_detail_item:
        print(f"❌ Failed to generate detail for query case {query_id}")
        return None

    # 4. Retrieve Similar Cases
    query_vec = ecg_embs[query_idx].reshape(1, -1)
    sim_scores = cosine_similarity(ecg_embs, query_vec).flatten()
    
    # --- FILTERING LOGIC ---
    def get_pid(filename):
        parts = str(filename).split('_')
        if len(parts) >= 2:
            return parts[1]
        return filename 

    query_pid = get_pid(query_id)
    
    # Apply Mask
    for i, fname in enumerate(df['HashFileName']):
        pid = get_pid(fname)
        # Exclude same patient (unless it is exactly the query case itself, which we keep for reference)
        if pid == query_pid and str(fname) != str(query_id):
            sim_scores[i] = -1.0 # Demote

    # Get Top K indices
    top_indices = np.argsort(sim_scores)[-TOP_K:][::-1]
    
    # 5. Generate Retrieval List
    retrieval_list = []
    
    for rank, idx in enumerate(top_indices):
        score = sim_scores[idx]
        row = df.iloc[idx]
        
        # Only process valid scores (skip the -1.0 ones if Top K reached them)
        if score < 0: continue

        # Only process valid scores (skip the -1.0 ones if Top K reached them)
        if score < 0: continue

        item = process_single_case(row, score, None, hierarchy_map, query_id)
        if item:
            retrieval_list.append(item)
            
    # 6. Save Retrieval Result using query ID
    output_filename = f"retrieval_{query_id}.json"
    output_path = os.path.join(OUTPUT_BASE, 'retrievals', output_filename)
    with open(output_path, 'w') as f:
        json.dump(retrieval_list, f)
        
    print(f"✅ Generated retrieval list: {output_filename} ({len(retrieval_list)} items)")
    
    # Return Manifest Info
    return {
        "id": query_id,
        "cleanName": query_clean_name,
        "diagnosis": query_diagnosis_tags,
        "fileName": f"cases/{query_id}.json", # Path to detail
        "retrievalFile": f"retrievals/{output_filename}", # Path to list
        "timestamp": str(query_row.get('RecordingTime') or query_row.get('date_time') or "Unknown")
    }

def main():
    print("--- Generating Multi-Patient Demo Dataset (v3.0) ---")
    setup_directories()
    
    # 0. Load Hierarchy Map
    print("0. Loading Medical Hierarchy Map...")
    hierarchy_map = load_hierarchy_map(HIERARCHY_MAP_PATH)
    if not hierarchy_map: return
    
    # 1. Load Data
    df, ecg_embs = load_data()
    if df is None: return
    
    manifest = []
    
    # 2. Iterate Query Cases
    # If list is empty, maybe define a default one or random?
    target_ids = QUERY_CASE_IDS
    if not target_ids:
        print("⚠️ No query IDs defined. using random fallback?")
        # Logic to pick random available here if needed, but for now we assume IDs are provided
        pass

    for qid in target_ids:
        info = run_retrieval_for_case(qid, df, ecg_embs, hierarchy_map)
        if info:
            manifest.append(info)
            
    # 3. Save Manifest
    manifest_path = os.path.join(OUTPUT_BASE, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f)
        
    print(f"\n🎉 All Done. Manifest saved to {manifest_path} with {len(manifest)} patients.")


if __name__ == "__main__":
    main()

