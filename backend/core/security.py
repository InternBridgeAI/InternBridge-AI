from typing import List, Optional

def detect_fake_posting(title: str, description: str) -> bool:
    """
    Analyzes internship title and description for common patterns of fraudulent postings.
    """
    suspicious_keywords = [
        "easy money", "no work", "pay to join", "work from home scam",
        "guaranteed income", "urgent hiring without interview",
        "deposit fee", "registration fee required"
    ]
    
    content = (title + " " + description).lower()
    
    # 1. Keyword check
    if any(keyword in content for keyword in suspicious_keywords):
        return True
    
    # 2. Link check (if they point to suspicious domains - simplified)
    # This could be expanded with regex for URL detection and domain blacklisting
    
    # 3. Excessive capitalization check
    if len([c for c in title if c.isupper()]) / len(title) > 0.5 if title else 0:
        return True
        
    return False

def verify_company_document(document_url: Optional[str]) -> bool:
    """
    Validates company document format and presence.
    In a real-world scenario, this might involve OCR or third-party verification.
    """
    if not document_url:
        return False
    
    # Simple check for PDF/Image extensions
    valid_extensions = (".pdf", ".png", ".jpg", ".jpeg")
    return any(document_url.lower().endswith(ext) for ext in valid_extensions)
