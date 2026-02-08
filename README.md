# 🧠 OrgBrain — AI Chief of Staff

**MIT Hackathon 2026 | OpenAI Sponsored Track**

> An AI-powered organizational intelligence system that maps how information flows inside companies, detects conflicts, and ensures the right people have the right information at the right time.

## The Problem

Inside every organization, information flows blindly. Emails, Slack messages, meetings, documents — no one knows who knows what. Decisions get lost. People get left out. There's no source of truth.

## The Solution

OrgBrain connects to your entire workspace (Gmail, Slack, Google Drive, AI meeting notetaker) and builds a **live intelligence layer** for your organization.

### Features

- **Interactive Knowledge Graph** — Visualize people, topics, tasks, and their connections in real-time
- **Clickable Deep-Dive** — Click any node to see related decisions, dependencies, documents, and connected people
- **Critic Agent** — Automatically detects conflicts, bottlenecks, and risks across the organization
- **Decision Timeline** — Version-stamped decisions with full audit trail
- **Dependency Mapping** — See who is blocking whom and why
- **AI Q&A** — Ask anything about your organization in natural language
- **Voice Input** — Speak your questions using browser speech recognition
- **Voice Output** — AI reads briefings aloud using ElevenLabs TTS
- **Live Feed** — Real-time ingestion of messages from all connected sources
- **Multi-Agent Architecture** — Critic Agent, Briefing Agent, and Router Agent working together

### Tech Stack

- **Frontend:** React, react-force-graph-2d
- **Backend:** Python, FastAPI, NetworkX
- **AI:** OpenAI GPT-4o (extraction, summarization, conflict detection)
- **Voice:** Browser Speech Recognition (input) + ElevenLabs (output)
- **Data:** Enron Email Dataset (real corporate communications)

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install openai fastapi uvicorn networkx pandas python-dotenv requests
# Add your API keys to .env
python enron_loader.py
python extractor.py
python graph_builder.py
python agents.py
python server.py
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000

## Architecture

```
[Email/Slack/Meetings/Docs]
        ↓
  [Ingestion Pipeline]
    GPT-4o extracts: people, topics, decisions, dependencies
        ↓
  [Knowledge Graph Engine]
    NetworkX builds: nodes, edges, clusters
        ↓
  [Agent Layer]
    Critic Agent → detects conflicts & risks
    Briefing Agent → answers questions
    Router Agent → determines who needs to know
        ↓
  [Interface Layer]
    Interactive graph + Voice I/O + Live feed
```

## Team

Built by a 2-person team at the MIT Hackathon 2026.