"""User-related domain services."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from ..core.security import hash_password
from ..models import Feedback, User
from ..schemas.user import Role, UserCreate, UserPublic, UserUpdate
from .access_control import manager_school_or_error, resolve_school_assignment
from .organization_service import (
    require_classroom,
    require_school,
    require_subject,
)


def _ensure_school_for_role(role: Role, school_id: Optional[int]) -> None:
    if role in {"gestor", "professor", "aluno"} and not school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É necessário informar a unidade escolar para este perfil",
        )


def _validate_professor_subjects(
    db: Session,
    school_id: Optional[int],
    subject_ids: Optional[list[int]],
):
    if school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe a unidade escolar antes de cadastrar professores",
        )
    if not subject_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professores precisam ter ao menos uma matéria habilitada",
        )
    normalized_ids = sorted(set(subject_ids))
    return [
        require_subject(db, subject_id, school_id)
        for subject_id in normalized_ids
    ]


def create_user(
    db: Session,
    payload: UserCreate,
    current_user: UserPublic,
) -> User:
    normalized_email = payload.email.lower()
    existing = db.execute(select(User).where(User.email == normalized_email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )

    target_school_id = resolve_school_assignment(current_user, payload.school_id)
    _ensure_school_for_role(payload.role, target_school_id)

    school = require_school(db, target_school_id) if target_school_id else None
    classroom = None
    teachable_subjects = []

    if payload.role == "gestor":
        pass
    elif payload.role == "professor":
        teachable_subjects = _validate_professor_subjects(
            db,
            school.id if school else None,
            payload.teachable_subject_ids,
        )
    elif payload.role == "aluno":
        if not school:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Alunos precisam estar vinculados a uma unidade escolar",
            )
        classroom = require_classroom(db, payload.classroom_id, school.id)
    elif payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil inválido",
        )

    new_user = User(
        email=normalized_email,
        full_name=payload.full_name.strip(),
        role=payload.role,
        school_id=school.id if school else None,
        classroom_id=classroom.id if classroom else None,
        hashed_password=hash_password(payload.password),
    )
    if teachable_subjects:
        new_user.teachable_subjects = teachable_subjects

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user(
    db: Session,
    user_id: str,
    payload: UserUpdate,
    current_user: UserPublic,
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    if user.role == "admin" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente administradores podem alterar este perfil",
        )
    if current_user.role == "gestor":
        manager_school_id = manager_school_or_error(current_user)
        if user.school_id != manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem editar usuários da própria unidade",
            )
        if user.role not in {"professor", "aluno"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem editar professores ou alunos",
            )

    target_role = payload.role or user.role
    requested_school_id = payload.school_id if payload.school_id is not None else user.school_id
    target_school_id = resolve_school_assignment(current_user, requested_school_id)
    _ensure_school_for_role(target_role, target_school_id)

    school = require_school(db, target_school_id) if target_school_id else None
    classroom = None
    teachable_subjects = []

    if payload.email and payload.email.lower() != user.email:
        duplicate = (
            db.execute(
                select(User).where(
                    User.email == payload.email.lower(),
                    User.id != user.id,
                )
            )
            .scalar_one_or_none()
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="E-mail já cadastrado",
            )
        user.email = payload.email.lower()
    if payload.full_name:
        user.full_name = payload.full_name.strip()
    if payload.password:
        user.hashed_password = hash_password(payload.password)

    if target_role == "professor":
        desired_subject_ids = (
            payload.teachable_subject_ids
            if payload.teachable_subject_ids is not None
            else [subject.id for subject in user.teachable_subjects]
        )
        teachable_subjects = _validate_professor_subjects(
            db,
            school.id if school else None,
            desired_subject_ids,
        )
    elif target_role == "aluno":
        target_classroom_id = (
            payload.classroom_id
            if payload.classroom_id is not None
            else user.classroom_id
        )
        effective_school_id = school.id if school else user.school_id
        if not effective_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Alunos precisam estar vinculados a uma unidade escolar",
            )
        classroom = require_classroom(
            db,
            target_classroom_id,
            effective_school_id,
        )

    user.role = target_role
    user.school_id = school.id if school else None
    user.classroom_id = classroom.id if classroom else (user.classroom_id if target_role == "aluno" else None)
    if target_role == "professor":
        user.teachable_subjects = teachable_subjects
    else:
        user.teachable_subjects = []

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(
    db: Session,
    current_user: UserPublic,
    *,
    normalized_role: Optional[str],
    offset: int,
    limit: int,
) -> list[User]:
    if normalized_role is None and current_user.role not in {"admin", "gestor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil sem permissão para listar todos os usuários",
        )
    if normalized_role and current_user.role not in {"admin", "gestor"}:
        allowed = {
            "gestor": {"gestor", "professor", "aluno"},
            "professor": {"gestor", "professor", "aluno"},
            "aluno": {"gestor", "professor", "aluno"},
        }
        if current_user.role not in allowed.get(normalized_role, set()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil sem permissão para visualizar esse tipo de usuário",
            )

    query = select(User).options(selectinload(User.teachable_subjects))
    if current_user.role == "gestor":
        manager_school_id = manager_school_or_error(current_user)
        query = query.where(User.school_id == manager_school_id)
    elif current_user.role in {"professor", "aluno"}:
        if not current_user.school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seu perfil não está vinculado a uma unidade escolar",
            )
        query = query.where(User.school_id == current_user.school_id)

    if normalized_role:
        query = query.where(User.role == normalized_role)
    query = query.offset(offset).limit(limit)
    return db.execute(query).scalars().all()


def delete_user(db: Session, user_id: str, current_user: UserPublic) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    if current_user.role == "gestor":
        manager_school_id = manager_school_or_error(current_user)
        if user.role not in {"professor", "aluno"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem remover professores ou alunos",
            )
        if user.school_id != manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário pertence a outra unidade",
            )
    if user.role == "admin" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente administradores podem remover este perfil",
        )
    db.execute(
        delete(Feedback).where(
            Feedback.target_type == "user",
            Feedback.target_id == user_id,
        )
    )
    db.delete(user)
    db.commit()
