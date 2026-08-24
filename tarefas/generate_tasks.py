#!/usr/bin/env python3
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ACTIVE_STATUSES = {"triage", "todo", "ready", "running", "review", "blocked", "scheduled"}
STATUS_LABELS = {
    "triage": "Triagem",
    "todo": "A fazer",
    "ready": "Pronta",
    "running": "Em execução",
    "review": "Revisão",
    "blocked": "Bloqueada",
    "scheduled": "Agendada",
}

raw = subprocess.check_output(
    ["hermes", "kanban", "list", "--tenant", "pessoal", "--json"],
    text=True,
)
items = json.loads(raw)
active = [t for t in items if t.get("status") in ACTIVE_STATUSES]
active.sort(key=lambda t: (-(t.get("priority") or 0), t.get("created_at") or 0, t.get("title") or ""))

payload = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "tenant": "pessoal",
    "source": "hermes kanban list --tenant pessoal --json",
    "active_statuses": sorted(ACTIVE_STATUSES),
    "count": len(active),
    "tasks": [
        {
            "id": t.get("id"),
            "title": t.get("title") or "Sem título",
            "body": t.get("body") or "",
            "status": t.get("status"),
            "status_label": STATUS_LABELS.get(t.get("status"), t.get("status") or ""),
            "priority": t.get("priority") or 0,
            "assignee": t.get("assignee") or "Sancho",
            "created_at": t.get("created_at"),
        }
        for t in active
    ],
}

(ROOT / "tasks.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {payload['count']} active tasks to {ROOT / 'tasks.json'}")
