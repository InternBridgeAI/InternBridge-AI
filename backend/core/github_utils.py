import requests
import os
from typing import Dict, List

# Skills mapping from GitHub languages/topics to common skill names
SKILL_MAPPING = {
    "JavaScript": ["javascript", "js", "node.js", "nodejs"],
    "TypeScript": ["typescript", "ts"],
    "Python": ["python"],
    "Java": ["java"],
    "C++": ["c++", "cpp"],
    "C": ["c"],
    "C#": ["c#", "csharp", ".net"],
    "Go": ["go", "golang"],
    "Rust": ["rust"],
    "Ruby": ["ruby", "rails"],
    "PHP": ["php", "laravel"],
    "Swift": ["swift", "ios"],
    "Kotlin": ["kotlin", "android"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3"],
    "Shell": ["bash", "shell", "linux"],
    "Dart": ["dart", "flutter"],
}

def fetch_github_repos(username: str) -> List[Dict]:
    token = os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    
    url = f"https://api.github.com/users/{username}/repos?per_page=100&sort=updated"
    response = requests.get(url, headers=headers, timeout=20)
    
    if response.status_code != 200:
        if response.status_code == 404:
            raise Exception(f"GitHub user '{username}' not found")
        raise Exception(f"GitHub API error: {response.status_code}")
        
    return response.json()

def analyze_repos(repos: List[Dict]):
    languages = {}
    topics_set = set()
    
    for repo in repos:
        lang = repo.get("language")
        if lang:
            languages[lang] = languages.get(lang, 0) + 1
        
        repo_topics = repo.get("topics") or []
        for topic in repo_topics:
            topics_set.add(topic.lower())
            
    return languages, list(topics_set)

async def verify_github_skills(username: str, claimed_skills: List[str]):
    repos = fetch_github_repos(username)
    languages, topics = analyze_repos(repos)
    
    # Build a set of all detected skills from GitHub
    detected_skills = set()
    for lang in languages:
        detected_skills.add(lang.lower())
        mapped = SKILL_MAPPING.get(lang)
        if mapped:
            for s in mapped:
                detected_skills.add(s)
    
    for topic in topics:
        detected_skills.add(topic)
        
    # Check each claimed skill
    verified_skills = []
    unverified_skills = []
    
    for skill in claimed_skills:
        skill_lower = skill.lower()
        is_verified = (skill_lower in detected_skills) or \
                      any(ds in skill_lower or skill_lower in ds for ds in detected_skills)
        
        if is_verified:
            verified_skills.append(skill)
        else:
            unverified_skills.append(skill)
            
    # Determine if suspicious
    suspicious_reasons = []
    if len(repos) < 3 and len(claimed_skills) > 5:
        suspicious_reasons.append("Very few repos but many claimed skills")
    
    if len(claimed_skills) > 0 and len(unverified_skills) > len(claimed_skills) * 0.6:
        suspicious_reasons.append("More than 60% of claimed skills are unverified on GitHub")
        
    return {
        "username": username,
        "totalRepos": len(repos),
        "languages": languages,
        "verifiedSkills": verified_skills,
        "unverifiedSkills": unverified_skills,
        "isSuspicious": len(suspicious_reasons) > 0,
        "suspiciousReasons": suspicious_reasons
    }
