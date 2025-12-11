export const diagnosticGroups = [
    {
        rank: 1, name: "Acute MI / STEMI", score: 21.4950, supportCount: 28, verified: true, confidence: "High",
        pattern: "stemi"
    },
    {
        rank: 2, name: "Atrial Flutter", score: 16.8018, supportCount: 22, verified: false, confidence: "Medium",
        pattern: "flutter"
    },
    {
        rank: 3, name: "Acute Pericarditis", score: 8.4502, supportCount: 12, verified: false, confidence: "Low",
        pattern: "normal"
    },
    {
        rank: 4, name: "Brugada Syndrome", score: 5.2210, supportCount: 4, verified: false, confidence: "Very Low",
        pattern: "normal"
    }
];

export const knowledgeBase = {
    "Acute Anterior MI": ["ST Elevation in V1-V4", "Loss of R-wave progression", "Reciprocal depression in II, III, aVF"],
    "STEMI": ["J-point elevation > 2mm", "Hyperacute T waves", "Q waves (late stage)"],
    "Sinus Tachycardia": ["Rate > 100 bpm", "Normal P wave morphology", "Regular rhythm"],
    "LAD Occlusion": ["ST elevation in precordial leads", "Wide QRS complex potential", "De Winter T-waves"],
    "Atrial Flutter": ["Sawtooth F-waves", "Rate ~300 bpm", "2:1 or 4:1 AV Block"],
    "Pericarditis": ["Diffuse ST elevation", "PR depression", "Spodick's Sign"],
    "Brugada Type 1": ["Coved ST elevation >2mm V1-V3", "Inverted T waves", "RBBB morphology"]
};

export const currentPatient = {
    id: "PT-20251123-001",
    age: 67,
    gender: "Male",
    time: "2025-11-23 14:30",
    symptom: "Severe Chest Pain"
};
