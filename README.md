# Cloud File Agent

A full-stack file management application built with React and Django, designed for efficient file handling and storage.

## 🚀 Technology Stack

### Backend
- Django 4.x (Python web framework)
- Django REST Framework (API development)
- SQLite (Development database)
- Gunicorn (WSGI HTTP Server)
- WhiteNoise (Static file serving)

### Frontend
- React 18 with TypeScript
- TanStack Query (React Query) for data fetching
- Axios for API communication
- Tailwind CSS for styling
- Heroicons for UI elements

### Infrastructure
- Docker and Docker Compose
- Local file storage with volume mounting

## 📋 Prerequisites

Before you begin, ensure you have installed:
- Docker (20.10.x or higher) and Docker Compose (2.x or higher)
- Node.js (18.x or higher) - for local development
- Python (3.9 or higher) - for local development

## 🛠️ Installation & Setup

### Using Docker (Recommended)

```bash
docker-compose up --build
```

### Local Development Setup

#### Backend Setup
1. **Create and activate virtual environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create necessary directories**
   ```bash
   mkdir -p media staticfiles data
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Start the development server**
   ```bash
   python manage.py runserver
   ```

#### Frontend Setup
1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Create environment file**
   Create `.env.local`:
   ```
   REACT_APP_API_URL=http://localhost:8000/api
   ```

3. **Start development server**
   ```bash
   npm start
   ```

## 🌐 Accessing the Application

- Frontend Application: http://localhost:3000
- Backend API: http://localhost:8000/api

## 📝 API Documentation

### File Management Endpoints

#### List Files
- **GET** `/api/files/`
- Returns a list of all uploaded files
- Response includes file metadata (name, size, type, upload date)

#### Upload File
- **POST** `/api/files/`
- Upload a new file
- Request: Multipart form data with 'file' field
- Returns: File metadata including ID and upload status

#### Get File Details
- **GET** `/api/files/<file_id>/`
- Retrieve details of a specific file
- Returns: Complete file metadata

#### Delete File
- **DELETE** `/api/files/<file_id>/`
- Remove a file from the system
- Returns: 204 No Content on success

#### Download File
- Access file directly through the file URL provided in metadata

## 🗄️ Project Structure

```
abnormal-file-hub-main/
├── backend/                # Django backend
│   ├── apps/               # Django applications
│   │   └── files/          # Main 'files' app handling models, services, API
│   │       ├── api/        # DRF API views
│   │       ├── interfaces/ # Service/Repository interfaces (abstract)
│   │       ├── migrations/ # Database migrations
│   │       ├── models/     # Django data models
│   │       ├── repositories/ # Data access layer (Django ORM implementations)
│   │       ├── serializers/ # Data serialization (DRF serializers)
│   │       └── services/   # Business logic services (File, Storage, AI)
│   ├── core/               # Core project settings, wsgi, asgi
│   ├── data/               # Location for database files (e.g., db.sqlite3)
│   ├── media/              # Location for uploaded file content
│   ├── staticfiles/        # Collected static files for deployment
│   ├── manage.py           # Django management script
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── public/             # Static assets (index.html, favicon)
│   ├── src/                # Source code
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page-level components
│   │   ├── services/       # API interaction services
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main application component & routing
│   │   ├── index.css       # Global styles / Tailwind directives
│   │   └── index.tsx       # Application entry point
│   ├── package.json        # Node.js dependencies & scripts
│   ├── tsconfig.json       # TypeScript configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
├── .git/                   # Git repository data
├── .gitignore              # Files/directories ignored by Git
├── docker-compose.yml      # Docker Compose configuration
├── requirements.txt        # (Potentially top-level, if used)
├── README.md               # This file
└── ...                     # Other config files (e.g., Dockerfile, .env)

```

## 🔧 Development Features

- Hot reloading for both frontend and backend
- React Query DevTools for debugging data fetching
- TypeScript for better development experience
- Tailwind CSS for rapid UI development

## 🐛 Troubleshooting

1. **Port Conflicts**
   ```bash
   # If ports 3000 or 8000 are in use, modify docker-compose.yml or use:
   # Frontend: npm start -- --port 3001
   # Backend: python manage.py runserver 8001
   ```

2. **File Upload Issues**
   - Maximum file size: 10MB
   - Ensure proper permissions on media directory
   - Check network tab for detailed error messages

3. **Database Issues**
   ```bash
   # Reset database
   rm backend/data/db.sqlite3
   python manage.py migrate
   ```