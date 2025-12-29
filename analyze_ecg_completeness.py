#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析ECG完整性分布 - 每5%区间的统计
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
from collections import defaultdict

def analyze_ecg_completeness(csv_file_path):
    """
    分析ECG完整性分布，按5%区间统计
    
    Args:
        csv_file_path (str): CSV文件路径
    """
    print(f"正在读取文件: {csv_file_path}")
    
    # 读取CSV文件
    try:
        df = pd.read_csv(csv_file_path)
        print(f"成功读取文件，共 {len(df)} 条记录")
    except Exception as e:
        print(f"读取文件失败: {e}")
        return
    
    # 检查必要的列是否存在
    if 'completeness_ratio' not in df.columns:
        print("错误: 文件中未找到 'completeness_ratio' 列")
        print(f"可用列: {list(df.columns)}")
        return
    
    # 提取完整性比率
    completeness_ratios = df['completeness_ratio'].dropna()
    
    # 基本统计信息
    print(f"\n=== 基本统计信息 ===")
    print(f"总文件数: {len(completeness_ratios)}")
    print(f"平均完整性: {completeness_ratios.mean():.4f} ({completeness_ratios.mean()*100:.2f}%)")
    print(f"中位数完整性: {completeness_ratios.median():.4f} ({completeness_ratios.median()*100:.2f}%)")
    print(f"最小完整性: {completeness_ratios.min():.4f} ({completeness_ratios.min()*100:.2f}%)")
    print(f"最大完整性: {completeness_ratios.max():.4f} ({completeness_ratios.max()*100:.2f}%)")
    print(f"标准差: {completeness_ratios.std():.4f}")
    
    # 创建5%区间
    print(f"\n=== 每5%区间分布 ===")
    
    # 创建区间边界 (0-0.05, 0.05-0.10, ..., 0.95-1.0)
    intervals = []
    interval_counts = defaultdict(int)
    
    for i in range(0, 20):  # 0% 到 100%，每5%一个区间
        lower = i * 0.05
        upper = (i + 1) * 0.05
        interval_label = f"{lower*100:.0f}%-{upper*100:.0f}%"
        intervals.append((lower, upper, interval_label))
    
    # 统计每个区间的数量
    for ratio in completeness_ratios:
        for lower, upper, label in intervals:
            if lower <= ratio < upper:
                interval_counts[label] += 1
                break
    
    # 输出统计结果
    total_count = len(completeness_ratios)
    for lower, upper, label in intervals:
        count = interval_counts[label]
        percentage = (count / total_count) * 100 if total_count > 0 else 0
        print(f"{label:>8}: {count:>6} 个文件 ({percentage:>5.1f}%)")
    
    # 找出完整性最低和最高的文件
    print(f"\n=== 极值分析 ===")
    min_idx = completeness_ratios.idxmin()
    max_idx = completeness_ratios.idxmax()
    
    print(f"完整性最低的文件:")
    print(f"  文件名: {df.loc[min_idx, 'HashFileName']}")
    print(f"  完整性: {completeness_ratios.min():.4f} ({completeness_ratios.min()*100:.2f}%)")
    print(f"  路径: {df.loc[min_idx, 'full_ecg_path']}")
    
    print(f"\n完整性最高的文件:")
    print(f"  文件名: {df.loc[max_idx, 'HashFileName']}")
    print(f"  完整性: {completeness_ratios.max():.4f} ({completeness_ratios.max()*100:.2f}%)")
    print(f"  路径: {df.loc[max_idx, 'full_ecg_path']}")
    
    # 累积分布
    print(f"\n=== 累积分布 ===")
    sorted_ratios = np.sort(completeness_ratios)
    cumulative_points = [0.25, 0.5, 0.75, 0.9, 0.95]
    
    for point in cumulative_points:
        idx = int(point * len(sorted_ratios))
        ratio_at_point = sorted_ratios[min(idx, len(sorted_ratios)-1)]
        print(f"{point*100:>3.0f}% 的文件完整性 ≤: {ratio_at_point:.4f} ({ratio_at_point*100:.2f}%)")
    
    return {
        'total_files': total_count,
        'mean_completeness': completeness_ratios.mean(),
        'median_completeness': completeness_ratios.median(),
        'interval_counts': dict(interval_counts),
        'df': df
    }

def create_visualization(stats, output_dir='.'):
    """
    创建可视化图表
    
    Args:
        stats (dict): 统计结果
        output_dir (str): 输出目录
    """
    try:
        import matplotlib.pyplot as plt
        plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False
        
        # 准备数据
        intervals = []
        counts = []
        
        for i in range(0, 20):
            lower = i * 0.05
            upper = (i + 1) * 0.05
            label = f"{lower*100:.0f}-{upper*100:.0f}%"
            intervals.append(label)
            counts.append(stats['interval_counts'].get(label, 0))
        
        # 创建柱状图
        plt.figure(figsize=(15, 8))
        bars = plt.bar(intervals, counts, color='skyblue', edgecolor='navy', alpha=0.7)
        
        # 添加数值标签
        for bar, count in zip(bars, counts):
            if count > 0:
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5, 
                        str(count), ha='center', va='bottom', fontsize=8)
        
        plt.title('ECG完整性分布 (每5%区间)', fontsize=16, fontweight='bold')
        plt.xlabel('完整性区间', fontsize=12)
        plt.ylabel('文件数量', fontsize=12)
        plt.xticks(rotation=45, ha='right')
        plt.grid(axis='y', alpha=0.3)
        plt.tight_layout()
        
        # 保存图表
        output_path = os.path.join(output_dir, 'ecg_completeness_distribution.png')
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"\n图表已保存到: {output_path}")
        
        # 显示图表（如果在交互环境中）
        try:
            plt.show()
        except:
            pass
            
    except ImportError:
        print("\n注意: 未安装matplotlib，跳过图表生成")
    except Exception as e:
        print(f"\n生成图表时出错: {e}")

def save_detailed_report(stats, output_path='ecg_completeness_analysis.txt'):
    """
    保存详细分析报告
    
    Args:
        stats (dict): 统计结果
        output_path (str): 输出文件路径
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("ECG完整性分析报告\n")
        f.write("=" * 50 + "\n\n")
        
        f.write("=== 基本统计信息 ===\n")
        f.write(f"总文件数: {stats['total_files']}\n")
        f.write(f"平均完整性: {stats['mean_completeness']:.4f} ({stats['mean_completeness']*100:.2f}%)\n")
        f.write(f"中位数完整性: {stats['median_completeness']:.4f} ({stats['median_completeness']*100:.2f}%)\n\n")
        
        f.write("=== 每5%区间分布 ===\n")
        for i in range(0, 20):
            lower = i * 0.05
            upper = (i + 1) * 0.05
            label = f"{lower*100:.0f}%-{upper*100:.0f}%"
            count = stats['interval_counts'].get(label, 0)
            percentage = (count / stats['total_files']) * 100 if stats['total_files'] > 0 else 0
            f.write(f"{label:>8}: {count:>6} 个文件 ({percentage:>5.1f}%)\n")
    
    print(f"\n详细报告已保存到: {output_path}")

def main():
    """主函数"""
    # 文件路径
    csv_file_path = "heedb_clean_ecg/train/ecg_completeness_stats.csv"
    
    # 检查文件是否存在
    if not os.path.exists(csv_file_path):
        print(f"错误: 文件不存在 - {csv_file_path}")
        return
    
    # 执行分析
    stats = analyze_ecg_completeness(csv_file_path)
    
    if stats:
        # 保存详细报告
        save_detailed_report(stats)
        
        # 创建可视化
        create_visualization(stats)
        
        print(f"\n=== 分析完成 ===")
        print(f"分析结果已保存到当前目录")

if __name__ == "__main__":
    main()
