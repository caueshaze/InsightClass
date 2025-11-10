"""Authentication and authorization helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .database import get_session
from ..models import User
from ..schemas.user import UserPublic

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class AuthenticationError(HTTPException):
    """HTTPException specialized for authentication failures."""

    def __init__(self, detail: str = "Não autorizado") -> None:
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Validate a password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except ValueError:
        return False


def create_access_token(
    *,
    subject: str,
    role: str,
    settings: Settings,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a signed JWT containing the subject (user id) and role."""
    expire_delta = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode: Dict[str, Any] = {"sub": subject, "role": role, "exp": expire}
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(*, token: str, settings: Settings) -> Dict[str, Any]:
    """Decode and validate a JWT, raising AuthenticationError on failure."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # pragma: no cover - thin wrapper
        raise AuthenticationError("Token inválido") from exc
    return payload


def get_current_user(
    token: str = Depends(oauth2_scheme),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_session),
) -> UserPublic:
    """Resolve o usuário atual a partir do token JWT."""
    payload = decode_access_token(token=token, settings=settings)

    subject = payload.get("sub")
    role = payload.get("role")

    if not subject or not role:
        raise AuthenticationError("Token sem sujeito ou cargo válido")

    # IDs agora são strings (UUID); não tentamos converter para int
    user_id = str(subject)

    user = db.get(User, user_id)
    if not user:
        raise AuthenticationError("Usuário não encontrado")

    return UserPublic.model_validate(user)

def require_role(*roles: str) -> Callable[[UserPublic], UserPublic]:
    """Build a dependency that ensures the current user owns one of the allowed roles."""

    allowed_roles = {str(role) for role in roles} if roles else set()

    def _dependency(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
        if allowed_roles and current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão negada para usuários com cargo '{current_user.role}'",
            )
        return current_user

    return _dependency
