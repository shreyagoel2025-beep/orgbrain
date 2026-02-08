import json
import networkx as nx

def build_graph():
    with open("data/extracted.json", "r") as f:
        messages = json.load(f)

    G = nx.DiGraph()

    all_decisions = []
    all_dependencies = []

    for msg in messages:
        sender = msg["sender"]
        recipients = msg["recipients"]
        topics = msg.get("topics", [])
        decisions = msg.get("decisions", [])
        action_items = msg.get("action_items", [])
        dependencies = msg.get("dependencies", [])
        timestamp = msg["timestamp"]

        # Add person nodes
        if not G.has_node(sender):
            G.add_node(sender, type="person", messages_sent=0)
        G.nodes[sender]["messages_sent"] += 1

        for r in recipients:
            if not G.has_node(r):
                G.add_node(r, type="person", messages_sent=0)

        # Add communication edges
        for r in recipients:
            if G.has_edge(sender, r):
                G[sender][r]["weight"] += 1
                G[sender][r]["timestamps"].append(timestamp)
            else:
                G.add_edge(sender, r, type="communication", weight=1, timestamps=[timestamp])

        # Add topic nodes and connect people to topics
        for topic in topics:
            topic_lower = topic.lower()
            if not G.has_node(topic_lower):
                G.add_node(topic_lower, type="topic", mention_count=0)
            G.nodes[topic_lower]["mention_count"] += 1
            G.add_edge(sender, topic_lower, type="discusses")

        # Track decisions
        for decision in decisions:
            all_decisions.append({
                "decision": decision,
                "made_by": sender,
                "timestamp": timestamp,
                "subject": msg.get("subject", "")
            })

        # Track dependencies
        for dep in dependencies:
            all_dependencies.append({
                "blocker": dep.get("blocker", ""),
                "blocked": dep.get("blocked", ""),
                "reason": dep.get("reason", ""),
                "timestamp": timestamp
            })

        # Add action item edges
        for item in action_items:
            owner = item.get("owner", "")
            task = item.get("task", "")
            if owner and task:
                if not G.has_node(owner):
                    G.add_node(owner, type="person", messages_sent=0)
                task_node = f"task: {task[:50]}"
                G.add_node(task_node, type="action_item", owner=owner, deadline=item.get("deadline", ""))
                G.add_edge(owner, task_node, type="assigned_to")

    # Summary
    people = [n for n, d in G.nodes(data=True) if d.get("type") == "person"]
    topics = [n for n, d in G.nodes(data=True) if d.get("type") == "topic"]
    tasks = [n for n, d in G.nodes(data=True) if d.get("type") == "action_item"]

    print(f"\n=== KNOWLEDGE GRAPH BUILT ===")
    print(f"People: {len(people)}")
    print(f"Topics: {len(topics)}")
    print(f"Action Items: {len(tasks)}")
    print(f"Decisions: {len(all_decisions)}")
    print(f"Dependencies: {len(all_dependencies)}")
    print(f"Total Nodes: {G.number_of_nodes()}")
    print(f"Total Edges: {G.number_of_edges()}")

    # Save graph data for frontend
    graph_data = {
        "nodes": [],
        "edges": [],
        "decisions": all_decisions,
        "dependencies": all_dependencies
    }

    for node, data in G.nodes(data=True):
        graph_data["nodes"].append({"id": node, **data})

    for u, v, data in G.edges(data=True):
        edge_data = {k: v for k, v in data.items() if k != "timestamps"}
        graph_data["edges"].append({"source": u, "target": v, **edge_data})

    with open("data/graph_data.json", "w") as f:
        json.dump(graph_data, f, indent=2)

    print(f"\nSaved graph to data/graph_data.json")
    return G, graph_data


if __name__ == "__main__":
    build_graph()
    