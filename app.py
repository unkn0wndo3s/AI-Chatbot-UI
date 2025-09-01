import os
import json
import logging
from typing import List, Dict, Optional, Union
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

HISTORY_DIR = os.getenv("HISTORY_DIR")
OLLAMA_HOST = os.getenv("OLLAMA_HOST")
OLLAMA_TOKEN = os.getenv("OLLAMA_TOKEN")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
SAMPLE_RATE = int(os.getenv("SAMPLE_RATE", "16000"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat")

app = FastAPI(title="Chat API Loaded")

try:
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
except ImportError:
    logger.warning("CORS middleware could not be imported – OPTIONS may fail")

from ollama import Client
ollama_client = Client(host=OLLAMA_HOST, headers={'Authorization': OLLAMA_TOKEN})

class PromptRequest(BaseModel):
    prompt: str
    key: str
    name: Optional[str] = None

def getRules() -> str:
    try:
        with open("rules.json", "r", encoding="utf-8") as f:
            rules = json.load(f)
        return "\n".join(str(rule) for rule in rules)
    except Exception as e:
        logger.warning(f"Unable to read rules.json: {e}")
        return ""

def format_message(message: str) -> str:
    timestamp = datetime.now().strftime("[%d/%m/%Y %H:%M:%S]")
    return f"{timestamp} : {message}"

def _history_file_path(chat_id: str) -> str:
    safe_id = chat_id.replace("/", "_")
    filename = f"{safe_id}.json"
    return os.path.join(HISTORY_DIR, filename)

def load_history(chat_id: str) -> Dict[str, Union[str, List[Dict[str, str]], None]]:
    path = _history_file_path(chat_id)
    if not os.path.exists(path):
        return {"name": None, "messages": []}
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Corrupted history for '{chat_id}': {exc}")
    if isinstance(data, dict) and 'messages' in data:
        return {"name": data.get('name'), "messages": data.get('messages', [])}
    return {"name": None, "messages": data}

def save_history(chat_id: str, messages: List[Dict[str, str]], name: Optional[str] = None) -> None:
    os.makedirs(HISTORY_DIR, exist_ok=True)
    path = _history_file_path(chat_id)
    existing_name = None
    if name is None and os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            if isinstance(existing_data, dict) and 'name' in existing_data:
                existing_name = existing_data.get('name')
        except Exception:
            existing_name = None
    record_name = name if name is not None else existing_name
    data = {"name": record_name, "messages": messages}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.post("/messaging/{chat_id}")
def messaging(chat_id: str, req: PromptRequest, response: Response):
    if req.key != PRIVATE_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: invalid key")
    try:
        hist_data = load_history(chat_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    messages = hist_data.get("messages", [])
    existing_name = hist_data.get("name")

    user_message = {"role": "user", "content": format_message(req.prompt)}

    def strip_timestamp(message: str) -> str:
        if message.startswith('[') and '] :' in message:
            try:
                return message.split('] : ', 1)[1]
            except Exception:
                return message
        return message

    plain_history = []
    for entry in messages:
        plain_history.append({
            "role": entry["role"],
            "content": strip_timestamp(entry["content"]),
        })

    messages_with_rules = plain_history + [
        {"role": "user", "content": getRules() + "\n\n" + req.prompt}
    ]

    response_text = ""
    for part in ollama_client.chat(
        'gpt-oss:120b',
        messages=messages_with_rules,
        stream=True
    ):
        response_text += part["message"]["content"]

    messages.append(user_message)
    messages.append({"role": "assistant", "content": format_message(response_text)})
    name_to_save = req.name if req.name else existing_name
    try:
        save_history(chat_id, messages, name=name_to_save)
    except Exception as e:
        logger.warning(f"Error while saving history for {chat_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return {"response": response_text}

@app.get("/messaging/{chat_id}")
def get_messaging_history(chat_id: str, key: str = "", response: Response = None):
    if key != PRIVATE_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: invalid key")
    try:
        hist_data = load_history(chat_id)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    if response is not None:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return {"name": hist_data.get("name"), "history": hist_data.get("messages")}

@app.options("/messaging/{chat_id}")
def options_messaging(chat_id: str, response: Response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return Response(status_code=204)

@app.get("/messaging")
def list_messaging_sessions(key: str = "", response: Response = None):
    if key != PRIVATE_KEY:
        raise HTTPException(status_code=403, detail="Forbidden: invalid key")
    os.makedirs(HISTORY_DIR, exist_ok=True)
    sessions: List[Dict[str, Optional[str]]] = []
    for filename in os.listdir(HISTORY_DIR):
        if not filename.endswith('.json'):
            continue
        chat_id = os.path.splitext(filename)[0]
        name = None
        try:
            with open(os.path.join(HISTORY_DIR, filename), 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, dict):
                name = data.get('name')
        except Exception:
            name = None
        sessions.append({'id': chat_id, 'name': name})
    if response is not None:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return {"chats": sessions}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
