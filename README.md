# Smartply

An intelligent web application for automated cover letter generation powered by AI. Smartply helps job seekers manage their job applications and generate personalized, professional cover letters tailored to each job posting.

![Smartply Dashboard](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![React](https://img.shields.io/badge/React-19.2.0-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688)

## Features

### Smart Cover Letter Generation
- **AI-Powered Writing**: Uses OpenAI GPT-4 to generate compelling, personalized cover letters
- **Resume Integration**: Automatically extracts and uses information from your uploaded resume
- **Job Matching**: Tailors cover letters to specific job descriptions and requirements
- **Interactive Editing**: Select text and chat with AI to refine specific sections

### Job Management
- **Multi-Source Input**: Add jobs manually or via LinkedIn/Indeed URLs
- **Job Scraping**: Automated extraction of job details from supported platforms
- **Organized Views**: Switch between table and grid views for better visualization
- **Status Tracking**: Track which jobs have cover letters (processed vs pending)
- **Detailed Sidebar**: View full job descriptions in a sliding sidebar panel

### Profile & Resume Management
- **Personal Profile**: Store your contact information for automatic cover letter personalization
- **Base Resume**: Upload and store your primary resume as PDF
- **PDF Viewer**: Built-in PDF viewer to preview your resume
- **Resume Reuse**: Automatically uses your stored resume for new cover letters

### Modern UI/UX
- **Glassmorphism Design**: Beautiful black-themed interface with backdrop blur effects
- **Color-Coded Sections**: Dashboard (white), Jobs (blue), Cover Letters (purple)
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Real-Time Updates**: Instant feedback with toast notifications

## Architecture

### Backend (FastAPI + Python)
```
backend/
├── main.py                 # FastAPI application entry point
├── database.py            # SQLAlchemy database configuration
├── models.py              # Job model
├── models_extended.py     # Resume & CoverLetter models
├── models_profile.py      # UserProfile model
├── schemas.py             # Pydantic schemas for Job
├── schemas_extended.py    # Pydantic schemas for Resume & CoverLetter
├── schemas_profile.py     # Pydantic schemas for UserProfile
└── routes/
    ├── jobs.py           # Job management endpoints
    ├── cover_letters.py  # Cover letter & resume endpoints
    └── profile.py        # User profile endpoints
```

### Frontend (React + TypeScript + Vite)
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── JobInput.tsx
│   │   ├── PDFViewer.tsx
│   │   ├── GenerateCoverLetterModal.tsx
│   │   └── LinkedInSetupModal.tsx
│   ├── pages/           # Main application pages
│   │   ├── DashboardPage.tsx
│   │   ├── JobsPage.tsx
│   │   ├── CoverLettersPage.tsx
│   │   └── CoverLetterViewPage.tsx
│   ├── lib/
│   │   └── api.ts       # API client service
│   ├── App.tsx          # Application routing
│   └── main.tsx         # Application entry point
```

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** and **npm** ([Download](https://nodejs.org/))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **Git** ([Download](https://git-scm.com/downloads))

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Smartply.git
cd Smartply
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=sqlite:///./smartply.db
EOF

# Replace 'your_openai_api_key_here' with your actual OpenAI API key
```

**Backend Dependencies** (`requirements.txt`):
```txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
python-dotenv==1.0.0
openai==1.3.7
pdfplumber==0.10.3
selenium==4.15.2
beautifulsoup4==4.12.2
requests==2.31.0
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd ../frontend

# Install dependencies
npm install

# Create .env file (if needed for custom configurations)
echo "VITE_API_URL=http://localhost:8000" > .env
```

**Key Frontend Dependencies**:
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.2
- React Router DOM
- Shadcn UI components
- Tailwind CSS
- react-pdf (for PDF viewing)
- OpenAI SDK

#### 4. Database Initialization

The database will be created automatically on first run. The SQLite database file (`smartply.db`) will be created in the backend directory.

**Database Schema**:
- **users** (session-based, no explicit user table)
- **jobs** - Job postings
- **resumes** - Uploaded resume files and content
- **cover_letters** - Generated cover letters
- **user_profiles** - User personal information
- **linkedin_credentials** - LinkedIn session cookies (optional)

### Running the Application

#### Start the Backend Server

```bash
# Make sure you're in the backend directory with venv activated
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Alternative Docs: `http://localhost:8000/redoc`

#### Start the Frontend Development Server

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Start the Vite dev server
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### First Time Setup

1. **Open the Application**: Navigate to `http://localhost:5173`

2. **Set Up Your Profile**:
   - Go to Dashboard
   - Click on "Personal Info" tab
   - Fill in your details (name, email, phone, location)
   - Click "Save Profile"

3. **Upload Your Resume**:
   - Click on "Resume" tab
   - Upload your resume PDF
   - Your resume will be stored and used for all cover letter generations

4. **Add Your First Job**:
   - Click "Add Job" button (available on Dashboard or Jobs page)
   - Enter job details manually or paste a LinkedIn/Indeed URL
   - Click "Add Job"

5. **Generate a Cover Letter**:
   - Go to Jobs page or Dashboard
   - Click "Generate" button on any job
   - Optionally add custom instructions
   - Click "Generate Cover Letter"

6. **Review and Edit**:
   - View the generated cover letter
   - Select text and use the AI chat to refine specific sections
   - Download as PDF when ready

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Required
OPENAI_API_KEY=sk-...your-key-here

# Optional
DATABASE_URL=sqlite:///./smartply.db
PORT=8000
HOST=0.0.0.0
```

#### Frontend (.env)
```env
# Optional - defaults to http://localhost:8000
VITE_API_URL=http://localhost:8000
```

### OpenAI Model Configuration

The application currently uses GPT-4. You can change the model in `backend/routes/cover_letters.py`:

```python
# Line ~165 and ~235
response = client.chat.completions.create(
    model="gpt-4",  # Change to "gpt-4-turbo" or "gpt-3.5-turbo" if needed
    ...
)
```

### LinkedIn Scraping (Optional)

To enable LinkedIn job scraping:
1. Go to Settings → LinkedIn
2. Extract cookies from your browser:
   - Install a cookie extension (e.g., "Cookie Editor")
   - Login to LinkedIn
   - Copy `li_at` cookie value
   - Paste in Smartply settings

⚠️ **Note**: Use at your own risk. LinkedIn's terms of service may prohibit automated scraping.

## 📱 Usage Guide

### Dashboard
- **Your Profile**: Manage personal information and resume
- **Processed Jobs**: View jobs with cover letters (with tabs for job description and cover letter)
- **Pending Jobs**: See jobs that need cover letters

### Jobs Page
- **View Modes**: Toggle between table and grid views
- **Add Jobs**: Manually enter or scrape from URLs
- **Job Details**: Click "View" to see full job description in sidebar
- **Generate Cover Letters**: Click generate button (purple icon)

### Cover Letters Page
- **View Modes**: Toggle between table and grid views
- **Generate**: Create new cover letters from job list
- **View/Edit**: Click to view and interactively edit cover letters
- **Download**: Export cover letters as PDF

### Cover Letter Editor
- **Select & Edit**: Highlight text and describe changes
- **AI Chat**: Real-time conversation with AI for refinements
- **History**: View all edits in the chat panel
- **Undo**: Clear text selection to start fresh

## 🛠️ Development

### Project Structure

```
smartply/
├── backend/              # FastAPI backend
│   ├── routes/          # API endpoints
│   ├── models*.py       # Database models
│   ├── schemas*.py      # Pydantic schemas
│   ├── database.py      # DB configuration
│   ├── main.py          # App entry point
│   └── requirements.txt # Python dependencies
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities
│   │   └── main.tsx     # Entry point
│   ├── package.json     # Node dependencies
│   └── vite.config.ts   # Vite configuration
└── README.md           # This file
```

### Adding New Features

#### Backend - New API Endpoint
1. Create or modify route file in `backend/routes/`
2. Add new model to appropriate `models*.py` file
3. Create schema in corresponding `schemas*.py` file
4. Register router in `backend/main.py`

#### Frontend - New Page
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Update navigation in sidebar/header
4. Add API methods to `frontend/src/lib/api.ts`

### Code Style

**Backend (Python)**:
- Follow PEP 8 style guidelines
- Use type hints for function parameters and returns
- Document functions with docstrings

**Frontend (TypeScript)**:
- Use functional components with hooks
- Prefer TypeScript interfaces over types
- Use Tailwind CSS for styling
- Follow React best practices

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## 🐛 Troubleshooting

### Common Issues

#### Backend won't start
- **Check Python version**: `python3 --version` (must be 3.11+)
- **Verify virtual environment**: Make sure venv is activated
- **Check OpenAI API key**: Ensure `.env` file exists with valid key
- **Port conflict**: Change port in uvicorn command if 8000 is taken

#### Frontend won't start
- **Clear node_modules**: `rm -rf node_modules && npm install`
- **Check Node version**: `node --version` (must be 18+)
- **Port conflict**: Vite will auto-increment port if 5173 is taken

#### Database errors
- **Delete and recreate**: `rm smartply.db` (backend will create new one)
- **Check permissions**: Ensure write access to backend directory

#### PDF viewer not working
- **Check PDF content**: Ensure resume was uploaded successfully
- **Browser console**: Look for errors in browser developer tools
- **PDF size**: Very large PDFs (>10MB) may have issues

#### Cover letter generation fails
- **Check API key**: Verify OpenAI API key is valid and has credits
- **Check model**: Ensure you're using a valid model name (gpt-4, gpt-3.5-turbo)
- **Check resume**: Ensure a resume is uploaded
- **Check job data**: Verify job has description text

### Debug Mode

Enable debug logging:

**Backend**:
```bash
# Add to .env
DEBUG=true
LOG_LEVEL=DEBUG
```

**Frontend**:
```bash
# Check browser console (F12)
# Enable React DevTools
```

## 🔒 Security Notes

- **API Keys**: Never commit `.env` files to version control
- **Session IDs**: Stored in localStorage, cleared on logout
- **Database**: SQLite is for development; use PostgreSQL for production
- **CORS**: Currently allows all origins; restrict in production
- **Authentication**: Currently session-based; implement proper auth for production

## 🚢 Deployment

### Backend (Render, Railway, or Heroku)

1. **Prepare for deployment**:
   - Add `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Use PostgreSQL instead of SQLite
   - Set environment variables on hosting platform

2. **Deploy**:
   ```bash
   git push heroku main
   # or use Render/Railway web interface
   ```

### Frontend (Vercel, Netlify, or Cloudflare Pages)

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy**:
   - Connect GitHub repo to Vercel/Netlify
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variable: `VITE_API_URL=https://your-api-url.com`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

For issues, questions, or suggestions:
- **Issues**: [GitHub Issues](https://github.com/yourusername/Smartply/issues)
- **Email**: your-email@example.com

## Acknowledgments

- **OpenAI** - GPT-4 API for intelligent cover letter generation
- **Shadcn UI** - Beautiful, accessible component library
- **FastAPI** - Modern, fast web framework for Python
- **React** - User interface library
- **Tailwind CSS** - Utility-first CSS framework

## Roadmap

- [ ] Export cover letters as PDF
- [ ] Cover letter templates library
- [ ] Browser extension for one-click job import
- [ ] Email integration for direct application sending
- [ ] Analytics dashboard for job application tracking
- [ ] Multi-language support
- [ ] AI-powered resume optimization suggestions
- [ ] Interview preparation tools

---

**Built with ❤️ by the Smartply Team**

⭐ Star this repo if you find it helpful!
