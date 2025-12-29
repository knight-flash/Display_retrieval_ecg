
import json
import os

# --- EMBEDDED LOGIC FROM DATAJSON.PY (MODIFIED) ---

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
        return 3, "Uncategorized", "unknown", "Unknown", 5000  # 默认最低优先级
    
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
            priority_score = (4 - level) * 1000 + get_category_priority(category)
            
            if priority_score < best_priority:
                best_priority = priority_score
                best_info = (level, category, group_id, clean_name, priority_score)
    
    return best_info if best_info else (3, "Uncategorized", "unknown", "Unknown", 5000)

# --- END EMBEDDED LOGIC ---

# 1. Load Hierarchy Map
map_path = r"c:\Users\knightlyflash\Desktop\博士\clip\recommendation\heedb_hierarchy_map.json"
if not os.path.exists(map_path):
    print(f"Error: Map not found at {map_path}")
    exit(1)

with open(map_path, 'r') as f:
    hierarchy_map = json.load(f)

# 2. Test Cases
test_cases = [
    {
        "name": "User Reported Case",
        "diagnosis": ["with rapid ventricular response", "atrial fibrillation", "nonspecific t wave abnormality", "abnormal ecg"],
    },
    {
        "name": "Normal Case",
        "diagnosis": ["normal sinus rhythm", "normal ecg"],
    },
    {
        "name": "MI vs Tachycardia",
        "diagnosis": ["sinus tachycardia", "acute mi"],
    }
]

print("--- Verification Start ---\n")

for case in test_cases:
    print(f"Testing: {case['name']}")
    print(f"  Tags: {case['diagnosis']}")
    
    result = get_medical_priority(case['diagnosis'], hierarchy_map)
    level, category, group_id, clean_name, priority = result
    
    print(f"  -> Result: {clean_name}")
    print(f"  -> Info: Level={level}, Cat={category}, Group={group_id}, Score={priority}")
    
    # Check
    if clean_name == "abnormal ecg" and "atrial fibrillation" in case['diagnosis']:
        print("  ❌ FAIL: Still selecting 'Abnormal ECG'")
    elif clean_name == "atrial fibrillation" and "atrial fibrillation" in case['diagnosis']:
        print("  ✅ PASS: Selected Atrial Fibrillation")
    else:
        print(f"  ℹ️  Selected: {clean_name}")
    print("-" * 30)

print("\n--- Verification End ---")
