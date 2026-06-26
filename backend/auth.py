import os
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET", "dev-secret-change-me")
    print("JWT SECRET:", secret)
    return secret


def _jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def create_access_token(user: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=12)).timestamp()),
    }

    token = jwt.encode(
        payload,
        _jwt_secret(),
        algorithm=_jwt_algorithm(),
    )

    print("GENERATED TOKEN:", token)

    return token


def decode_access_token(token: str) -> dict[str, Any]:
    print("=" * 80)
    print("TOKEN RECEIVED:", token)

    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=[_jwt_algorithm()],
        )

        print("JWT PAYLOAD:", payload)

        return payload

    except Exception as e:
        print("JWT ERROR:", repr(e))

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    print("AUTH HEADER:", credentials.credentials)

    payload = decode_access_token(credentials.credentials)

    return {
        "id": int(payload["sub"]),
        "email": payload["email"],
    }