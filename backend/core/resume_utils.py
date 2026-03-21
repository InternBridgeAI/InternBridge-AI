import io
import zipfile
from typing import Optional
from urllib.parse import urlparse
from xml.etree import ElementTree

import requests
from pypdf import PdfReader  # type: ignore


def _guess_extension(resume_url: str, content_type: str) -> str:
    parsed = urlparse(resume_url)
    path = (parsed.path or "").lower()
    if path.endswith(".pdf") or "pdf" in content_type:
        return "pdf"
    if path.endswith(".docx") or "wordprocessingml.document" in content_type:
        return "docx"
    if path.endswith(".txt") or content_type.startswith("text/plain"):
        return "txt"
    if path.endswith(".doc"):
        return "doc"
    return ""


def extract_text_from_resume_url(resume_url: str) -> str:
    response = requests.get(resume_url, timeout=45)
    response.raise_for_status()

    content_type = str(response.headers.get("content-type") or "").lower()
    extension = _guess_extension(resume_url, content_type)
    raw_bytes = response.content

    if extension == "pdf":
        reader = PdfReader(io.BytesIO(raw_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(page.strip() for page in pages if page.strip()).strip()

    if extension == "docx":
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as archive:
            xml_bytes = archive.read("word/document.xml")
        root = ElementTree.fromstring(xml_bytes)
        paragraphs = [
            "".join(node.itertext()).strip()
            for node in root.iter()
            if node.tag.endswith("}p")
        ]
        return "\n".join(paragraphs).strip()

    if extension == "txt":
        return response.text.strip()

    if extension == "doc":
        raise ValueError("Legacy .doc resumes are not supported yet. Please upload a PDF or DOCX file.")

    raise ValueError("Unsupported resume format. Please upload a PDF, DOCX, or TXT file.")


def summarize_resume_source(resume_url: str) -> Optional[str]:
    parsed = urlparse(resume_url)
    filename = parsed.path.rsplit("/", 1)[-1].strip()
    return filename or None
