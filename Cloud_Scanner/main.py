import asyncio
import uuid
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_analyzer import analyze_costs
from azure_scanner import AzureCliError, list_resource_groups, scan_resource_group

load_dotenv()

app = FastAPI(title="AI Cloud Cost Detective")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.113.63.247:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- In‑memory analysis storage ----------
analyses_store: dict[str, dict[str, Any]] = {}


# ---------- Progress Manager ----------
class ProgressManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}
        self._messages: dict[str, list[dict[str, Any]]] = {}

    async def connect(self, analysis_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(analysis_id, set()).add(websocket)
        # Send past messages
        for message in self._messages.get(analysis_id, []):
            await websocket.send_json(message)

    def disconnect(self, analysis_id: str, websocket: WebSocket) -> None:
        self._connections.get(analysis_id, set()).discard(websocket)

    async def publish(self, analysis_id: str, message: str, status: str = "running") -> None:
        payload = {
            "analysis_id": analysis_id,
            "message": message,
            "status": status,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        self._messages.setdefault(analysis_id, []).append(payload)

        stale: list[WebSocket] = []
        for websocket in self._connections.get(analysis_id, set()):
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                stale.append(websocket)

        for websocket in stale:
            self.disconnect(analysis_id, websocket)


progress_manager = ProgressManager()


# ---------- Pydantic models ----------
class AnalyzeRequest(BaseModel):
    resource_group: str = Field(min_length=1)
    analysis_id: str | None = None


# ---------- Endpoints ----------
@app.get("/api/resource-groups")
async def resource_groups() -> dict[str, Any]:
    try:
        groups = await asyncio.to_thread(list_resource_groups)
    except AzureCliError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"resource_groups": groups}


@app.post("/api/analyze")
async def analyze(payload: AnalyzeRequest) -> dict[str, Any]:
    analysis_id = payload.analysis_id or str(uuid.uuid4())

    try:
        uuid.UUID(analysis_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="analysis_id must be a valid UUID.") from exc

    try:
        await progress_manager.publish(analysis_id, "Fetching resource groups...")
        await asyncio.to_thread(list_resource_groups)

        await progress_manager.publish(
            analysis_id,
            f"Scanning resources in {payload.resource_group}...",
        )
        resources = await asyncio.to_thread(scan_resource_group, payload.resource_group)

        await progress_manager.publish(analysis_id, "Analyzing costs with AI...")
        ai_result = await asyncio.to_thread(analyze_costs, resources)

        final_result = {
            "analysis_id": analysis_id,
            "resource_group": payload.resource_group,
            "resources_scanned": len(resources),
            "issues_found": len(ai_result["issues"]),
            **ai_result,
        }

        # Store in memory
        analyses_store[analysis_id] = {
            "id": analysis_id,
            "resource_group": payload.resource_group,
            "resources_scanned": len(resources),
            "issues_found": len(ai_result["issues"]),
            "estimated_savings": ai_result["estimated_savings"],
            "analysis_result": final_result,
            "status": "complete",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

        await progress_manager.publish(analysis_id, "Analysis complete", status="complete")
        return analyses_store[analysis_id]

    except AzureCliError as exc:
        await progress_manager.publish(analysis_id, str(exc), status="error")
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except RuntimeError as exc:
        await progress_manager.publish(analysis_id, str(exc), status="error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/analyses")
async def list_analyses() -> dict[str, Any]:
    """Return all stored analyses (public)."""
    return {"analyses": list(analyses_store.values())}


@app.get("/api/analyses/{analysis_id}")
async def get_analysis(analysis_id: str) -> dict[str, Any]:
    try:
        uuid.UUID(analysis_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="analysis_id must be a valid UUID.") from exc

    record = analyses_store.get(analysis_id)
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return record


@app.websocket("/ws/progress/{analysis_id}")
async def websocket_progress(websocket: WebSocket, analysis_id: str) -> None:
    # No token required – accept any connection
    try:
        uuid.UUID(analysis_id)
    except ValueError:
        await websocket.close(code=1008)
        return

    await progress_manager.connect(analysis_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        progress_manager.disconnect(analysis_id, websocket)
