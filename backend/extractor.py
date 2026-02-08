import json
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_info(message):
    prompt = f"""Analyze this company communication and extract structured information.

From: {message['from']}
To: {', '.join(message['to'])}
Subject: {message['subject']}
Body: {message['body']}
Timestamp: {message['timestamp']}
Type: {message['type']}

Return a JSON object with these fields:
- sender: email of sender
- recipients: list of recipient emails
- topics: list of key topics discussed
- decisions: list of decisions made (empty list if none)
- action_items: list of objects with "owner" and "task" and "deadline" fields
- dependencies: list of objects with "blocker" (person blocking) and "blocked" (person waiting) and "reason"
- sentiment: "positive", "neutral", "negative", or "urgent"
- key_facts: list of important facts or numbers mentioned

Return ONLY valid JSON, no markdown, no explanation."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        # Try to clean up the response
        text = response.choices[0].message.content
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)


def process_all_messages():
    with open("data/sample_comms.json", "r") as f:
        messages = json.load(f)

    results = []
    for i, msg in enumerate(messages):
        print(f"Processing message {i+1}/{len(messages)}: {msg['subject']}")
        extracted = extract_info(msg)
        extracted["original_id"] = msg["id"]
        extracted["timestamp"] = msg["timestamp"]
        extracted["type"] = msg["type"]
        extracted["subject"] = msg["subject"]
        results.append(extracted)

    with open("data/extracted.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nDone! Extracted info from {len(results)} messages.")
    print("Saved to data/extracted.json")
    return results


if __name__ == "__main__":
    process_all_messages()