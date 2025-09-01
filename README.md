# **AI Chatbot UI** – keep it simple, keep it functional

Welcome to the front‑end of the AI chatbot. No fancy settings, just a clean interface that anyone can drop into their web host and start talking to the bot.

## 🎯 Goal

_Provide a no‑frills web UI for an AI backend_
Users should be able to open the page, type a message and get a response in less than a second.

## 📦 Release installation

1. Go to the **Releases** page of the repository.
2. Download the latest zip file.
3. Unzip it directly into your web server’s document root (or any sub‑folder you like).
4. Open the index page in a browser – you’re done.


## 🖼️ Screenshots

![Chat UI screenshot](assets/screenshot.png)

# **Installation guide** – front‑end

The front‑end requires zero dependencies. Just follow the three‑step release process described in the README.

### Step 1 – Download

Grab the latest release zip from the GitHub *Releases* section.

### Step 2 – Edit

Edit the `.env` file and set the backend adresse.

### Step 3 – Deploy

Extract the archive into the folder that your web server serves (e.g. `/var/www/html/ai-chatbot`).


# **Backend setup** – Python + PM2, because why not

The backend is a tiny Python script that listens on port 8000 and replies to the UI’s calls.

## 1 – Get the script

Download `backend.py` from the repository (or clone the repo and locate it in the `backend/` folder).

## 2 – Fill in the blanks

Open `backend.py` in your favourite editor and replace the placeholder variables that are marked _**to fill**_ (API keys, model path, etc.). Save and close the file.

## 3 – Prepare the server

```bash
sudo apt update
sudo apt install -y npm
npm install -g pm2
python -m venv .venv
source .venv/bin/activate
pip install uvicorn numpy torch fastapi dotenv ollama
```

## 4 – Run the backend with PM2

```bash
pm2 start start.sh --name AI-Backend
```

PM2 will keep the script alive and restart it automatically if it crashes.

## 5 – Optional: open the port

If your firewall blocks traffic, allow port 8000:

```bash
ufw allow 8000
```
You should get a simple JSON response confirming the service is up.

That’s it. The UI will automatically hit `http://your-server:8000/` unless you changed the endpoint in `app.js`.
