"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.config import Settings, get_settings
from ...core.database import get_session
from ...core.security import create_access_token, get_current_user, verify_password
from ...models import User
from ...schemas.auth import LoginRequest, TokenResponse
from ...schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse, summary="Realiza login e retorna o token JWT")
def login(
    payload: LoginRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_session),
) -> TokenResponse:
    normalized_email = payload.email.lower()
    user = db.execute(select(User).where(User.email == normalized_email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        )

    token = create_access_token(
        subject=str(user.id),
        role=user.role,
        settings=settings,
        extra_claims={"email": user.email, "name": user.full_name},
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserPublic, summary="Retorna o usuário autenticado")
def read_current_user(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user
