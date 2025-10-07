from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict
from pydantic import BaseModel, HttpUrl
from sqlalchemy import Column, String, DateTime, Integer, JSON, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    ENRICHING = "enriching"
    COMPLETED = "completed"
    FAILED = "failed"

class CookieType(str, Enum):
    ANALYTICS = "Analytics"
    ADVERTISING = "Advertising"
    FUNCTIONAL = "Functional"
    NECESSARY = "Necessary"
    PERFORMANCE = "Performance"
    SECURITY = "Security"
    OTHER = "Other"

class ScanOptions(BaseModel):
    accept_consent: bool = False
    simulate_user_actions: List[str] = ["scroll"]
    headless: bool = True
    wait_seconds: int = 10

class ScanRequest(BaseModel):
    url: HttpUrl
    options: ScanOptions = ScanOptions()

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    estimated_time_seconds: int = 30

class EnrichedCookie(BaseModel):
    cookie: str
    domain: str
    description: str
    duration: str
    duration_iso: str
    duration_human: str
    type: CookieType
    confidence: float
    kb_source: Optional[str] = None
    is_third_party: bool = False

# SQLAlchemy Models
class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url = Column(String, nullable=False)
    status = Column(String, default=JobStatus.QUEUED)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    options = Column(JSON)
    error = Column(Text, nullable=True)

class RawCookie(Base):
    __tablename__ = "raw_cookies"
    
    id = Column(Integer, primary_key=True)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String, nullable=False)
    value = Column(String)
    domain = Column(String)
    path = Column(String)
    expiry_epoch = Column(Float, nullable=True)
    secure = Column(Boolean)
    httponly = Column(Boolean)
    samesite = Column(String)
    source = Column(String)

class EnrichedCookieDB(Base):
    __tablename__ = "enriched_cookies"
    
    id = Column(Integer, primary_key=True)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    cookie_name = Column(String, nullable=False)
    normalized_name = Column(String)
    base_domain = Column(String)
    description = Column(Text)
    duration_iso = Column(String)
    duration_human = Column(String)
    type = Column(String)
    confidence = Column(Float)
    kb_source = Column(String, nullable=True)
    llm_prompt = Column(Text, nullable=True)
    llm_response = Column(Text, nullable=True)
    is_third_party = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)