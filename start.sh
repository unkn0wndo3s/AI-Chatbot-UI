#!/bin/bash
source .venv/bin/activate
exec uvicorn app:app --host 0.0.0.0 --port 8000
