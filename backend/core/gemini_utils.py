import json
import os
import re
from typing import Any, Dict, List

import requests

from core.ai_utils import extract_skills_from_text, normalize_skills

_EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
_PHONE_RE = re.compile(r"(\+?\d[\d\s\-()]{7,}\d)")
_CGPA_RE = re.compile(r"(?:cgpa|gpa)[:\s-]*([0-9]+(?:\.[0-9]+)?)", re.IGNORECASE)


def _empty_resume_payload() -> Dict[str, Any]:
    return {
        "full_name": "",
        "email": "",
        "phone": "",
        "education": [],
        "experience": [],
        "skills": [],
        "projects": [],
        "summary": "",
    }


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if "```json" in cleaned:
        return cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    if "```" in cleaned:
        return cleaned.split("```", 1)[1].split("```", 1)[0].strip()
    return cleaned


def _guess_full_name(lines: List[str]) -> str:
    for line in lines[:5]:
        if "@" in line or len(line.split()) > 5:
            continue
        if any(char.isdigit() for char in line):
            continue
        return line.strip()
    return ""


def _extract_summary(lines: List[str]) -> str:
    meaningful = [line.strip() for line in lines if len(line.strip()) > 30]
    return meaningful[0] if meaningful else ""


def _heuristic_resume_parse(resume_text: str) -> Dict[str, Any]:
    payload = _empty_resume_payload()
    text = resume_text or ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    payload["full_name"] = _guess_full_name(lines)

    email_match = _EMAIL_RE.search(text)
    if email_match:
        payload["email"] = email_match.group(0)

    phone_match = _PHONE_RE.search(text)
    if phone_match:
        payload["phone"] = phone_match.group(1).strip()

    cgpa_match = _CGPA_RE.search(text)
    education_rows: List[Dict[str, Any]] = []
    if cgpa_match:
        education_rows.append(
            {"school": "", "degree": "", "year": "", "cgpa": cgpa_match.group(1)}
        )
    payload["education"] = education_rows

    payload["skills"] = extract_skills_from_text(text)
    payload["summary"] = _extract_summary(lines)
    return payload


def _sanitize_resume_payload(parsed: Dict[str, Any], resume_text: str) -> Dict[str, Any]:
    heuristic = _heuristic_resume_parse(resume_text)
    payload = _empty_resume_payload()

    payload["full_name"] = str(parsed.get("full_name") or heuristic["full_name"] or "").strip()
    payload["email"] = str(parsed.get("email") or heuristic["email"] or "").strip()
    payload["phone"] = str(parsed.get("phone") or heuristic["phone"] or "").strip()

    education = parsed.get("education")
    payload["education"] = education if isinstance(education, list) else heuristic["education"]

    experience = parsed.get("experience")
    payload["experience"] = experience if isinstance(experience, list) else []

    projects = parsed.get("projects")
    payload["projects"] = projects if isinstance(projects, list) else []

    payload["skills"] = normalize_skills(
        list(parsed.get("skills") or []) + list(heuristic["skills"] or [])
    )

    summary = parsed.get("summary")
    payload["summary"] = str(summary or heuristic["summary"] or "").strip()
    return payload


def parse_resume_with_gemini(resume_text: str) -> Dict[str, Any]:
    if not resume_text.strip():
        return _empty_resume_payload()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _heuristic_resume_parse(resume_text)

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    prompt = f"""
    Analyze the following resume text and extract the information into a structured JSON format.
    Return ONLY the JSON object with the following keys:
    - full_name: string
    - email: string
    - phone: string
    - education: array of objects (school, degree, year, cgpa)
    - experience: array of objects (company, role, duration, description)
    - skills: array of strings (technical skills, programming languages, frameworks)
    - projects: array of objects (name, description, technologies)
    - summary: string (short professional summary)

    Resume Text:
    {resume_text}
    """
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(url, json=payload, timeout=45)
        if response.status_code != 200:
            return _heuristic_resume_parse(resume_text)

        result = response.json()
        candidates = result.get("candidates") or []
        if not candidates:
            return _heuristic_resume_parse(resume_text)

        parts = ((candidates[0].get("content") or {}).get("parts")) or []
        if not parts or not parts[0].get("text"):
            return _heuristic_resume_parse(resume_text)

        text = _strip_code_fences(parts[0]["text"])
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            return _heuristic_resume_parse(resume_text)
        return _sanitize_resume_payload(parsed, resume_text)
    except Exception:
        return _heuristic_resume_parse(resume_text)
