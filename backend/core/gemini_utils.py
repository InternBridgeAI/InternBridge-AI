import requests
import os
import json
from typing import Dict, List, Any

def parse_resume_with_gemini(resume_text: str) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not found in environment")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
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
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    response = requests.post(url, json=payload, timeout=45)
    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")
        
    result = response.json()
    candidates = result.get("candidates") or []
    if not candidates:
        raise Exception("Gemini response did not contain any candidates")

    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    if not parts or not parts[0].get("text"):
        raise Exception("Gemini response did not contain parsable text")

    text = parts[0]["text"]
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
        
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fallback to a basic parser or retry if needed, but for now just raise error
        raise Exception("Failed to parse Gemini response as JSON")
