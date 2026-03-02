"""
Handwriting recognizer server
"""
import io
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

model = None
tokenizer = None

def _get_models():
    if model is None or tokenizer is None:
        raise HTTPException(
            status_code=503,
            detail="TexTeller model not loaded",
        )
    return model, tokenizer

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load TexTeller model and tokenizer at startup."""
    global model, tokenizer
    from texteller import load_model, load_tokenizer

    model = load_model(use_onnx=False)
    tokenizer = load_tokenizer()
    yield

app = FastAPI(title="Handwriting Recognizer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://127.0.0.1:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecognizeRequest(BaseModel):
    """Request body: base64-encoded image (PNG or JPEG)."""
    image: str

class RecognizeResponse(BaseModel):
    """Response: recognized LaTeX string."""
    latex: str

def _image_bytes_to_numpy_rgb(image_bytes: bytes) -> np.ndarray:
    """Convert image bytes to a numpy array in RGB format. """
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    return np.array(img)

def _image_to_latex(image_bytes: bytes) -> str:
    """ Use the model to convert a NP RGB Array to LaTeX """
    from texteller import img2latex

    model, tokenizer = _get_models()
    arr = _image_bytes_to_numpy_rgb(image_bytes) # RGB Array
    latex = img2latex(model, tokenizer, [arr])[0]
    return latex

@app.post("/recognize/upload", response_model=RecognizeResponse)
async def recognize_from_upload(image: UploadFile = File(...)) -> RecognizeResponse:
    contents = await image.read()
    try:
        latex = _image_to_latex(contents)
        return RecognizeResponse(latex=latex)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Recognition failed}")
        