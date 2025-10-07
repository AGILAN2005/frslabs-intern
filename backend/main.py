# ============= main.py =============
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Job, EnrichedCookieDB, ScanRequest, JobResponse, EnrichedCookie, JobStatus
from worker import process_scan_job
import os
from typing import List
import uuid

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:1111@localhost/cookiedb')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="Cookie Inventory Service",
    description="Comprehensive cookie analysis with AI-powered enrichment",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "cookie-inventory"}

@app.post("/scan", response_model=JobResponse)
def create_scan_job(request: ScanRequest, db: Session = Depends(get_db)):
    """Create a new scan job"""
    
    # Create job
    job = Job(
        id=uuid.uuid4(),
        url=str(request.url),
        status=JobStatus.QUEUED,
        options=request.options.dict()
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Enqueue job
    process_scan_job.delay(str(job.id))
    
    return JobResponse(
        job_id=str(job.id),
        status=job.status,
        estimated_time_seconds=30
    )

@app.get("/status/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Get job status"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Calculate progress
    progress = 0
    if job.status == JobStatus.QUEUED:
        progress = 0
    elif job.status == JobStatus.RUNNING:
        progress = 40
    elif job.status == JobStatus.ENRICHING:
        progress = 70
    elif job.status == JobStatus.COMPLETED:
        progress = 100
    elif job.status == JobStatus.FAILED:
        progress = 0
    
    return {
        "job_id": str(job.id),
        "status": job.status,
        "progress": progress,
        "created_at": job.created_at.isoformat(),
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "error": job.error
    }

@app.get("/result/{job_id}", response_model=List[EnrichedCookie])
def get_job_result(job_id: str, db: Session = Depends(get_db)):
    """Get enriched cookie results"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Job not completed. Status: {job.status}")
    
    # Get enriched cookies
    cookies = db.query(EnrichedCookieDB).filter(EnrichedCookieDB.job_id == job_id).all()
    
    return [
        EnrichedCookie(
            cookie=c.normalized_name,
            domain=c.base_domain,
            description=c.description,
            duration=c.duration_human,
            duration_iso=c.duration_iso,
            duration_human=c.duration_human,
            type=c.type,
            confidence=c.confidence,
            kb_source=c.kb_source,
            is_third_party=c.is_third_party
        )
        for c in cookies
    ]

@app.get("/download/{job_id}.csv")
def download_csv(job_id: str, db: Session = Depends(get_db)):
    """Download results as CSV"""
    from fastapi.responses import StreamingResponse
    import io
    
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or job.status != JobStatus.COMPLETED:
        raise HTTPException(status_code=404, detail="Results not found")
    
    cookies = db.query(EnrichedCookieDB).filter(EnrichedCookieDB.job_id == job_id).all()
    
    # Generate CSV
    output = io.StringIO()
    output.write("Cookie,Domain,Description,Duration,Type\n")
    for c in cookies:
        output.write(f'"{c.normalized_name}","{c.base_domain}","{c.description}","{c.duration_human}","{c.type}"\n')
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cookie-inventory-{job_id}.csv"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)