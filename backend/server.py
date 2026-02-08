import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents import critic_agent, briefing_agent, router_agent, load_graph_data
from extractor import extract_info

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data once at startup
graph_data = load_graph_data()

with open("data/issues.json", "r") as f:
    issues = json.load(f)


@app.get("/api/graph")
def get_graph():
    return graph_data


@app.get("/api/issues")
def get_issues():
    return issues


@app.get("/api/people")
def get_people():
    people = [n for n in graph_data["nodes"] if n.get("type") == "person"]
    return people


@app.get("/api/decisions")
def get_decisions():
    return graph_data["decisions"]


@app.get("/api/dependencies")
def get_dependencies():
    return graph_data["dependencies"]


class QuestionRequest(BaseModel):
    question: str

@app.post("/api/ask")
def ask_briefing(req: QuestionRequest):
    answer = briefing_agent(graph_data, req.question)
    return {"answer": answer}


class UpdateRequest(BaseModel):
    update: str

@app.post("/api/route")
def route_update(req: UpdateRequest):
    routing = router_agent(graph_data, req.update)

    # Figure out who the update is about
    all_people = [n["id"] for n in graph_data["nodes"] if n.get("type") == "person"]
    
    # Match person mentioned in the update
    sender = None
    update_lower = req.update.lower()
    for person in all_people:
        name = person.replace("@startup.com", "").lower()
        if name in update_lower:
            sender = person
            break
    if not sender:
        sender = "unknown@startup.com"

    fake_msg = {
        "from": sender,
        "to": [r["person"] for r in routing],
        "subject": "Live Update",
        "body": req.update,
        "timestamp": "2025-01-18T10:00:00",
        "type": "live_update"
    }
    extracted = extract_info(fake_msg)

    # Add new nodes and edges to the graph
    new_nodes = []
    new_edges = []
    if not any(n["id"] == sender for n in graph_data["nodes"]):
        node = {"id": sender, "type": "person", "messages_sent": 1}
        graph_data["nodes"].append(node)
        new_nodes.append(node)

    # Add topic nodes
    for topic in extracted.get("topics", []):
        topic_lower = topic.lower()
        if not any(n["id"] == topic_lower for n in graph_data["nodes"]):
            node = {"id": topic_lower, "type": "topic", "mention_count": 1}
            graph_data["nodes"].append(node)
            new_nodes.append(node)
        # Add edge from sender to topic
        edge = {"source": sender, "target": topic_lower, "type": "discusses"}
        graph_data["edges"].append(edge)
        new_edges.append(edge)

    # Add communication edges to routed people
    for r in routing:
        person = r["person"]
        edge = {"source": sender, "target": person, "type": "communication", "weight": 1}
        graph_data["edges"].append(edge)
        new_edges.append(edge)

    # Add any new decisions
    for decision in extracted.get("decisions", []):
        graph_data["decisions"].append({
            "decision": decision,
            "made_by": sender,
            "timestamp": "2025-01-18T10:00:00",
            "subject": "Live Update"
        })

    return {
        "routing": routing,
        "new_nodes": new_nodes,
        "new_edges": new_edges,
        "extracted": extracted
    }

@app.post("/api/speak")
def speak_text(req: QuestionRequest):
    import requests as http_requests
    
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        return {"error": "No ElevenLabs API key"}
    
    url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"
    
    headers = {
        "xi-api-key": elevenlabs_key,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": req.question,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    response = http_requests.post(url, json=data, headers=headers)
    
    if response.status_code == 200:
        import base64
        audio_base64 = base64.b64encode(response.content).decode('utf-8')
        return {"audio": audio_base64}
    else:
        return {"error": "TTS failed"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)