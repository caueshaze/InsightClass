"""CRUD endpoints for School records."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ....core.database import get_session
from ....models import Classroom, School, Subject, User
from ....schemas.school import SchoolCreate, SchoolPublic, SchoolUpdate
from ....schemas.user import UserPublic
from .deps import require_admin_user

router = APIRouter(prefix="/schools")


@router.post(
    "",
    response_model=SchoolPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova unidade escolar",
)
def create_school(
    payload: SchoolCreate,
    _: UserPublic = Depends(require_admin_user("admin")),
    db: Session = Depends(get_session),
) -> SchoolPublic:
    if db.scalar(select(func.count()).where(School.name == payload.name)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nome já cadastrado",
        )
    if payload.code:
        conflict = db.scalar(select(func.count()).where(School.code == payload.code))
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código já cadastrado",
            )
    school = School(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
    )
    db.add(school)
    db.commit()
    db.refresh(school)
    return SchoolPublic.model_validate(school)


@router.get(
    "",
    response_model=list[SchoolPublic],
    summary="Lista unidades escolares",
)
def list_schools(
    _: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> list[SchoolPublic]:
    schools = db.execute(select(School).order_by(School.name)).scalars().all()
    return [SchoolPublic.model_validate(item) for item in schools]


@router.put(
    "/{school_id}",
    response_model=SchoolPublic,
    summary="Atualiza uma unidade escolar",
)
def update_school(
    school_id: int,
    payload: SchoolUpdate,
    _: UserPublic = Depends(require_admin_user("admin")),
    db: Session = Depends(get_session),
) -> SchoolPublic:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidade escolar não encontrada",
        )
    conflict = (
        db.execute(
            select(School).where(School.id != school_id, School.name == payload.name)
        )
        .scalar_one_or_none()
    )
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe outra unidade com este nome",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(School).where(
                    School.id != school_id,
                    School.code == payload.code,
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código já utilizado por outra unidade",
            )
    for field in (
        "name",
        "code",
        "description",
        "contact_email",
        "contact_phone",
        "address",
        "city",
        "state",
    ):
        setattr(school, field, getattr(payload, field))
    db.add(school)
    db.commit()
    db.refresh(school)
    return SchoolPublic.model_validate(school)


@router.delete(
    "/{school_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma unidade escolar",
)
def delete_school(
    school_id: int,
    _: UserPublic = Depends(require_admin_user("admin")),
    db: Session = Depends(get_session),
) -> None:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidade escolar não encontrada",
        )
    has_subjects = db.scalar(
        select(func.count()).select_from(Subject).where(Subject.school_id == school_id)
    )
    has_classrooms = db.scalar(
        select(func.count()).select_from(Classroom).where(Classroom.school_id == school_id)
    )
    has_users = db.scalar(
        select(func.count()).select_from(User).where(User.school_id == school_id)
    )
    if has_subjects or has_classrooms or has_users:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover: existem registros dependentes",
        )
    db.delete(school)
    db.commit()
