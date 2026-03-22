export type FitTone = 'strong' | 'good' | 'stretch' | 'early';

export type MatchInsight = {
    score: number;
    coverage: number;
    matchedSkills: string[];
    missingSkills: string[];
    fitLabel: string;
    fitTone: FitTone;
    summary: string;
    gapSummary: string;
};

function normalizeSkills(skills: string[] = []) {
    const seen = new Set<string>();
    const normalized: string[] = [];

    skills.forEach((skill) => {
        const cleaned = skill?.trim();
        if (!cleaned) {
            return;
        }

        const key = cleaned.toLowerCase();
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        normalized.push(cleaned);
    });

    return normalized;
}

export function buildMatchInsight(requiredSkills: string[] = [], studentSkills: string[] = []): MatchInsight {
    const normalizedRequired = normalizeSkills(requiredSkills);
    const normalizedStudent = normalizeSkills(studentSkills);
    const studentSkillSet = new Set(normalizedStudent.map((skill) => skill.toLowerCase()));

    const matchedSkills = normalizedRequired.filter((skill) => studentSkillSet.has(skill.toLowerCase()));
    const missingSkills = normalizedRequired.filter((skill) => !studentSkillSet.has(skill.toLowerCase()));

    const coverage = normalizedRequired.length > 0
        ? matchedSkills.length / normalizedRequired.length
        : 0.45;
    const depthBonus = Math.min(normalizedStudent.length / 12, 1) * 0.12;
    const score = Math.max(18, Math.min(98, Math.round((coverage * 0.88 + depthBonus) * 100)));

    let fitLabel = 'Early fit';
    let fitTone: FitTone = 'early';
    if (score >= 82) {
        fitLabel = 'Strong fit';
        fitTone = 'strong';
    } else if (score >= 60) {
        fitLabel = 'Good fit';
        fitTone = 'good';
    } else if (score >= 35) {
        fitLabel = 'Stretch fit';
        fitTone = 'stretch';
    }

    let summary = 'Upload your resume and add skills to improve AI confidence.';
    if (matchedSkills.length >= 2) {
        summary = `Matched on ${matchedSkills.slice(0, 2).join(' + ')}${matchedSkills.length > 2 ? ' and more' : ''}.`;
    } else if (matchedSkills.length === 1) {
        summary = `${matchedSkills[0]} already aligns with this role.`;
    } else if (normalizedRequired.length > 0) {
        summary = `This role leans toward ${normalizedRequired.slice(0, 2).join(' + ')}.`;
    } else {
        summary = 'The role does not list a strict stack yet, so broader profile strength matters more.';
    }

    let gapSummary = 'You already cover the visible skill stack.';
    if (missingSkills.length === 1) {
        gapSummary = `Close ${missingSkills[0]} to improve shortlist odds.`;
    } else if (missingSkills.length > 1) {
        gapSummary = `Closing ${missingSkills.slice(0, 2).join(' + ')} would raise your fit quickly.`;
    }

    return {
        score,
        coverage,
        matchedSkills,
        missingSkills,
        fitLabel,
        fitTone,
        summary,
        gapSummary,
    };
}
