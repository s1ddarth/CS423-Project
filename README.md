## Math Expression Editor

### What is the goal of this project?

The goal of this project is to implement a Math Handwriting Recognizer that leverages natural gestures.
This allows users to hand-write their math equations and have them convert to LaTeX code, rather than a syntax-driven LaTeX editing interaction. 
This shift in interaction is enabled by gesture-based editing, such as scribble-to-delete and circle-to-submit operations.


### Prerequisites

- **Node.js & npm**: Install the latest LTS version from the official Node.js site (https://nodejs.org/).
- **Python 3.12**: Required for the FastAPI backend.
- **Expo CLI**:

  ```bash
  npm install -g expo
  ```

### Install frontend dependencies

From the `math-expression-editor` directory:

```bash
npm install
```

### Run the frontend (Expo app)

From the `math-expression-editor` directory:

```bash
npx expo start
```

Then follow the Expo instructions to open the app on:

- **iOS/Android device**: Use the Expo app / platform-specific instructions. 
- **iOS simulator**: Use the Expo CLI, and press i. There are specific instructions here: https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=simulated 

### Install backend dependencies

From the `math-expression-editor/backend` directory:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run the backend server

From the `math-expression-editor/backend` directory (with the virtual environment activated):

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will now be available at `http://<your-ip>:8000`.

### Point the frontend to your backend

The frontend sends handwriting images to the backend from `components/HandwritingCanvas.tsx`. Update the `BASE_URL` constant to match where your backend is running:

```ts
const BASE_URL = 'http://<your-ip>:8000';
// const BASE_URL = 'http://10.201.0.55:8000';
```

For local development on the same machine (i.e. if using the simulator), you can keep:

```ts
const BASE_URL = 'http://localhost:8000';
```

If you run the backend on a physical device using Expo Go, replace `localhost` with that machine's IP address on your network. On macOS, you can do this by running the following command on the Terminal:

```bash
ipconfig getifaddr en0
```
