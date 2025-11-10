"""Administrative endpoints restricted to privileged roles."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ...core.database import get_session
from ...core.security import hash_password, require_role
from ...models.organization import (
    Classroom,
    School,
    Subject,
    classroom_subjects_table,
    teacher_classrooms_table,
)
from ...models.user import User
from ...schemas.classroom import ClassroomCreate, ClassroomPublic, ClassroomUpdate
from ...schemas.school import SchoolCreate, SchoolPublic, SchoolUpdate
from ...schemas.subject import SubjectCreate, SubjectPublic, SubjectUpdate
from ...schemas.user import Role, UserCreate, UserPublic, UserUpdate

# Endpoints: /api/v1/admin/...
router = APIRouter(prefix="/admin", tags=["admin"])

ROLE_ALIASES = {
    "admin": "admin",
    "gestor": "gestor",
    "manager": "gestor",
    "professor": "professor",
    "teacher": "professor",
    "aluno": "aluno",
    "student": "aluno",
}


def _normalize_role_param(role: Optional[str]) -> Optional[str]:
    if role is None:
        return None
    normalized = ROLE_ALIASES.get(role.lower())
    if not normalized:
        return None
    return normalized


def _require_school(db: Session, school_id: Optional[int]) -> School:
    if school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="school_id é obrigatório para este perfil",
        )
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidade escolar não encontrada",
        )
    return school


def _require_classroom(
    db: Session, classroom_id: Optional[int], school_id: int
) -> Classroom:
    if classroom_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="classroom_id é obrigatório para este perfil",
        )
    classroom = db.get(Classroom, classroom_id)
    if not classroom or classroom.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turma inválida para a unidade informada",
        )
    return classroom


def _require_subject(db: Session, subject_id: Optional[int], school_id: int) -> Subject:
    if subject_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="subject_id é obrigatório para professores",
        )
    subject = db.get(Subject, subject_id)
    if not subject or subject.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matéria inválida para a unidade informada",
        )
    return subject


def _manager_school_or_error(user: UserPublic) -> int:
    if not user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seu perfil de gestor não está vinculado a uma unidade escolar",
        )
    return user.school_id


def _resolve_school_assignment(
    current_user: UserPublic, requested_school_id: Optional[int]
) -> Optional[int]:
    if current_user.role != "gestor":
        return requested_school_id
    manager_school_id = _manager_school_or_error(current_user)
    if requested_school_id and requested_school_id != manager_school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem operar na unidade atribuída",
        )
    return manager_school_id


def _enforce_same_school(current_user: UserPublic, school_id: int) -> None:
    if current_user.role == "gestor":
        manager_school_id = _manager_school_or_error(current_user)
        if school_id != manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem operar na própria unidade",
            )


def _resolve_teacher(
    db: Session, teacher_id: Optional[str], school_id: int
) -> Optional[User]:
    if teacher_id is None:
        return None
    teacher = db.get(User, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    if teacher.role != "professor":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário selecionado não é um professor",
        )
    if teacher.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professor vinculado a outra unidade",
        )
    return teacher


@router.post(
    "/users",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo usuário",
)
def create_user(
    payload: UserCreate,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> UserPublic:
    """Registra um novo usuário garantindo e-mail único."""
    normalized_email = payload.email.lower()

    existing = (
        db.execute(select(User).where(User.email == normalized_email))
        .scalar_one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )

    school: Optional[School] = None
    classroom: Optional[Classroom] = None
    subject: Optional[Subject] = None
    teaching_classrooms: list[Classroom] = []

    target_school_id = _resolve_school_assignment(current_user, payload.school_id)
    if payload.role in {"gestor", "professor", "aluno"} and not target_school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É necessário informar a unidade escolar para este perfil",
        )

    if current_user.role == "gestor" and payload.role not in {"professor", "aluno"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem criar professores ou alunos",
        )

    if payload.role == "admin":
        pass
    elif payload.role == "gestor":
        school = _require_school(db, target_school_id)
    elif payload.role == "professor":
        school = _require_school(db, target_school_id)
        subject = _require_subject(db, payload.subject_id, school.id)
        classroom_ids = payload.classroom_ids or []
        if not classroom_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selecione ao menos uma turma para o professor",
            )
        unique_classroom_ids = sorted(set(classroom_ids))
        for classroom_id in unique_classroom_ids:
            assigned_classroom = _require_classroom(db, classroom_id, school.id)
            if subject.id not in assigned_classroom.subject_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A turma selecionada não possui a matéria indicada",
                )
            teaching_classrooms.append(assigned_classroom)
    elif payload.role == "aluno":
        school = _require_school(db, target_school_id)
        classroom = _require_classroom(db, payload.classroom_id, school.id)
        if not classroom.subject_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A turma selecionada não possui uma matéria vinculada",
            )
        subject = db.get(Subject, classroom.subject_ids[0])
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Matéria vinculada à turma não encontrada",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Perfil inválido"
        )

    new_user = User(
        email=normalized_email,
        full_name=payload.full_name,
        role=payload.role,
        school_id=school.id if school else None,
        classroom_id=classroom.id if classroom and payload.role != "professor" else None,
        subject_id=subject.id if subject else None,
        hashed_password=hash_password(payload.password),
    )

    if teaching_classrooms:
        new_user.teaching_classrooms = teaching_classrooms

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserPublic.model_validate(new_user)


@router.put(
    "/users/{user_id}",
    response_model=UserPublic,
    summary="Atualiza um usuário existente",
)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> UserPublic:
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
        manager_school_id = _manager_school_or_error(current_user)
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
        if payload.role and payload.role not in {"professor", "aluno"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores não podem alterar este perfil",
            )

    target_role = payload.role or user.role
    target_school_id = (
        payload.school_id if payload.school_id is not None else user.school_id
    )

    if target_role in {"gestor", "professor", "aluno"} and not target_school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfis vinculados precisam de uma unidade escolar",
        )

    normalized_email = payload.email.lower() if payload.email else user.email
    if normalized_email != user.email:
        existing = (
            db.execute(
                select(User).where(
                    User.email == normalized_email,
                    User.id != user_id,
                )
            )
            .scalar_one_or_none()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="E-mail já cadastrado",
            )
    user.email = normalized_email
    if payload.full_name:
        user.full_name = payload.full_name.strip()
    if payload.password:
        user.hashed_password = hash_password(payload.password)

    school: Optional[School] = None
    classroom: Optional[Classroom] = None
    subject: Optional[Subject] = None
    teaching_classrooms: list[Classroom] = []

    if target_role == "admin":
        pass
    elif target_role == "gestor":
        school = _require_school(db, target_school_id)
    elif target_role == "professor":
        school = _require_school(db, target_school_id)
        target_subject_id = (
            payload.subject_id if payload.subject_id is not None else user.subject_id
        )
        subject = _require_subject(db, target_subject_id, school.id)

        classroom_ids = (
            payload.classroom_ids
            if payload.classroom_ids is not None
            else [c.id for c in user.teaching_classrooms]
        )
        if not classroom_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selecione ao menos uma turma para o professor",
            )
        for classroom_id in sorted(set(classroom_ids)):
            assigned_classroom = _require_classroom(db, classroom_id, school.id)
            if subject.id not in assigned_classroom.subject_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A turma selecionada não possui a matéria indicada",
                )
            teaching_classrooms.append(assigned_classroom)
    elif target_role == "aluno":
        school = _require_school(db, target_school_id)
        target_classroom_id = (
            payload.classroom_id
            if payload.classroom_id is not None
            else user.classroom_id
        )
        classroom = _require_classroom(db, target_classroom_id, school.id)
        if not classroom.subject_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A turma selecionada não possui uma matéria vinculada",
            )
        subject = db.get(Subject, classroom.subject_ids[0])
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Matéria vinculada à turma não encontrada",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perfil inválido",
        )

    user.role = target_role
    user.school_id = school.id if school else None
    if target_role == "aluno":
        user.classroom_id = classroom.id if classroom else None
        user.subject_id = subject.id if subject else None
        user.teaching_classrooms = []
    elif target_role == "professor":
        user.classroom_id = None
        user.subject_id = subject.id if subject else None
        user.teaching_classrooms = teaching_classrooms
    else:
        user.classroom_id = None
        user.subject_id = None
        user.teaching_classrooms = []

    db.add(user)
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


def _can_view_role(requester: str, target: str) -> bool:
    visibility_map = {
        "admin": {"admin", "gestor", "professor", "aluno"},
        "gestor": {"gestor", "professor", "aluno"},
        "professor": {"gestor", "aluno"},
        "aluno": {"professor", "gestor"},
    }
    return target in visibility_map.get(requester, set())


@router.get(
    "/users",
    response_model=List[UserPublic],
    summary="Lista usuários com paginação básica",
)
def list_users(
    current_user: UserPublic = Depends(
        require_role("admin", "gestor", "professor", "aluno")
    ),
    db: Session = Depends(get_session),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = Query(
        default=None, description="Filtrar por role específico"
    ),
) -> List[UserPublic]:
    normalized_role = _normalize_role_param(role)
    if normalized_role is None and role is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role inválido",
        )
    if normalized_role is None and current_user.role not in {"admin", "gestor"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil sem permissão para listar todos os usuários",
        )

    if normalized_role is not None and not _can_view_role(current_user.role, normalized_role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil sem permissão para visualizar esse tipo de usuário",
        )

    query = select(User).options(selectinload(User.teaching_classrooms))
    if normalized_role:
        query = query.where(User.role == normalized_role)
    query = query.offset(offset).limit(limit)
    result = db.execute(query).scalars().all()
    return [UserPublic.model_validate(user) for user in result]


@router.get(
    "/users/{user_id}",
    response_model=UserPublic,
    summary="Recupera um usuário específico",
    dependencies=[Depends(require_role("admin"))],
)
def get_user(
    user_id: str,
    db: Session = Depends(get_session),
) -> UserPublic:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return UserPublic.model_validate(user)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um usuário",
)
def delete_user(
    user_id: str,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado"
        )
    if current_user.role == "gestor":
        manager_school_id = _manager_school_or_error(current_user)
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
    db.delete(user)
    db.commit()


@router.post(
    "/schools",
    response_model=SchoolPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova unidade escolar",
    dependencies=[Depends(require_role("admin"))],
)
def create_school(
    payload: SchoolCreate,
    db: Session = Depends(get_session),
) -> SchoolPublic:
    existing = (
        db.execute(select(School).where(School.name == payload.name))
        .scalar_one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Nome já cadastrado"
        )
    if payload.code:
        code_conflict = (
            db.execute(select(School).where(School.code == payload.code))
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Código já cadastrado"
            )
    school = School(name=payload.name, code=payload.code)
    db.add(school)
    db.commit()
    db.refresh(school)
    return SchoolPublic.model_validate(school)


@router.get(
    "/schools",
    response_model=List[SchoolPublic],
    summary="Lista unidades escolares",
)
def list_schools(
    _: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> List[SchoolPublic]:
    schools = db.execute(select(School).order_by(School.name)).scalars().all()
    return [SchoolPublic.model_validate(school) for school in schools]


@router.put(
    "/schools/{school_id}",
    response_model=SchoolPublic,
    summary="Atualiza uma unidade escolar",
    dependencies=[Depends(require_role("admin"))],
)
def update_school(
    school_id: int,
    payload: SchoolUpdate,
    db: Session = Depends(get_session),
) -> SchoolPublic:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unidade escolar não encontrada"
        )
    name_conflict = (
        db.execute(select(School).where(School.id != school_id, School.name == payload.name))
        .scalar_one_or_none()
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma unidade com este nome",
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
    school.name = payload.name
    school.code = payload.code
    db.add(school)
    db.commit()
    db.refresh(school)
    return SchoolPublic.model_validate(school)


@router.delete(
    "/schools/{school_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma unidade escolar",
    dependencies=[Depends(require_role("admin"))],
)
def delete_school(
    school_id: int,
    db: Session = Depends(get_session),
) -> None:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unidade escolar não encontrada"
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


@router.post(
    "/subjects",
    response_model=SubjectPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova matéria",
)
def create_subject(
    payload: SubjectCreate,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> SubjectPublic:
    target_school_id = _resolve_school_assignment(current_user, payload.school_id)
    school = _require_school(db, target_school_id)
    existing = (
        db.execute(
            select(Subject).where(
                Subject.school_id == school.id, Subject.name == payload.name
            )
        )
        .scalar_one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Matéria já cadastrada para esta unidade",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(Subject).where(
                    Subject.school_id == school.id, Subject.code == payload.code
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código já utilizado nesta unidade",
            )
    teacher = _resolve_teacher(db, payload.teacher_id, school.id)
    subject = Subject(
        name=payload.name,
        code=payload.code,
        school_id=school.id,
        teacher_id=teacher.id if teacher else None,
    )
    db.add(subject)
    db.flush()
    if teacher:
        teacher.subject_id = subject.id
        db.add(teacher)
    db.commit()
    db.refresh(subject)
    return SubjectPublic.model_validate(subject)


@router.get(
    "/subjects",
    response_model=List[SubjectPublic],
    summary="Lista matérias cadastradas",
)
def list_subjects(
    _: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: Optional[int] = Query(
        default=None, description="Filtra matérias por unidade"
    ),
) -> List[SubjectPublic]:
    query = select(Subject)
    if school_id is not None:
        query = query.where(Subject.school_id == school_id)
    subjects = db.execute(query.order_by(Subject.name)).scalars().all()
    return [SubjectPublic.model_validate(subject) for subject in subjects]


@router.put(
    "/subjects/{subject_id}",
    response_model=SubjectPublic,
    summary="Atualiza uma matéria",
)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> SubjectPublic:
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Matéria não encontrada"
        )
    _enforce_same_school(current_user, subject.school_id)
    if payload.school_id != subject.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido alterar a unidade da matéria",
        )
    name_conflict = (
        db.execute(
            select(Subject).where(
                Subject.school_id == subject.school_id,
                Subject.name == payload.name,
                Subject.id != subject_id,
            )
        )
        .scalar_one_or_none()
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma matéria com este nome nesta unidade",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(Subject).where(
                    Subject.school_id == subject.school_id,
                    Subject.code == payload.code,
                    Subject.id != subject_id,
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código já utilizado nesta unidade",
            )
    new_teacher = _resolve_teacher(db, payload.teacher_id, subject.school_id)
    previous_teacher_id = subject.teacher_id
    subject.name = payload.name
    subject.code = payload.code
    subject.teacher_id = new_teacher.id if new_teacher else None
    if new_teacher and new_teacher.subject_id != subject.id:
        new_teacher.subject_id = subject.id
        db.add(new_teacher)
    if previous_teacher_id and (not new_teacher or new_teacher.id != previous_teacher_id):
        former_teacher = db.get(User, previous_teacher_id)
        if former_teacher and former_teacher.subject_id == subject.id:
            former_teacher.subject_id = None
            db.add(former_teacher)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectPublic.model_validate(subject)


@router.delete(
    "/subjects/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma matéria",
)
def delete_subject(
    subject_id: int,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Matéria não encontrada"
        )
    _enforce_same_school(current_user, subject.school_id)
    has_classrooms = db.scalar(
        select(func.count()).select_from(Classroom).where(Classroom.subject_id == subject_id)
    )
    has_users = db.scalar(
        select(func.count()).select_from(User).where(User.subject_id == subject_id)
    )
    has_classroom_links = db.scalar(
        select(func.count())
        .select_from(classroom_subjects_table)
        .where(classroom_subjects_table.c.subject_id == subject_id)
    )
    if has_classrooms or has_users or has_classroom_links:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover: existem turmas ou usuários vinculados",
        )
    if subject.teacher_id:
        teacher = db.get(User, subject.teacher_id)
        if teacher and teacher.subject_id == subject.id:
            teacher.subject_id = None
            db.add(teacher)
    db.delete(subject)
    db.commit()


@router.post(
    "/classrooms",
    response_model=ClassroomPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova turma",
)
def create_classroom(
    payload: ClassroomCreate,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> ClassroomPublic:
    target_school_id = _resolve_school_assignment(current_user, payload.school_id)
    school = _require_school(db, target_school_id)
    subject_ids = payload.subject_ids or []
    if not subject_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione ao menos uma matéria para a turma",
        )
    unique_subject_ids = sorted(set(subject_ids))
    subjects = [_require_subject(db, subject_id, school.id) for subject_id in unique_subject_ids]
    existing = (
        db.execute(
            select(Classroom).where(
                Classroom.school_id == school.id, Classroom.name == payload.name
            )
        )
        .scalar_one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Turma já cadastrada para esta unidade",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(Classroom).where(
                    Classroom.school_id == school.id, Classroom.code == payload.code
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código de turma já utilizado nesta unidade",
            )
    classroom = Classroom(
        name=payload.name,
        code=payload.code,
        school_id=school.id,
        subject_id=subjects[0].id,
    )
    classroom.subjects = subjects
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return ClassroomPublic.model_validate(classroom)


@router.get(
    "/classrooms",
    response_model=List[ClassroomPublic],
    summary="Lista turmas cadastradas",
)
def list_classrooms(
    _: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: Optional[int] = Query(
        default=None, description="Filtra turmas por unidade"
    ),
) -> List[ClassroomPublic]:
    query = select(Classroom).options(selectinload(Classroom.subjects))
    if school_id is not None:
        query = query.where(Classroom.school_id == school_id)
    classrooms = db.execute(query.order_by(Classroom.name)).scalars().all()
    return [ClassroomPublic.model_validate(classroom) for classroom in classrooms]


@router.put(
    "/classrooms/{classroom_id}",
    response_model=ClassroomPublic,
    summary="Atualiza uma turma",
)
def update_classroom(
    classroom_id: int,
    payload: ClassroomUpdate,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> ClassroomPublic:
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada"
        )
    _enforce_same_school(current_user, classroom.school_id)
    if payload.school_id != classroom.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido alterar a unidade da turma",
        )
    subject_ids = payload.subject_ids or []
    if not subject_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selecione ao menos uma matéria para a turma",
        )
    unique_subject_ids = sorted(set(subject_ids))
    subjects = [
        _require_subject(db, subject_id, classroom.school_id)
        for subject_id in unique_subject_ids
    ]
    name_conflict = (
        db.execute(
            select(Classroom).where(
                Classroom.school_id == classroom.school_id,
                Classroom.name == payload.name,
                Classroom.id != classroom_id,
            )
        )
        .scalar_one_or_none()
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma turma com este nome nesta unidade",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(Classroom).where(
                    Classroom.school_id == classroom.school_id,
                    Classroom.code == payload.code,
                    Classroom.id != classroom_id,
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código de turma já utilizado nesta unidade",
            )
    classroom.name = payload.name
    classroom.code = payload.code
    classroom.subject_id = subjects[0].id
    classroom.subjects = subjects
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return ClassroomPublic.model_validate(classroom)


@router.delete(
    "/classrooms/{classroom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma turma",
)
def delete_classroom(
    classroom_id: int,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada"
        )
    _enforce_same_school(current_user, classroom.school_id)
    has_members = db.scalar(
        select(func.count()).select_from(User).where(User.classroom_id == classroom_id)
    )
    teacher_links = db.scalar(
        select(func.count())
        .select_from(teacher_classrooms_table)
        .where(teacher_classrooms_table.c.classroom_id == classroom_id)
    )
    if has_members or teacher_links:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover: existem usuários ou professores vinculados",
        )
    db.delete(classroom)
    db.commit()
