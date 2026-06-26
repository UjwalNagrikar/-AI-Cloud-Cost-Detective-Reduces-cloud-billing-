import asyncio
import uuid
from datetime import datetime
from typing import Any

import asyncpg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

import db
from ai_analyzer import analyze_costs
from auth import create_access_token, decode_access_token, get_current_user, hash_password, verify_password
from azure_scanner import AzureCliError, list_resource_groups, scan_resource_group


load_dotenv()

app = FastAPI(title="AI Cloud Cost Detective API")

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


class ProgressManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = {}
        self._messages: dict[str, list[dict[str, Any]]] = {}

    async def connect(self, analysis_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(analysis_id, set()).add(websocket)
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


class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class AnalyzeRequest(BaseModel):
    resource_group: str = Field(min_length=1)
    analysis_id: str | None = None


def serialize_record(record: dict[str, Any]) -> dict[str, Any]:
    serialized = dict(record)
    if isinstance(serialized.get("created_at"), datetime):
        serialized["created_at"] = serialized["created_at"].isoformat()
    return serialized


@app.on_event("startup")
async def startup() -> None:
    await db.init_db()


@app.on_event("shutdown")
async def shutdown() -> None:
    await db.close_db()


@app.post("/api/auth/signup")
async def signup(payload: AuthRequest) -> dict[str, Any]:
    try:
        user = await db.create_user(payload.email, hash_password(payload.password))
    except (ValueError, asyncpg.exceptions.UniqueViolationError) as exc:
        raise HTTPException(status_code=409, detail="Email is already registered.") from exc

    return {"token": create_access_token(user), "user": {"id": user["id"], "email": user["email"]}}


@app.post("/api/auth/login")
async def login(payload: AuthRequest) -> dict[str, Any]:
    user = await db.get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {"token": create_access_token(user), "user": {"id": user["id"], "email": user["email"]}}


@app.get("/api/resource-groups")
async def resource_groups(_: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    try:
        groups = await asyncio.to_thread(list_resource_groups)
    except AzureCliError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return {"resource_groups": groups}


@app.post("/api/analyze")
async def analyze(
    payload: AnalyzeRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
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

        await progress_manager.publish(analysis_id, "Storing results...")
        record = await db.save_analysis(
            analysis_id=analysis_id,
            user_id=user["id"],
            resource_group=payload.resource_group,
            resources_scanned=len(resources),
            issues_found=len(ai_result["issues"]),
            estimated_savings=ai_result["estimated_savings"],
            analysis_result=final_result,
            status="complete",
        )

        await progress_manager.publish(analysis_id, "Analysis complete", status="complete")
        return serialize_record(record)
    except AzureCliError as exc:
        await progress_manager.publish(analysis_id, str(exc), status="error")
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except RuntimeError as exc:
        await progress_manager.publish(analysis_id, str(exc), status="error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/history")
async def history(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    records = await db.list_analyses(user["id"])
    return {"analyses": [serialize_record(record) for record in records]}


@app.get("/api/history/{analysis_id}")
async def history_detail(
    analysis_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        record = await db.get_analysis(user["id"], analysis_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="analysis_id must be a valid UUID.") from exc

    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return serialize_record(record)


@app.websocket("/ws/progress/{analysis_id}")
async def websocket_progress(
    websocket: WebSocket,
    analysis_id: str,
    token: str | None = Query(default=None),
) -> None:
    if not token:
        await websocket.close(code=1008)
        return

    try:
        decode_access_token(token)
        uuid.UUID(analysis_id)
    except Exception:
        await websocket.close(code=1008)
        return

    await progress_manager.connect(analysis_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        progress_manager.disconnect(analysis_id, websocket)
