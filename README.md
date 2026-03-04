# Setup & Run

> NOTE: Run the backend, change the IP address in HandwritingCanvas.tsx to the IP address of your backend in order to access the recognizer server from Expo Go

## Frontend
1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Backend 

### Requirements

See **requirements.txt**

### Setup

From the **project root**:

```bash
python3.12 -m venv math-editor-venv
source math-editor-venv/bin/activate 
pip install -r backend/requirements.txt
```

### Run

From the **project root**:

```bash
source math-editor-venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000 
- Health (GET): http://localhost:8000/health
- Upload Image (POST): http://localhost:8000/recognize/upload
- **Interactive API docs (i highly recommend this when trying it out):** http://localhost:8000/docs — view and try the API from the browser.

---

### Test image upload
#### Postman

1. Set **Method** to **POST** 
2. Set **URL** to `http://localhost:8000/recognize/upload`.
3. Open the **Body** tab -> select **form-data**.
4. Add a row: **Key** = `image`, change the type to **File** (dropdown on the right), then click **Select Files** and pick an image.
5. Click **Send**. You should get a 200 response with JSON like `{"latex": "..."}`.

To copy the full request: **Code** (</>) → **cURL** → **Copy**.

#### Terminal
```bash
curl --location 'http://localhost:8000/recognize/upload' \
--form 'image=@"/path/to/your/image.png"'
```
