# InternBridge AI – Skill-Verified Internship Ecosystem


---

## 🏗 System Architecture

The project follows a modern decoupled architecture:
- **Frontend**: A responsive Next.js 14 Web Application utilizing the App Router and Server Components for optimal performance and SEO.
- **Backend**: A robust FastAPI (Python) service handling computationally intensive AI transformations and logic.
- **Data Persistence**: Managed by Supabase (PostgreSQL), with built-in Authentication and Row-Level Security (RLS).
- **AI Engine**: Leveraging Google Gemini 1.5 Flash for high-speed resume parsing and skill suggestion.

---

## 🛠 Advanced Tech Stack

### Frontend Core
- **Next.js 14**: Server-side rendering (SSR) and Incremental Static Regeneration (ISR).
- **TypeScript**: Ensuring type safety across the entire dashboard ecosystem.
- **Tailwind CSS + Radix UI**: Glassmorphism aesthetic with high accessibility standards.
- **Recharts**: Dynamic visualization of skill gaps and placement trends.

### Backend & AI
- **FastAPI**: Asynchronous Python framework for high-throughput API endpoints.
- **Google Gemini API**: Powering the resume extraction and internship skill suggestion pipelines.
- **Vector Search Logic**: Custom cosine similarity implementation for ranking candidates against job requirements.
- **Supabase-py**: Seamless integration with the PostgreSQL database and Auth layer.

### Infrastructure & Security
- **Supabase Auth**: JWT-based secure authentication.
- **RLS Policies**: Data-level security ensures users (Students, Companies, TPOs) only access relevant records.
- **GitHub API**: Integration for real-time technical skill verification.

---

## 🔄 Technical Workflows

### 1. AI-Powered Matching Engine
When a company posts an internship, the system:
1. **Skill Vectorization**: Converts required skills into high-dimensional embeddings.
2. **Preference Filtering**: Applies hard filters (location, stipend, duration).
3. **Similarity Scoring**: Calculates the Cosine Similarity between the internship's skill vector and the student's `skill_vector` stored in Supabase.
4. **Ranking**: Returns a ranked list of "Recommended Candidates" based on mathematical closeness (TF-IDF weighted).

### 2. GitHub Skill Verification Pipeline
To combat "resume padding", the platform implements:
- **Repository Analysis**: Scans public repositories for language distribution and commit frequency.
- **Complexity Check**: Evaluates project depth to distinguish between "tutorial projects" and "real-world implementations".
- **Dynamic Status**: Marks skills as "Verified" on the student profile if corresponding technical evidence is found on GitHub.

### 3. Smart Resume Processing
- Uses Gemini Vision/Text models to parse PDF resumes.
- Maps extracted data to a structured JSON schema: `Skills`, `Experience`, `Education`, and `Projects`.
- Automatically generates a `skill_vector` upon parsing to immediately enable AI matching.

---

## 📈 Implementation Impact

| Feature | For Students | For Companies |
| :--- | :--- | :--- |
| **Verification** | Gain credibility with "Verified" tech badges. | Reduce screening time by 70% with pre-verified talent. |
| **Matching** | Get internships tailored to actual technical depth. | Discover "hidden gems" through vector similarity, not just keywords. |
| **Analytics** | View real-time "Skill Gaps" based on market demand. | Track application funnels with granular recruitment tracking. |

---

## 🚀 Developer Setup

### Prerequisites
- Node.js 18+ & NPM
- Python 3.9+
- Supabase Project
- Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/InternBridge-AI.git
   cd InternBridge-AI
   ```

2. **Frontend Deployment**:
   ```bash
   npm install
   npm run dev # Starts on http://localhost:3000
   ```

3. **Backend Service**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload # Starts on http://localhost:8000
   ```

4. **Environment Configuration**:
   Create a `.env.local` (root) and `.env` (backend folder):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   GEMINI_API_KEY=...
   GITHUB_TOKEN=...
   ```

5. **Database Setup (Supabase)**:
   - For a brand‑new project: run `supabase-schema.sql` and then `supabase-migration-v4.sql` in the Supabase SQL Editor.
   - For an existing project: run `supabase-migration-v2.sql`, `supabase-migration-v3.sql`, and `supabase-migration-v4.sql` to align missing columns used by onboarding and dashboards.
   - After any schema changes, reload the PostgREST schema cache (Settings → API → Reload schema cache).

6. **Storage Buckets (Supabase)**:
   - Ensure a public `resumes` bucket exists (used for student resume uploads).
   - Create a public `verification-documents` bucket for student IDs, company verification docs, and college verification files.

---

## 🔒 Security Architecture
- **Multi-Role RBAC**: Strict middleware validation for `student`, `company`, `admin`, and `tpo` roles.
- **Stateless Auth**: JWT validation handled both in Next.js Middleware and FastAPI Dependencies.
- **Audit Logs**: Every critical action (application, approval, verification) is logged in the `activity_logs` table.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
