import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def load_graph_data():
    with open("data/graph_data.json", "r") as f:
        return json.load(f)

def critic_agent(graph_data):
    """Detects conflicts, contradictions, and information gaps."""
    
    decisions = graph_data["decisions"]
    dependencies = graph_data["dependencies"]
    
    prompt = f"""You are a Critic Agent — an AI that detects conflicts, contradictions, and risks inside an organization's communications.

Here are all the decisions made:
{json.dumps(decisions, indent=2)}

Here are all the dependencies:
{json.dumps(dependencies, indent=2)}

Analyze this and return a JSON array of issues found. Each issue should have:
- "type": "conflict" | "risk" | "info_gap" | "bottleneck"
- "severity": "high" | "medium" | "low"
- "description": clear explanation of the issue
- "people_involved": list of people affected
- "recommendation": what should be done

Look for:
1. Contradictory decisions (e.g., different dates or numbers)
2. Bottlenecks (one person blocking many things)
3. Information gaps (people who should know something but weren't included)
4. Risks (tight deadlines, budget concerns)

Return ONLY valid JSON array, no markdown."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    
    try:
        text = response.choices[0].message.content
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return [{"type": "error", "description": "Could not parse conflicts"}]


def briefing_agent(graph_data, question="What changed today?"):
    """Answers questions about the organization's current state."""
    
    prompt = f"""You are an AI Chief of Staff. You have full knowledge of the organization's communications.

Here is the current state:
- Decisions: {json.dumps(graph_data['decisions'], indent=2)}
- Dependencies: {json.dumps(graph_data['dependencies'], indent=2)}
- People in the org: {json.dumps([n for n in graph_data['nodes'] if n.get('type') == 'person'], indent=2)}

The user asks: "{question}"

Give a clear, concise briefing. Use bullet points. Mention specific people, dates, and numbers.
If there are conflicts or risks, highlight them."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    return response.choices[0].message.content


def router_agent(graph_data, new_update):
    """Decides who needs to know about a new update."""
    
    nodes = graph_data["nodes"]
    edges = graph_data["edges"]
    
    prompt = f"""You are a Router Agent. A new update has come in:

"{new_update}"

Here are all the people in the organization and their connections:
{json.dumps([n for n in nodes if n.get('type') == 'person'], indent=2)}

Here are the communication patterns:
{json.dumps([e for e in edges if e.get('type') == 'communication'], indent=2)}

Decide who needs to be notified about this update. Return a JSON array of objects:
- "person": email of the person
- "reason": why they need to know
- "urgency": "immediate" | "soon" | "fyi"

Return ONLY valid JSON array, no markdown."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    
    try:
        text = response.choices[0].message.content
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return []


if __name__ == "__main__":
    graph_data = load_graph_data()
    
    print("=" * 50)
    print("CRITIC AGENT — Finding Issues...")
    print("=" * 50)
    issues = critic_agent(graph_data)
    for issue in issues:
        print(f"\n🔴 [{issue.get('severity', '').upper()}] {issue.get('type', '').upper()}")
        print(f"   {issue.get('description', '')}")
        print(f"   People: {', '.join(issue.get('people_involved', []))}")
        print(f"   Fix: {issue.get('recommendation', '')}")
    
    # Save issues
    with open("data/issues.json", "w") as f:
        json.dump(issues, f, indent=2)
    
    print("\n" + "=" * 50)
    print("BRIEFING AGENT — What changed today?")
    print("=" * 50)
    briefing = briefing_agent(graph_data)
    print(briefing)
    
    print("\n" + "=" * 50)
    print("ROUTER AGENT — Who needs to know about a new update?")
    print("=" * 50)
    routing = router_agent(graph_data, "Engineering says payment integration will be delayed by another week. New estimate is April 7.")
    for r in routing:
        print(f"\n📩 {r.get('person', '')} [{r.get('urgency', '')}]")
        print(f"   Reason: {r.get('reason', '')}")