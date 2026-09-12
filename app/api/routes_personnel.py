"""Personnel enrollment and embedding lifecycle routes."""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import cv2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.db.database import SessionLocal
from app.db.models import FaceEmbeddingModel, PersonnelModel
from app.modules.face_recognition import embedding_to_json, extract_embedding

router = APIRouter(prefix="/api/personnel", tags=["personnel"])


class PersonnelCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=200)
    allowed_zones: list[str] = Field(default_factory=list)


class EnrollmentRequest(BaseModel):
    # Development/demo path input. The image is read only in memory and discarded.
    image_path: str = Field(min_length=1)


def _person_payload(person: PersonnelModel, embedding_count: int | None = None) -> dict:
    return {
        "person_id": person.person_id,
        "display_name": person.display_name,
        "active": person.active,
        "allowed_zones": list(person.allowed_zones or []),
        "created_at": person.created_at,
        "updated_at": person.updated_at,
        "active_embedding_count": embedding_count,
    }


@router.post("", status_code=201)
def create_personnel(payload: PersonnelCreate):
    session = SessionLocal()
    try:
        person = PersonnelModel(
            person_id=str(uuid4()),
            display_name=payload.display_name,
            allowed_zones=payload.allowed_zones,
            active=True,
        )
        session.add(person)
        session.commit()
        session.refresh(person)
        return _person_payload(person, 0)
    finally:
        session.close()


@router.get("")
def list_personnel():
    session = SessionLocal()
    try:
        rows = session.scalars(select(PersonnelModel).order_by(PersonnelModel.display_name)).all()
        counts = dict(session.execute(
            select(FaceEmbeddingModel.person_id, func.count(FaceEmbeddingModel.embedding_id))
            .where(FaceEmbeddingModel.active.is_(True))
            .group_by(FaceEmbeddingModel.person_id)
        ).all())
        return [_person_payload(person, int(counts.get(person.person_id, 0))) for person in rows]
    finally:
        session.close()


@router.post("/{person_id}/enroll", status_code=201)
def enroll_personnel(person_id: str, payload: EnrollmentRequest):
    image = cv2.imread(str(Path(payload.image_path)))
    if image is None:
        raise HTTPException(status_code=400, detail="Enrollment image could not be read")
    session = SessionLocal()
    try:
        person = session.get(PersonnelModel, person_id)
        if person is None or not person.active:
            raise HTTPException(status_code=404, detail="Active personnel record not found")
        status, embedding = extract_embedding(image)
        if status != "ok" or embedding is None:
            detail = "Enrollment image contains no detectable face" if status == "unavailable" else "Enrollment image failed face quality checks"
            raise HTTPException(status_code=422, detail=detail)
        row = FaceEmbeddingModel(
            embedding_id=str(uuid4()),
            person_id=person_id,
            embedding=embedding_to_json(embedding),
            model_name="buffalo_l",
            model_version="insightface",
            active=True,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return {
            "embedding_id": row.embedding_id,
            "person_id": row.person_id,
            "model_name": row.model_name,
            "model_version": row.model_version,
            "enrolled_at": row.enrolled_at,
            "active": row.active,
        }
    finally:
        session.close()


@router.delete("/{person_id}/embeddings/{embedding_id}")
def deactivate_embedding(person_id: str, embedding_id: str):
    session = SessionLocal()
    try:
        row = session.scalar(select(FaceEmbeddingModel).where(
            FaceEmbeddingModel.embedding_id == embedding_id,
            FaceEmbeddingModel.person_id == person_id,
        ))
        if row is None:
            raise HTTPException(status_code=404, detail="Embedding not found")
        row.active = False
        session.commit()
        return {"embedding_id": row.embedding_id, "person_id": row.person_id, "active": False}
    finally:
        session.close()
