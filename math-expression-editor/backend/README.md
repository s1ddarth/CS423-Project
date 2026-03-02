# Handwriting Recognizer Server

## Requirements

See **requirements.txt**

## Setup

From the **project root**:

```bash
python3.12 -m venv math-editor-venv
source math-editor-venv/bin/activate 
pip install -r backend/requirements.txt
```

## Run

From the **project root**:

```bash
source math-editor-venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000  
