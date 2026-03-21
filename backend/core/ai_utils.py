import hashlib
import math
import os
from collections import Counter
from typing import Dict, Iterable, List, Sequence, Tuple

import requests  # type: ignore

_SKILL_ALIASES: Dict[str, List[str]] = {
    "JavaScript": ["javascript", "js", "node.js", "nodejs"],
    "TypeScript": ["typescript", "ts"],
    "Python": ["python"],
    "Java": ["java"],
    "C++": ["c++", "cpp"],
    "C": [" c ", "language c"],
    "C#": ["c#", "csharp", ".net", "dotnet"],
    "Go": ["go", "golang"],
    "Rust": ["rust"],
    "Ruby": ["ruby", "rails", "ruby on rails"],
    "PHP": ["php", "laravel"],
    "Swift": ["swift", "ios"],
    "Kotlin": ["kotlin", "android"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3"],
    "SQL": ["sql", "mysql", "postgres", "postgresql", "sqlite"],
    "React": ["react", "reactjs", "react.js"],
    "Next.js": ["next.js", "nextjs"],
    "Node.js": ["node", "node.js", "nodejs", "express", "express.js"],
    "Tailwind CSS": ["tailwind", "tailwindcss"],
    "FastAPI": ["fastapi"],
    "Django": ["django"],
    "Flask": ["flask"],
    "MongoDB": ["mongodb", "mongo"],
    "AWS": ["aws", "amazon web services"],
    "Docker": ["docker"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Git": ["git", "github", "gitlab"],
    "REST APIs": ["rest api", "rest apis", "api development", "apis"],
    "Machine Learning": ["machine learning", "ml", "scikit-learn", "tensorflow", "pytorch"],
    "Data Analysis": ["data analysis", "pandas", "numpy", "analytics"],
    "UI/UX": ["ui/ux", "ux", "ui design", "user experience", "figma"],
}

_ALIAS_TO_CANONICAL: Dict[str, str] = {}
for canonical, aliases in _SKILL_ALIASES.items():
    _ALIAS_TO_CANONICAL[canonical.lower()] = canonical
    for alias in aliases:
        _ALIAS_TO_CANONICAL[alias.lower()] = canonical


def normalize_skill_name(skill: str) -> str:
    normalized = " ".join((skill or "").strip().split())
    if not normalized:
        return ""

    lowered = normalized.lower()
    if lowered in _ALIAS_TO_CANONICAL:
        return _ALIAS_TO_CANONICAL[lowered]

    simplified = lowered.replace("-", " ").replace("_", " ")
    if simplified in _ALIAS_TO_CANONICAL:
        return _ALIAS_TO_CANONICAL[simplified]

    return normalized


def normalize_skills(skills: Iterable[str]) -> List[str]:
    seen = set()
    normalized: List[str] = []
    for skill in skills:
        cleaned = normalize_skill_name(skill)
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(cleaned)
    return normalized


def extract_skills_from_text(text: str, limit: int = 25) -> List[str]:
    content = (text or "").lower()
    if not content:
        return []

    matches: List[Tuple[int, str]] = []
    for alias, canonical in _ALIAS_TO_CANONICAL.items():
        idx = content.find(alias)
        if idx >= 0:
            matches.append((idx, canonical))

    matches.sort(key=lambda item: item[0])
    ordered = normalize_skills([canonical for _, canonical in matches])
    return ordered[:limit]


def _fallback_embedding(tokens: Sequence[str], dimensions: int = 128) -> List[float]:
    vector = [0.0] * dimensions
    for token in tokens:
        digest = hashlib.sha256(token.lower().encode("utf-8")).digest()
        for idx in range(0, 16, 4):
            bucket = int.from_bytes(digest[idx:idx + 2], "big") % dimensions
            sign = 1.0 if digest[idx + 2] % 2 == 0 else -1.0
            weight = 1.0 + (digest[idx + 3] / 255.0)
            vector[bucket] += sign * weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return []
    return [round(value / norm, 8) for value in vector]


def generate_skills_embedding(skills: List[str]) -> List[float]:
    normalized_skills = normalize_skills(skills)
    if not normalized_skills:
        return []

    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            text = ", ".join(normalized_skills)
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"text-embedding-004:embedContent?key={api_key}"
            )
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]},
            }
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                json_body = response.json()
                embedding = json_body.get("embedding", {}).get("values")
                if isinstance(embedding, list) and embedding:
                    return embedding
        except Exception:
            pass

    return _fallback_embedding(normalized_skills)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0

    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(dot_product / (norm_a * norm_b))


def calculate_tf_idf(skill: str, user_skills: List[str], all_internships_skills: List[List[str]]) -> float:
    skill_key = normalize_skill_name(skill).lower()
    normalized_user_skills = [normalize_skill_name(item).lower() for item in user_skills]
    tf = 1.0 if skill_key in normalized_user_skills else 0.0

    total_docs = len(all_internships_skills)
    if total_docs == 0:
        return 0.0

    docs_with_skill = sum(
        1
        for doc in all_internships_skills
        if skill_key in [normalize_skill_name(item).lower() for item in doc]
    )
    idf = math.log((total_docs + 1) / (docs_with_skill + 1)) + 1
    return tf * idf


def calculate_match_score(
    student_vector: List[float],
    internship_vector: List[float],
    student_skills: List[str],
    required_skills: List[str],
    all_internships_skills: List[List[str]] = [],
) -> float:
    normalized_student_skills = normalize_skills(student_skills)
    normalized_required_skills = normalize_skills(required_skills)

    semantic_similarity = cosine_similarity(student_vector, internship_vector)
    if not normalized_required_skills:
        return semantic_similarity

    student_skill_keys = {skill.lower() for skill in normalized_student_skills}
    matched_reqs = [
        skill for skill in normalized_required_skills if skill.lower() in student_skill_keys
    ]
    coverage = len(matched_reqs) / max(len(normalized_required_skills), 1)

    tf_idf_bonus = 0.0
    if all_internships_skills:
        tf_idf_bonus = sum(
            calculate_tf_idf(skill, normalized_student_skills, all_internships_skills)
            for skill in matched_reqs
        )

    base_score = (semantic_similarity * 0.45) + (coverage * 0.45)
    if not student_vector or not internship_vector:
        base_score = coverage * 0.85

    final_score = base_score + min((tf_idf_bonus / 5.0) * 0.1, 0.1)
    return min(round(final_score, 4), 1.0)


def calculate_market_readiness(
    student_skills: List[str],
    all_internships_skills: List[List[str]],
    cgpa: float = 0.0,
    has_resume: bool = False,
    has_github: bool = False,
    has_linkedin: bool = False,
) -> int:
    normalized_student_skills = normalize_skills(student_skills)
    skill_count_score = min(len(normalized_student_skills) * 4, 28)

    demand_counter: Counter[str] = Counter()
    for skill_set in all_internships_skills:
        for skill in normalize_skills(skill_set):
            demand_counter[skill] += 1

    max_demand = max(demand_counter.values(), default=0)
    demand_score = 0.0
    if normalized_student_skills and max_demand > 0:
        demand_values = [
            (demand_counter.get(skill, 0) / max_demand) for skill in normalized_student_skills
        ]
        demand_score = min(sum(demand_values) / len(demand_values) * 30, 30)

    cgpa_score = 0.0
    if cgpa >= 9.0:
        cgpa_score = 15
    elif cgpa >= 8.0:
        cgpa_score = 10
    elif cgpa >= 7.0:
        cgpa_score = 5

    verification_score = 0
    if has_resume:
        verification_score += 10
    if has_github:
        verification_score += 8
    if has_linkedin:
        verification_score += 4

    final_score = 20 + skill_count_score + demand_score + cgpa_score + verification_score
    return min(99, max(0, round(final_score)))
