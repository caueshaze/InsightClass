"""SQLAlchemy session and metadata helpers."""

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import Settings, get_settings

Base = declarative_base()

_engine: Optional[Engine] = None
SessionLocal: sessionmaker[Session] | None = None


def _build_engine(settings: Optional[Settings] = None) -> Engine:
    """Instantiate an Engine honoring the configured database URL."""
    resolved_settings = settings or get_settings()
    connect_args = {}
    if resolved_settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(
        resolved_settings.database_url,
        echo=False,
        future=True,
        connect_args=connect_args,
    )


def _run_sqlite_migrations(engine: Engine) -> None:
    """Aligns the SQLite schema/data with the SQLAlchemy models."""
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('schools')"))
        }
        if "code" not in columns:
            connection.execute(text("ALTER TABLE schools ADD COLUMN code VARCHAR(64)"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_schools_code "
                "ON schools(code) WHERE code IS NOT NULL"
            )
        )

        subject_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('subjects')"))
        }
        if "code" not in subject_columns:
            connection.execute(text("ALTER TABLE subjects ADD COLUMN code VARCHAR(64)"))
        if "teacher_id" not in subject_columns:
            connection.execute(text("ALTER TABLE subjects ADD COLUMN teacher_id VARCHAR(36)"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_school_code "
                "ON subjects(school_id, code) WHERE code IS NOT NULL"
            )
        )
        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_subjects_teacher_id "
                "ON subjects(teacher_id)"
            )
        )

        classroom_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('classrooms')"))
        }
        if "code" not in classroom_columns:
            connection.execute(text("ALTER TABLE classrooms ADD COLUMN code VARCHAR(64)"))
        if "subject_id" not in classroom_columns:
            connection.execute(text("ALTER TABLE classrooms ADD COLUMN subject_id INTEGER"))
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_classrooms_school_code "
                "ON classrooms(school_id, code) WHERE code IS NOT NULL"
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS classroom_subjects (
                    classroom_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    PRIMARY KEY (classroom_id, subject_id),
                    FOREIGN KEY(classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
                    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT OR IGNORE INTO classroom_subjects (classroom_id, subject_id)
                SELECT id, subject_id FROM classrooms
                WHERE subject_id IS NOT NULL
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS teacher_classrooms (
                    teacher_id VARCHAR(36) NOT NULL,
                    classroom_id INTEGER NOT NULL,
                    PRIMARY KEY (teacher_id, classroom_id),
                    FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY(classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
                )
                """
            )
        )

        user_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('users')"))
        }
        if "classroom_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN classroom_id INTEGER"))
        if "subject_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN subject_id INTEGER"))

        feedback_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('feedbacks')"))
        }
        if "sentiment_label" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN sentiment_label VARCHAR(32)"))
        if "sentiment_score" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN sentiment_score FLOAT"))

        # Normalize legacy roles para os novos valores em português.
        connection.execute(
            text(
                "UPDATE users SET role='professor' WHERE role='teacher'"
            )
        )
        connection.execute(
            text(
                "UPDATE users SET role='aluno' WHERE role='student'"
            )
        )
        connection.execute(
            text(
                "UPDATE users SET role='gestor' WHERE role='manager'"
            )
        )


def _get_sessionmaker() -> sessionmaker[Session]:
    """Return or lazily create the sessionmaker factory."""
    global SessionLocal, _engine
    if SessionLocal is None or _engine is None:
        _engine = _build_engine()
        Base.metadata.create_all(bind=_engine)
        _run_sqlite_migrations(_engine)
        SessionLocal = sessionmaker(
            bind=_engine,
            autocommit=False,
            autoflush=False,
            future=True,
        )
    return SessionLocal


@contextmanager
def session_scope() -> Iterator[Session]:
    """Context manager para scripts e tarefas pontuais."""
    session_local = _get_sessionmaker()
    session = session_local()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Iterator[Session]:
    """
    Dependency para FastAPI.

    Usa yield sem @contextmanager para entregar um Session real
    para rotas (ex.: Depends(get_session)).
    """
    session_local = _get_sessionmaker()
    session = session_local()
    try:
        yield session
    finally:
        session.close()

def init_db() -> None:
    """Helper for local development to create tables when needed."""
    _get_sessionmaker()
    if _engine is None:
        raise RuntimeError("Database engine not initialized")
    Base.metadata.create_all(bind=_engine)
