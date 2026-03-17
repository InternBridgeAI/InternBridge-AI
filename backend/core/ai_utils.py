import requests  # type: ignore
import os
from typing import List

def generate_skills_embedding(skills: List[str]) -> List[float]:
    if not skills:
        return []
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not found in environment")
        
    # Join skills into a single string
    text = ", ".join(skills)
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{"text": text}]
        }
    }
    
    response = requests.post(url, json=payload, timeout=30)
    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")
        
    json_body = response.json()
    embedding = json_body.get("embedding", {}).get("values")
    if not isinstance(embedding, list):
        raise Exception("Gemini embedding response format is invalid")
    return embedding

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0
    
    import math
    
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
        
    return float(dot_product / (norm_a * norm_b))

def calculate_tf_idf(skill: str, user_skills: List[str], all_internships_skills: List[List[str]]) -> float:
    """
    Simplified TF-IDF for skill importance.
    TF = 1 if user has skill else 0 (or frequency in resume)
    IDF = log(Total Internships / Internships requiring this skill)
    """
    import math
    
    # Term Frequency (TF)
    tf = 1.0 if skill.lower() in [s.lower() for s in user_skills] else 0.0
    
    # Inverse Document Frequency (IDF)
    total_docs = len(all_internships_skills)
    if total_docs == 0: return 0.0
    
    docs_with_skill = sum(1 for doc in all_internships_skills if skill.lower() in [s.lower() for s in doc])
    
    # Smoothing to avoid division by zero
    idf = math.log((total_docs + 1) / (docs_with_skill + 1)) + 1
    
    return tf * idf

def calculate_match_score(
    student_vector: List[float], 
    internship_vector: List[float],
    student_skills: List[str],
    required_skills: List[str],
    all_internships_skills: List[List[str]] = []
) -> float:
    """
    Advanced Matching Score combining Cosine Similarity, TF-IDF, and Skill weightage.
    """
    # 1. Semantic Similarity (Cosine)
    semantic_sim = cosine_similarity(student_vector, internship_vector)
    
    # 2. Exact Match Score with Weightage
    # Assign higher weights to required skills
    if not required_skills:
        return semantic_sim
        
    user_skills_lower = [s.lower() for s in student_skills]
    
    matched_reqs = [req for req in required_skills if req.lower() in user_skills_lower]
    
    match_count = float(len(matched_reqs))
    total_weight = float(len(required_skills))
    
    tf_idf_sum = 0.0
    if all_internships_skills:
        tf_idf_sum = sum(float(calculate_tf_idf(req, student_skills, all_internships_skills)) for req in matched_reqs)
        
    keyword_match_ratio = (match_count / total_weight) if total_weight > 0.0 else 0.0
    
    final_score = (float(semantic_sim) * 0.4) + (float(keyword_match_ratio) * 0.4)
    
    if tf_idf_sum > 0.0:
        final_score += min((float(tf_idf_sum) / 5.0) * 0.2, 0.2)
        
    return min(final_score, 1.0)
