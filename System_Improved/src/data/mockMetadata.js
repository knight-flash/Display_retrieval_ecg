// Dynamic Metadata Generator
export const generateMetadata = (allCases) => {
    // 1. Group cases by rank (which is now the medicalGroup ID)
    const groups = {};

    allCases.forEach(c => {
        // Use groupRank (populated with medicalGroup in App.jsx) or fallback
        const rank = c.groupRank || 'unknown';

        if (!groups[rank]) {
            // Use cleanName for display, fallback to title-cased rank if not available
            const displayName = c.cleanName
                ? c.cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                : rank.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            groups[rank] = {
                rank: rank, // This is the ID used for filtering
                name: displayName,
                cases: [],
                totalSimilarity: 0,
                priority: c.medicalPriority || 0 // Store priority for sorting
            };
        }
        groups[rank].cases.push(c);
        groups[rank].totalSimilarity += (c.similarity || 0);
    });

    // 2. Convert to Array and Calculate Stats
    const diagnosticGroups = Object.values(groups).map(g => {
        const count = g.cases.length;
        const avgScore = count > 0 ? (g.totalSimilarity / count) * 100 : 0; // scaled to 0-100 for UI

        // Confidence Logic
        let confidence = "Low";
        if (avgScore > 90) confidence = "High";
        else if (avgScore > 75) confidence = "Medium";

        // Pattern Logic (Keep simple visual mapping or derive from data if available)
        let pattern = "normal";
        // Map some common groups to patterns if desired, else default
        if (g.name.toLowerCase().includes("infarct")) pattern = "stemi";
        if (g.name.toLowerCase().includes("flutter")) pattern = "flutter";

        return {
            rank: g.rank,
            name: g.name,
            score: avgScore,
            supportCount: count,
            verified: avgScore > 85,
            confidence: confidence,
            pattern: pattern,
            priority: g.priority
        };
    });

    // 3. Sort by Medical Priority first, then Score? 
    // Or just Score. The user usually wants most relevant first. 
    // Let's stick to Score for retrieval relevance, but maybe secondary sort by priority could be added later.
    return diagnosticGroups.sort((a, b) => b.score - a.score);
};

// Keep existing exports for compatibility if needed, but diagnosticGroups is now generated
export const diagnosticGroups = []; // Empty default, will be populated in App


export const knowledgeBase = {
    "Acute Anterior MI": ["ST Elevation in V1-V4", "Loss of R-wave progression", "Reciprocal depression in II, III, aVF"],
    "anterior infarct": ["ST Elevation in V1-V4", "Loss of R-wave progression", "Reciprocal depression in II, III, aVF"],
    "STEMI": ["J-point elevation > 2mm", "Hyperacute T waves", "Q waves (late stage)"],
    "acute mi / stemi": ["J-point elevation > 2mm", "Hyperacute T waves", "Q waves (late stage)"],
    "Sinus Tachycardia": ["Rate > 100 bpm", "Normal P wave morphology", "Regular rhythm"],
    "LAD Occlusion": ["ST elevation in precordial leads", "Wide QRS complex potential", "De Winter T-waves"],
    "Atrial Flutter": ["Sawtooth F-waves", "Rate ~300 bpm", "2:1 or 4:1 AV Block"],
    "atrial flutter": ["Sawtooth F-waves", "Rate ~300 bpm", "2:1 or 4:1 AV Block"],
    "Pericarditis": ["Diffuse ST elevation", "PR depression", "Spodick's Sign"],
    "acute pericarditis": ["Diffuse ST elevation", "PR depression", "Spodick's Sign"],
    "Brugada Type 1": ["Coved ST elevation >2mm V1-V3", "Inverted T waves", "RBBB morphology"]
};

export const currentPatient = {
    id: "PT-20251123-001",
    age: 67,
    gender: "Male",
    time: "2025-11-23 14:30",
    symptom: "Severe Chest Pain"
};
