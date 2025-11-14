"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.config import Settings, get_settings
from ...core.database import get_session
from ...core.rate_limit import get_rate_limiter, login_rate_limit
from ...core.security import create_access_token, get_current_user, verify_password
from ...models import User
from ...schemas.auth import LoginRequest, TokenResponse
from ...schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = get_rate_limiter()


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Realiza login e retorna o token JWT",
)
@limiter.limit(login_rate_limit())
async def login(
    request: Request,
    payload: LoginRequest,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_session),
) -> JSONResponse:
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
    payload_data = TokenResponse(access_token=token).model_dump()
    return JSONResponse(content=payload_data)


@router.get("/me", response_model=UserPublic, summary="Retorna o usuário autenticado")
def read_current_user(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Gera um novo token JWT para sessões ativas",
)
@limiter.limit(login_rate_limit())
async def refresh_token(
    request: Request,
    current_user: UserPublic = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    token = create_access_token(
        subject=str(current_user.id),
        role=current_user.role,
        settings=settings,
        extra_claims={"email": current_user.email, "name": current_user.full_name},
    )
    payload_data = TokenResponse(access_token=token).model_dump()
    return JSONResponse(content=payload_data)
