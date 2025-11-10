"""Authentication-related Pydantic models."""

from pydantic import BaseModel, EmailStr, Field

from .user import Role, UserPublic


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="E-mail institucional")
    password: str = Field(..., min_length=6, description="Senha do usuário")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
