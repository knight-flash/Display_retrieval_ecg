import pandas as pd
import os

# Configuration
MIMIC_META_CSV = '/data2/2shared/yanmingke/mimic/brugada/clean/mimic_ecg_labels_cleaned.csv'

TARGET_SUBJECT_IDS = [
    10568395, 11751957, 11899066, 12149753, 12213737, 
    12433362, 13733689, 14580383, 14991275, 19039321, 19188032
]

def main():
    print(f"Checking IDs in: {MIMIC_META_CSV}")
    
    if not os.path.exists(MIMIC_META_CSV):
        print("ERROR: File not found!")
        return
        
    df = pd.read_csv(MIMIC_META_CSV)
    print(f"Total Rows in CSV: {len(df)}")
    print(f"Columns: {df.columns.tolist()}")
    
    if 'subject_id' not in df.columns:
        print("ERROR: 'subject_id' column not found.")
        return
        
    # Ensure string comparison
    df['subject_id'] = df['subject_id'].astype(str)
    target_strs = set([str(x) for x in TARGET_SUBJECT_IDS])
    
    # 1. Check Intersection
    found_mask = df['subject_id'].isin(target_strs)
    found_rows = df[found_mask]
    
    unique_found_ids = found_rows['subject_id'].unique()
    
    print("\n=== Search Results ===")
    print(f"Target IDs Count: {len(target_strs)}")
    print(f"Found Unique IDs: {len(unique_found_ids)}")
    print(f"Total Matching ECG Records: {len(found_rows)}")
    
    # 2. Check Brugada Label
    brugada_rows = df[df['brugada_label'].astype(str) == '1']
    print(f"\nTotal Records with brugada_label=1: {len(brugada_rows)}")
    
    # 3. Missing IDs
    missing = target_strs - set(unique_found_ids)
    if missing:
        print(f"\n[MISSING IDs] ({len(missing)}):")
        for m in missing:
            print(f" - {m}")
    else:
        print("\nAll Target IDs found present in CSV.")
        
    # 4. Detail for Found IDs
    print("\n[FOUND Detail]")
    for sid in unique_found_ids:
        count = len(found_rows[found_rows['subject_id'] == sid])
        print(f" - {sid}: {count} records")

if __name__ == "__main__":
    main()
