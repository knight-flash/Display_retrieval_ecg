// Dynamic Metadata Generator
// Dynamic Metadata Generator
export const generateMetadata = (allCases) => {
    // 1. Group cases by ALL diagnosis tags
    // A case can belong to multiple groups
    const groups = {};

    allCases.forEach(c => {
        // Ensure diagnosis is an array
        let tags = [];
        if (Array.isArray(c.diagnosis)) {
            tags = c.diagnosis;
        } else if (typeof c.diagnosis === 'string') {
            tags = [c.diagnosis];
        }

        // Iterate through EACH tag in the case
        tags.forEach(tag => {
            const cleanTag = tag.trim();
            if (!cleanTag) return;

            // Use the tag itself as the key (rank)
            // We might want to normalize it further (lowercase?) but keeping it case-sensitive for display usually better if inconsistent
            const rank = cleanTag;

            if (!groups[rank]) {
                groups[rank] = {
                    rank: rank,
                    name: cleanTag, // Display name is the tag itself
                    cases: [],
                    totalSimilarity: 0,
                    priority: 0 // We can't easily assign a single priority if tags are mixed, so maybe ignore or take min/max
                };
            }

            // Add case to this group
            groups[rank].cases.push(c);
            groups[rank].totalSimilarity += (c.similarity || 0);
        });
    });

    // 2. Convert to Array and Calculate Stats
    const diagnosticGroups = Object.values(groups).map(g => {
        const count = g.cases.length;
        const avgScore = count > 0 ? (g.totalSimilarity / count) * 100 : 0; // scaled to 0-100 for UI

        // Confidence Logic
        let confidence = "Low";
        if (avgScore > 90) confidence = "High";
        else if (avgScore > 75) confidence = "Medium";

        return {
            rank: g.rank,
            name: g.name,
            score: avgScore,
            supportCount: count,
            verified: avgScore > 85,
            confidence: confidence,
            pattern: "normal", // defaulting
            priority: g.priority
        };
    });

    // 3. Sort by Support Count (Descending) by default
    return diagnosticGroups.sort((a, b) => b.supportCount - a.supportCount);
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
