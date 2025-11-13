"""Administrative API router composed from domain-specific modules."""

from fastapi import APIRouter

from . import assignments, classrooms, metrics, schools, subjects, triggers, users

router = APIRouter(prefix="/admin", tags=["admin"])

for module in (
    metrics,
    triggers,
    schools,
    subjects,
    classrooms,
    users,
    assignments,
):
    router.include_router(module.router)
