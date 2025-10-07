# ============= worker.py =============
import asyncio
from celery import Celery
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
from scanner import PlaywrightScanner
from enrichment import CookieEnricher
from models import Job, RawCookie, EnrichedCookieDB, JobStatus
import os
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


celery_app = Celery('cookie_worker',
                    broker=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
                    backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'))


DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:1111@localhost/cookiedb')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


@celery_app.task(bind=True, max_retries=3)
def process_scan_job(self, job_id: str):
    """Main worker task to process a scan job"""
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(async_process_scan_job(job_id))
    finally:
        loop.close()

async def async_process_scan_job(job_id: str):
    """Async implementation of job processing"""
    db = SessionLocal()
    scanner = None
    
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
        
        job.status = JobStatus.RUNNING
        db.commit()
        
       
        scanner = PlaywrightScanner()
        await scanner.initialize()
        
        raw_data = await scanner.scan_url(job.url, job.options or {})
        
       
        cookies = raw_data['browser_cookies']
        for cookie in cookies:
            raw_cookie = RawCookie(
                job_id=job_id,
                name=cookie['name'],
                value=cookie.get('value', ''),
                domain=cookie.get('domain', ''),
                path=cookie.get('path', '/'),
                expiry_epoch=cookie.get('expires', None),
                secure=cookie.get('secure', False),
                httponly=cookie.get('httpOnly', False),
                samesite=cookie.get('sameSite', 'None'),
                source='browser'
            )
            db.add(raw_cookie)
        db.commit()
        
        job.status = JobStatus.ENRICHING
        db.commit()
        
      
        api_key = os.getenv('GOOGLE_API_KEY', 'AIzaSyBmUqPT4TVKFzPZ3khT_-UOmNN4KxQkZh0')
        db_path = os.getenv('COOKIE_DB_PATH', 'exhaustive_cookie_database.json')
        enricher = CookieEnricher(google_api_key=api_key, cookie_db_path=db_path)
        
        enrichment_cache = {}
        for cookie in cookies:
            enriched = await enricher.enrich_cookie(cookie, job.url, enrichment_cache)
            db.add(EnrichedCookieDB(
                job_id=job_id,
                cookie_name=cookie['name'],
                normalized_name=enriched['cookie'],
                base_domain=enriched['domain'],
                description=enriched['description'],
                duration_iso=enriched['duration_iso'],
                duration_human=enriched['duration_human'],
                type=enriched['type'],
                confidence=enriched['confidence'],
                kb_source=enriched.get('kb_source'),
                is_third_party=enriched['is_third_party']
            ))
        
        db.commit()
        job.status = JobStatus.COMPLETED
        from datetime import datetime
        job.completed_at = datetime.utcnow()
        db.commit()
        

        if scanner:
            await scanner.close()
        
    except Exception as e:
        job.status = JobStatus.FAILED
        job.error = str(e)
        db.commit()
        raise
    
    finally:
        db.close()