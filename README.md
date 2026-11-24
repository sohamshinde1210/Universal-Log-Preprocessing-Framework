# Universal Log Pre-processing Framework (ULPF)

ULPF is a Python-based framework that simplifies security log processing by converting logs from different formats into a common standardized structure.

## Features
- Log file ingestion and validation
- Supports JSON, CSV, XML, LOG, and Syslog
- SHA-256 file integrity verification
- Log parsing and normalization
- Data quality checks
- Interactive dashboard

## Technology Stack
- **Frontend:** React.js
- **Backend:** Python, FastAPI
- **Database:** SQLite
- **ORM:** SQLAlchemy
- **Testing:** Pytest

## Installation

```bash
git clone https://github.com/sohamshinde1210/Universal-Log-Preprocessing-Framework.git
cd Universal-Log-Preprocessing-Framework

python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
python -m uvicorn main:app --reload
```

For the frontend:

```bash
cd frontend
npm install
npm run dev
```

## API Documentation

http://127.0.0.1:8000/docs

## Purpose

To reduce manual log analysis, improve data consistency, and make security logs easier for SOC analysts to process and analyze.

## Author

**Soham Shinde**
