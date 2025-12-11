import React, { useState } from 'react';
import {
  Search, FileText, Activity, X, User, ChevronDown,
  CheckCircle2, BarChart3, BookOpen, LayoutGrid,
  Maximize2, Share2, MoreHorizontal, AlertCircle
} from 'lucide-react';

const ECGMockup = () => {
  const [selectedCase, setSelectedCase] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- 模拟数据 ---
  const currentPatient = {
    id: "PT-20251123-001",
    age: 67,
    gender: "Male",
    time: "2025-11-23 14:30",
    symptom: "Severe Chest Pain"
  };

  const knowledgeBase = {
    "Acute Anterior MI": ["ST Elevation in V1-V4", "Loss of R-wave progression", "Reciprocal depression in II, III, aVF"],
    "STEMI": ["J-point elevation > 2mm", "Hyperacute T waves", "Q waves (late stage)"],
    "Sinus Tachycardia": ["Rate > 100 bpm", "Normal P wave morphology", "Regular rhythm"],
    "LAD Occlusion": ["ST elevation in precordial leads", "Wide QRS complex potential", "De Winter T-waves"],
    "Atrial Flutter": ["Sawtooth F-waves", "Rate ~300 bpm", "2:1 or 4:1 AV Block"],
    "Pericarditis": ["Diffuse ST elevation", "PR depression", "Spodick's Sign"],
    "Brugada Type 1": ["Coved ST elevation >2mm V1-V3", "Inverted T waves", "RBBB morphology"]
  };

  const diagnosticGroups = [
    {
      rank: 1, name: "Acute MI / STEMI", score: 21.4950, supportCount: 28, verified: true, confidence: "High",
      cases: [
        {
          id: "HEEDB-1124",
          similarity: 0.982,
          diagnosis: ["Acute Anterior MI", "Sinus Tachycardia"],
          report: "Sinus tachycardia. Marked ST elevation in V1-V4 consistent with acute anterior infarct.",
          demographics: "Male, 65y"
        },
        {
          id: "HEEDB-8821",
          similarity: 0.975,
          diagnosis: ["STEMI", "Acute MI"],
          report: "Emergency protocol. Significant ST elevation. Critical finding.",
          demographics: "Female, 71y"
        },
        {
          id: "HEEDB-3321",
          similarity: 0.961,
          diagnosis: ["Acute Septal MI", "Left Ventricular Hypertrophy"],
          report: "Consider acute injury pattern in septal leads.",
          demographics: "Male, 58y"
        },
        { id: "HEEDB-5519", similarity: 0.942, diagnosis: ["Anterior Wall MI"], report: "Marked elevation in precordial leads.", demographics: "Male, 62y" },
        { id: "HEEDB-6620", similarity: 0.938, diagnosis: ["STEMI (LAD)"], report: "Hyperacute T waves observed.", demographics: "Female, 60y" },
        { id: "HEEDB-7721", similarity: 0.892, diagnosis: ["Acute MI"], report: "ST changes in multiple leads.", demographics: "Male, 70y" },
        { id: "HEEDB-9922", similarity: 0.881, diagnosis: ["STEMI"], report: "Inferior wall elevation.", demographics: "Female, 65y" }
      ]
    },
    {
      rank: 2, name: "Atrial Flutter", score: 16.8018, supportCount: 22, verified: false, confidence: "Medium",
      cases: [
        { id: "HEEDB-1029", similarity: 0.945, diagnosis: ["Atrial Flutter", "2:1 Block"], report: "Sawtooth pattern in II, III, aVF.", demographics: "Male, 77y" },
        { id: "HEEDB-2044", similarity: 0.912, diagnosis: ["Atrial Flutter"], report: "Regular tachycardia with flutter waves.", demographics: "Female, 80y" },
        { id: "HEEDB-3055", similarity: 0.885, diagnosis: ["Atrial Arrhythmia"], report: "Rapid atrial rate, variable block.", demographics: "Male, 69y" }
      ]
    },
    {
      rank: 3, name: "Acute Pericarditis", score: 8.4502, supportCount: 12, verified: false, confidence: "Low",
      cases: [
        { id: "HEEDB-4011", similarity: 0.820, diagnosis: ["Pericarditis"], report: "Diffuse ST elevation without reciprocal changes.", demographics: "Male, 45y" },
        { id: "HEEDB-4022", similarity: 0.785, diagnosis: ["Pericarditis", "Sinus Tachycardia"], report: "PR depression noted in lead II.", demographics: "Female, 32y" }
      ]
    },
    {
      rank: 4, name: "Brugada Syndrome", score: 5.2210, supportCount: 4, verified: false, confidence: "Very Low",
      cases: [
        { id: "HEEDB-9001", similarity: 0.650, diagnosis: ["Brugada Type 1"], report: "Coved ST elevation in V1/V2.", demographics: "Male, 35y" }
      ]
    }
  ];

  const [activeGroup, setActiveGroup] = useState(diagnosticGroups[0]);

  // --- 图形生成工具 ---
  const generateECGPath = (points, amplitude, type = "normal", seed = 0) => {
    let path = `M 0 ${amplitude} `;
    const baseline = amplitude;
    const step = 2; // X-axis step

    for (let x = 0; x < points; x += step) {
      let y = baseline;
      const cycle = 100;
      const pos = (x + seed * 20) % cycle;

      // Base rhythm noise
      y += Math.sin(x * 0.2) * (amplitude * 0.05);

      if (type === "stemi" || (type === "dynamic" && activeGroup.rank === 1)) {
        // STEMI Pattern
        if (pos > 10 && pos < 20) y -= amplitude * 0.1;
        else if (pos > 25 && pos < 28) y += amplitude * 0.1;
        else if (pos >= 28 && pos < 32) y -= amplitude * 1.2;
        else if (pos >= 32 && pos < 35) y += amplitude * 0.2;
        else if (pos >= 35 && pos < 50) y -= amplitude * 0.4; // Elevated ST
        else if (pos >= 50 && pos < 70) y -= amplitude * 0.5;
      } else if (activeGroup.rank === 2) {
        // Atrial Flutter (Sawtooth)
        y += Math.sin(x * 0.3) * (amplitude * 0.3); // F-waves
        if (pos > 45 && pos < 50) y -= amplitude * 0.8; // QRS occasional
      } else {
        // Normal-ish / Other
        if (pos > 10 && pos < 20) y -= amplitude * 0.1;
        else if (pos > 25 && pos < 35) y -= amplitude * 0.8; // R
        else if (pos > 40 && pos < 60) y -= amplitude * 0.15; // T
      }

      path += `L ${x} ${y} `;
    }
    return path;
  };

  // --- 组件: ECG 背景网格 ---
  const ECGGrid = ({ children, className = "" }) => (
    <div className={`relative bg-white overflow-hidden ${className}`}>
      {/* Small Grid (1mm) */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(#ffe4e6 1px, transparent 1px), linear-gradient(90deg, #ffe4e6 1px, transparent 1px)',
          backgroundSize: '10px 10px'
        }}>
      </div>
      {/* Large Grid (5mm) */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(#fca5a5 1px, transparent 1px), linear-gradient(90deg, #fca5a5 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}>
      </div>
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );

  // --- 组件: 12导联视图 (更新为 1x12 布局 + 时间轴) ---
  // --- 组件: 12导联视图 (更新为 1x12 布局 + 时间轴) ---
  const TwelveLeadView = ({ isCompact = false }) => {
    // 合并所有导联为一个数组
    const leads = [
      "I", "II", "III", "aVR", "aVL", "aVF",
      "V1", "V2", "V3", "V4", "V5", "V6"
    ];

    return (
      <div className="h-full w-full flex flex-col relative">
        {/* 滚动容器 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="flex flex-col w-full border-l border-t border-red-200">
            {leads.map((leadName, idx) => (
              <div key={idx} className="relative border-b border-r border-red-200 overflow-hidden shrink-0 h-40"> {/* 设置固定高度 h-40 (160px) */}
                <span className="absolute top-1 left-1.5 text-[10px] font-bold text-slate-700 z-20">{leadName}</span>
                <div className="h-full w-full flex items-center">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 80">
                    <path
                      d={generateECGPath(500, 40, "dynamic", idx)}
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            ))}
            {/* 占位，防止底部被遮挡 */}
            {!isCompact && <div className="h-8 shrink-0"></div>}
          </div>
        </div>

        {/* 底部时间轴 (固定在底部，位于滚动层之上，或者跟随滚动？通常时间轴应该固定在视口底部) */}
        {/* 如果希望时间轴固定在底部，放在 flex-1 之外 */}
        {!isCompact && (
          <div className="h-6 w-full bg-red-50/90 backdrop-blur border-t border-red-200 relative shrink-0 select-none z-10 shadow-sm">
            {/* 刻度线和数字 */}
            <div className="absolute inset-0 w-full h-full">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 h-full flex flex-col justify-end items-center"
                  style={{ left: `${i * 10}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[9px] text-red-800 font-mono font-medium mb-0.5">{i}</span>
                  <div className="h-1.5 w-px bg-red-400"></div>
                </div>
              ))}
              {/* 小刻度 (每 2% 一个刻度，即 0.2s) */}
              {Array.from({ length: 51 }).map((_, i) => (
                <div
                  key={`tick-${i}`}
                  className="absolute bottom-0 h-1 w-px bg-red-200"
                  style={{ left: `${i * 2}%` }}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden selection:bg-blue-100">

      {/* Sidebar */}
      <div className="w-16 bg-slate-900 flex flex-col items-center py-6 space-y-6 shadow-2xl z-20 shrink-0">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-500 transition cursor-pointer">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col gap-4 w-full items-center">
          <div className="p-3 bg-slate-800 rounded-xl text-blue-400 cursor-pointer"><Search size={20} /></div>
          <div className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"><FileText size={20} /></div>
          <div className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"><LayoutGrid size={20} /></div>
        </div>
        <div className="mt-auto pb-4">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">JD</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">ECG-RAG <span className="text-slate-400 font-normal">Clinical Assistant</span></h1>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">BETA v2.1</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><Share2 size={18} /></button>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <User size={16} className="text-slate-400" /> Dr. Yan
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* Workspace Grid */}
        <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">

          {/* LEFT: Patient View (12-Lead fixed) */}
          <div className="col-span-7 flex flex-col h-full min-h-0 gap-3">
            {/* Patient Info Card */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 shrink-0 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  {currentPatient.id}
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{currentPatient.gender}, {currentPatient.age}y</span>
                </h2>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  <span className="text-red-500 font-medium">⚠️ {currentPatient.symptom}</span>
                  <span>• {currentPatient.time}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200"><MoreHorizontal size={16} /></button>
                <button className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 flex items-center gap-1">
                  Analyze <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Main ECG Display */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 relative flex flex-col overflow-hidden">
              <div className="h-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between px-3 shrink-0">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Live 12-Lead Monitor</span>
                <div className="flex items-center gap-2">
                  {activeGroup.rank === 2 && <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 rounded">Flutter Waves Detected</span>}
                  <span className="text-[10px] font-mono text-slate-400">25mm/s • 10mm/mV • 100Hz</span>
                </div>
              </div>
              <div className="flex-1 relative">
                <ECGGrid className="absolute inset-0 w-full h-full">
                  <TwelveLeadView />
                </ECGGrid>
              </div>
            </div>
          </div>

          {/* RIGHT: Evidence List (Scrollable) */}
          <div className="col-span-5 flex flex-col h-full min-h-0 gap-3">

            {/* Diagnosis Group Header with Dropdown */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 shrink-0 relative z-30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Selected Diagnosis Candidate</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${activeGroup.confidence === 'High' ? 'text-green-600 bg-green-50 border-green-100' :
                    activeGroup.confidence === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                      'text-slate-500 bg-slate-100 border-slate-200'
                  }`}>
                  {activeGroup.confidence} Confidence
                </span>
              </div>

              <button
                className={`w-full p-3 rounded-lg flex justify-between items-center border transition-all group relative ${isDropdownOpen ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : 'bg-blue-50/30 border-blue-200 hover:bg-blue-50 hover:border-blue-300'}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex flex-col items-start">
                  <div className="text-blue-800 font-bold text-lg flex items-center gap-2">
                    {activeGroup.name}
                  </div>
                  <div className="text-xs text-blue-500 font-medium mt-0.5">Score: {activeGroup.score.toFixed(2)} • {activeGroup.supportCount} Supporting Cases</div>
                </div>
                <ChevronDown size={20} className={`text-blue-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-blue-600'}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase flex justify-between">
                    <span>Available Candidates</span>
                    <span>Relevance Score</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {diagnosticGroups.map((group) => (
                      <button
                        key={group.rank}
                        onClick={() => {
                          setActiveGroup(group);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors ${activeGroup.rank === group.rank ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeGroup.rank === group.rank ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {group.rank}
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${activeGroup.rank === group.rank ? 'text-blue-700' : 'text-slate-700'}`}>{group.name}</div>
                            <div className="text-xs text-slate-400">{group.supportCount} cases found</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-medium text-slate-600">{group.score.toFixed(2)}</span>
                          {activeGroup.rank === group.rank && <CheckCircle2 size={16} className="text-blue-600" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Overlay to close dropdown when clicking outside (Optional logic handled by local click usually, but this helps in simple mockups) */}
              {isDropdownOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)}></div>}
            </div>

            {/* Scrollable Case List */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 backdrop-blur flex justify-between items-center shrink-0 z-10">
                <h3 className="font-bold text-slate-700 text-sm">Retrieved Evidence</h3>
                <span className="text-xs text-slate-400">{activeGroup.cases.length} results found</span>
              </div>

              {/* SCROLL AREA */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {activeGroup.cases.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedCase(item)}
                    className="group p-3 rounded-xl border border-slate-100 bg-white hover:border-blue-400 hover:ring-1 hover:ring-blue-100 hover:shadow-md cursor-pointer transition-all duration-200 relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{item.id}</div>
                      <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {(item.similarity * 100).toFixed(1)}% Sim
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.diagnosis.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                          {tag}
                        </span>
                      ))}
                      {item.diagnosis.length > 3 && <span className="text-[10px] text-slate-400 px-1">+</span>}
                    </div>

                    {/* Mini Rhythm Strip Preview */}
                    <div className="h-12 w-full bg-red-50/30 border border-red-100 rounded overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity">
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        <path d={generateECGPath(200, 20, "dynamic", index)} fill="none" stroke="#ef4444" strokeWidth="1" />
                      </svg>
                    </div>
                  </div>
                ))}
                {/* Empty state */}
                {activeGroup.cases.length === 0 && (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                    <AlertCircle className="mb-2 opacity-50" />
                    <span className="text-xs">No exact case matches found in database.</span>
                  </div>
                )}
                {/* Spacer for scroll bottom */}
                <div className="h-2"></div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ================= MODAL: DETAIL VIEW ================= */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedCase(null)}>
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/20" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><FileText size={20} /></div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900 leading-tight">Reference Case: {selectedCase.id}</h2>
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 size={12} /> Verified Diagnosis
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100">
                  <div className="text-right">
                    <div className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Similarity</div>
                    <div className="text-xl font-black text-blue-700 leading-none">{(selectedCase.similarity * 100).toFixed(1)}%</div>
                  </div>
                  <BarChart3 size={24} className="text-blue-500" />
                </div>
                <button onClick={() => setSelectedCase(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 custom-scrollbar">
              <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">

                {/* TOP: Full 12-Lead ECG View */}
                <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[560px] shrink-0">
                  <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><Activity size={16} className="text-red-500" /> Historical 12-Lead Record</h3>
                  </div>
                  <div className="flex-1 relative p-1">
                    <ECGGrid className="h-full w-full border border-red-50 rounded">
                      <TwelveLeadView isCompact={false} />
                    </ECGGrid>
                  </div>
                </div>

                {/* BOTTOM LEFT: Report */}
                <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileText size={18} className="text-blue-500" /> Physician Report
                  </h3>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedCase.diagnosis.map((tag, i) => (
                      <span key={i} className={`px-3 py-1 rounded-md text-sm font-bold border ${i === 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex-1 bg-amber-50/50 rounded-lg border border-amber-100 p-4 font-serif text-slate-700 text-sm leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">Observation:</span>
                    "{selectedCase.report}"
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                    <span>ID: {selectedCase.id}</span>
                    <span>Demographics: {selectedCase.demographics}</span>
                  </div>
                </div>

                {/* BOTTOM RIGHT: Knowledge */}
                <div className="col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <BookOpen size={18} className="text-purple-500" /> Feature Mapping
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {selectedCase.diagnosis.map((tag, idx) => (
                      knowledgeBase[tag] && (
                        <div key={idx} className="flex flex-col sm:flex-row gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-sm transition-all">
                          <div className="sm:w-1/3 shrink-0">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Diagnostic Label</div>
                            <div className="font-bold text-slate-800">{tag}</div>
                          </div>
                          <div className="flex-1 sm:border-l sm:border-slate-200 sm:pl-4">
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Typical ECG Features</div>
                            <ul className="space-y-1">
                              {knowledgeBase[tag].map((feature, fIdx) => (
                                <li key={fIdx} className="text-sm text-slate-600 flex items-start gap-2">
                                  <span className="text-blue-400 mt-1">•</span> {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Styles for Scrollbars */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}</style>
    </div>
  );
};

export default ECGMockup;