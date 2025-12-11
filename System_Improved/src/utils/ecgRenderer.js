export const generateECGPath = (points, amplitude, type = "normal", seed = 0, activeGroupRank = 1) => {
    let path = `M 0 ${amplitude} `;
    const baseline = amplitude;
    const step = 2; // X-axis step

    for (let x = 0; x < points; x += step) {
        let y = baseline;
        const cycle = 100;
        const pos = (x + seed * 20) % cycle;

        // Base rhythm noise
        y += Math.sin(x * 0.2) * (amplitude * 0.05);

        if (type === "stemi" || (type === "dynamic" && activeGroupRank === 1)) {
            // STEMI Pattern
            if (pos > 10 && pos < 20) y -= amplitude * 0.1;
            else if (pos > 25 && pos < 28) y += amplitude * 0.1;
            else if (pos >= 28 && pos < 32) y -= amplitude * 1.2;
            else if (pos >= 32 && pos < 35) y += amplitude * 0.2;
            else if (pos >= 35 && pos < 50) y -= amplitude * 0.4; // Elevated ST
            else if (pos >= 50 && pos < 70) y -= amplitude * 0.5;
        } else if (activeGroupRank === 2) {
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
