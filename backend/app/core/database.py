"""SQLAlchemy session and metadata helpers."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Optional

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import Settings, get_settings

Base = declarative_base()

_engine: Optional[Engine] = None
SessionLocal: sessionmaker[Session] | None = None
LOGGER = logging.getLogger(__name__)


@event.listens_for(Engine, "connect")
def _enforce_sqlite_foreign_keys(dbapi_connection, connection_record) -> None:  # pragma: no cover
    """Ensure SQLite connections honor foreign key constraints for cascades."""
    module = getattr(dbapi_connection.__class__, "__module__", "")
    if "sqlite3" not in module:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def _build_engine(settings: Optional[Settings] = None) -> Engine:
    """Instantiate an Engine honoring the configured database URL."""
    resolved_settings = settings or get_settings()
    database_url = resolved_settings.normalized_database_url()
    if database_url.startswith("sqlite") and resolved_settings.is_production:
        raise RuntimeError(
            "SQLite não é permitido em produção. Defina DATABASE_URL para um banco PostgreSQL."
        )
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        LOGGER.warning("Usando SQLite apenas para desenvolvimento e testes.")
    return create_engine(
        database_url,
        echo=resolved_settings.debug,
        future=True,
        connect_args=connect_args,
        pool_pre_ping=True,
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
        if "description" not in columns:
            connection.execute(text("ALTER TABLE schools ADD COLUMN description TEXT"))
        if "contact_email" not in columns:
            connection.execute(
                text("ALTER TABLE schools ADD COLUMN contact_email VARCHAR(255)")
            )
        if "contact_phone" not in columns:
            connection.execute(
                text("ALTER TABLE schools ADD COLUMN contact_phone VARCHAR(64)")
            )
        if "address" not in columns:
            connection.execute(text("ALTER TABLE schools ADD COLUMN address VARCHAR(255)"))
        if "city" not in columns:
            connection.execute(text("ALTER TABLE schools ADD COLUMN city VARCHAR(128)"))
        if "state" not in columns:
            connection.execute(text("ALTER TABLE schools ADD COLUMN state VARCHAR(64)"))
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
        if "color" not in subject_columns:
            connection.execute(text("ALTER TABLE subjects ADD COLUMN color VARCHAR(16)"))
        if "description" not in subject_columns:
            connection.execute(text("ALTER TABLE subjects ADD COLUMN description TEXT"))
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
        if "grade_level" not in classroom_columns:
            connection.execute(text("ALTER TABLE classrooms ADD COLUMN grade_level VARCHAR(64)"))
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
                CREATE TABLE IF NOT EXISTS teacher_subjects (
                    teacher_id VARCHAR(36) NOT NULL,
                    subject_id INTEGER NOT NULL,
                    PRIMARY KEY (teacher_id, subject_id),
                    FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS teacher_assignments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    classroom_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    teacher_id VARCHAR(36) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
                    FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                    FOREIGN KEY(teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(classroom_id, subject_id)
                )
                """
            )
        )
        connection.execute(text("DROP TABLE IF EXISTS teacher_classrooms"))

        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS trigger_keywords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword VARCHAR(128) NOT NULL,
                    school_id INTEGER NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE
                )
                """
            )
        )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_trigger_keywords_scope "
                "ON trigger_keywords(keyword, school_id)"
            )
        )

        user_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('users')"))
        }
        if "classroom_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN classroom_id INTEGER"))
        if "subject_id" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN subject_id INTEGER"))
        connection.execute(
            text("UPDATE users SET subject_id=NULL WHERE role='aluno' AND subject_id IS NOT NULL")
        )

        feedback_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info('feedbacks')"))
        }
        if "sentiment_label" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN sentiment_label VARCHAR(32)"))
        if "sentiment_score" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN sentiment_score FLOAT"))
        if "manual_trigger_reason" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN manual_trigger_reason TEXT"))
        if "manual_triggered_by" not in feedback_columns:
            connection.execute(
                text(
                    "ALTER TABLE feedbacks ADD COLUMN manual_triggered_by VARCHAR(36) REFERENCES users(id)"
                )
            )
        if "trigger_resolved_at" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN trigger_resolved_at TIMESTAMP"))
        if "trigger_resolved_by" not in feedback_columns:
            connection.execute(
                text(
                    "ALTER TABLE feedbacks ADD COLUMN trigger_resolved_by VARCHAR(36) REFERENCES users(id)"
                )
            )
        if "trigger_resolved_note" not in feedback_columns:
            connection.execute(text("ALTER TABLE feedbacks ADD COLUMN trigger_resolved_note VARCHAR(255)"))

        feedback_fk_info = list(connection.execute(text("PRAGMA foreign_key_list('feedbacks')")))

        def _fk_action(column: str) -> str | None:
            for fk in feedback_fk_info:
                if fk[3] == column:
                    return (fk[6] or "").upper()
            return None

        needs_feedback_rebuild = False
        if _fk_action("sender_id") != "CASCADE":
            needs_feedback_rebuild = True
        if _fk_action("manual_triggered_by") not in {None, "SET NULL"}:
            needs_feedback_rebuild = True
        if _fk_action("trigger_resolved_by") not in {None, "SET NULL"}:
            needs_feedback_rebuild = True
        if any(fk[3] == "target_id" for fk in feedback_fk_info):
            needs_feedback_rebuild = True

        if needs_feedback_rebuild:
            connection.execute(text("DROP TABLE IF EXISTS feedbacks_new"))
            connection.execute(
                text(
                    """
                    CREATE TABLE feedbacks_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sender_id VARCHAR(36) NOT NULL,
                        target_type VARCHAR(16) NOT NULL,
                        target_id VARCHAR(64) NOT NULL,
                        content_encrypted TEXT NOT NULL,
                        nonce VARCHAR(255) NOT NULL,
                        sentiment VARCHAR(32),
                        category VARCHAR(64),
                        has_trigger BOOLEAN NOT NULL DEFAULT 0,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        sentiment_label VARCHAR(32),
                        sentiment_score FLOAT,
                        manual_trigger_reason TEXT,
                        manual_triggered_by VARCHAR(36),
                        trigger_resolved_at TIMESTAMP,
                        trigger_resolved_by VARCHAR(36),
                        trigger_resolved_note VARCHAR(255),
                        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY(manual_triggered_by) REFERENCES users(id) ON DELETE SET NULL,
                        FOREIGN KEY(trigger_resolved_by) REFERENCES users(id) ON DELETE SET NULL
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO feedbacks_new (
                        id,
                        sender_id,
                        target_type,
                        target_id,
                        content_encrypted,
                        nonce,
                        sentiment,
                        category,
                        has_trigger,
                        created_at,
                        sentiment_label,
                        sentiment_score,
                        manual_trigger_reason,
                        manual_triggered_by,
                        trigger_resolved_at,
                        trigger_resolved_by,
                        trigger_resolved_note
                    )
                    SELECT
                        id,
                        sender_id,
                        target_type,
                        target_id,
                        content_encrypted,
                        nonce,
                        sentiment,
                        category,
                        has_trigger,
                        created_at,
                        sentiment_label,
                        sentiment_score,
                        manual_trigger_reason,
                        manual_triggered_by,
                        trigger_resolved_at,
                        trigger_resolved_by,
                        trigger_resolved_note
                    FROM feedbacks
                    """
                )
            )
            connection.execute(text("DROP TABLE feedbacks"))
            connection.execute(text("ALTER TABLE feedbacks_new RENAME TO feedbacks"))
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_feedback_target ON feedbacks (target_type, target_id)"
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_feedback_created_at ON feedbacks (created_at)"
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_feedbacks_id ON feedbacks (id)"
                )
            )

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
