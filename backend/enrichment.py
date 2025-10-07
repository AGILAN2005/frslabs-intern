#============enrichment.py===================

import re
import json
from typing import Optional, Dict
import google.generativeai as genai
import asyncio
from pathlib import Path
import os

class CookieKnowledgeBase:
    """Load and manage extensive JSON cookie database"""
    
    COOKIE_DB = {}
    
    @classmethod
    def load_from_json(cls, json_path: str):
        """Load extensive cookie database from JSON file"""
       
        db_file = Path(json_path)
        
       
        possible_paths = [
            db_file,
            Path.cwd() / json_path,
            Path.cwd() / 'app' / 'exhaustive_cookie_database.json',
            Path.cwd() / 'exhaustive_cookie_database.json',
            Path(__file__).parent / 'exhaustive_cookie_database.json',
            Path(__file__).parent / 'app' / 'exhaustive_cookie_database.json'
        ]
        
        for path in possible_paths:
            if path.exists():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        cls.COOKIE_DB = json.load(f)
                    print(f"✓ Loaded {len(cls.COOKIE_DB)} cookies from {path}")
                    return
                except Exception as e:
                    print(f"✗ Error reading {path}: {e}")
                    continue
        
        print(f"⚠ Cookie database not found. Searched in:")
        for path in possible_paths:
            print(f"  - {path}")
        print("⚠ Will rely on LLM enrichment only")
        cls.COOKIE_DB = {}
    
    @classmethod
    def get_cookie_info(cls, normalized_name: str) -> Optional[Dict]:
        """Get cookie info from database"""
        return cls.COOKIE_DB.get(normalized_name)
    
    @classmethod
    def add_cookie(cls, normalized_name: str, info: Dict):
        """Add new cookie to in-memory database"""
        cls.COOKIE_DB[normalized_name] = info


class CookieEnricher:
    def __init__(self, google_api_key: str, cookie_db_path: str, redis_client=None):
        genai.configure(api_key=google_api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.redis = redis_client
        
        
        CookieKnowledgeBase.load_from_json(cookie_db_path)

    def normalize_cookie_name(self, name: str) -> str:
        """Normalize cookie names with wildcards"""
        if name.startswith('_ga_'): 
            return '_ga_*'
        if name.startswith('_gat_UA-'):
            return '_gat_UA-*'
        if name.startswith('_gat_gtag_'):
            return '_gat_gtag_*'
        if re.match(r'^(.+)_\d+$', name): 
            return re.sub(r'_\d+$', '_*', name)
        return name

    def get_base_domain(self, domain: str) -> str:
        """Extract base domain from full domain"""
        parts = domain.lstrip('.').split('.')
        if len(parts) >= 2: 
            return '.'.join(parts[-2:])
        return domain

    async def enrich_from_llm_direct(self, cookie_data: Dict) -> Optional[Dict]:
        """Use LLM directly without web search to avoid rate limits"""
        
        prompt = f"""You are a cookie analysis expert with extensive knowledge of web cookies.

COOKIE INFORMATION:
- Name: {cookie_data['name']}
- Domain: {cookie_data['domain']}

Based on your knowledge, provide information about this cookie in JSON format:
{{
  "description": "A single comprehensive paragraph (3-5 sentences) explaining what this cookie is, its purpose, why it's used, who sets it, and what it tracks or stores.",
  "details": {{
    "type": "[Choose: Analytics, Advertising, Functional, Necessary, Performance, Security, or Other]",
    "duration_human": "[e.g., '2 years', '1 day', '30 minutes', 'Session']",
    "provider": "[Company/service name, e.g., 'Google Analytics', 'HubSpot', 'Cloudflare']"
  }}
}}

IMPORTANT RULES:
1. Write ONE natural paragraph, not bullet points
2. Be specific about the cookie's function
3. Include the provider/company name
4. If you recognize the cookie pattern (like _ga, __utma, __cf_bm, __hstc), use your knowledge
5. Common cookies:
   - _ga, _gid, _gat_UA-* = Google Analytics
   - __utma, __utmb, __utmc, __utmz, __utmt = Google Analytics (legacy)
   - __hstc, __hssc, __hssrc, hubspotutk, messagesUtk = HubSpot
   - __cf_bm, _cfuvid = Cloudflare
6. Return ONLY valid JSON, no markdown

Example good description:
"The _ga cookie is set by Google Analytics and is used to distinguish unique visitors to a website by assigning a randomly generated number as a client identifier. It stores information about user sessions, page views, and user behavior patterns, which helps website owners understand how visitors interact with their site. This cookie enables essential analytics functionality, allowing site administrators to track metrics like bounce rate, session duration, and traffic sources for improving user experience."
"""

        try:
            response = await self.model.generate_content_async(prompt)
            response_text = response.text.strip().replace('```json', '').replace('```', '').strip()
            
            parsed = json.loads(response_text)
            
            if 'description' not in parsed or 'details' not in parsed:
                return None
            
            return {
                'description': parsed['description'],
                'type': parsed['details'].get('type', 'Other'),
                'duration_human': parsed['details'].get('duration_human', 'Session'),
                'provider': parsed['details'].get('provider', 'Unknown'),
                'confidence': 0.75,
                'kb_source': 'LLM Knowledge',
                'duration_iso': self._duration_to_iso(parsed['details'].get('duration_human', 'Session'))
            }
        except json.JSONDecodeError as e:
            print(f"✗ JSON parsing failed for {cookie_data['name']}: {e}")
            return None
        except Exception as e:
            print(f"✗ LLM enrichment failed for {cookie_data['name']}: {e}")
            return None

    def _duration_to_iso(self, duration_human: str) -> str:
        """Convert human-readable duration to ISO 8601"""
        duration_lower = duration_human.lower()
        
        if 'session' in duration_lower:
            return 'PT0S'
        
        if 'minute' in duration_lower:
            mins = re.search(r'(\d+)', duration_lower)
            return f"PT{mins.group(1)}M" if mins else 'PT1M'
        
        if 'hour' in duration_lower:
            hrs = re.search(r'(\d+)', duration_lower)
            return f"PT{hrs.group(1)}H" if hrs else 'PT1H'
        
        if 'day' in duration_lower:
            days = re.search(r'(\d+)', duration_lower)
            return f"P{days.group(1)}D" if days else 'P1D'
        
        if 'month' in duration_lower:
            months = re.search(r'(\d+)', duration_lower)
            return f"P{months.group(1)}M" if months else 'P1M'
        
        if 'year' in duration_lower:
            years = re.search(r'(\d+)\s*year', duration_lower)
            months = re.search(r'(\d+)\s*month', duration_lower)
            days = re.search(r'(\d+)\s*day', duration_lower)
            
            iso = "P"
            if years:
                iso += f"{years.group(1)}Y"
            if months:
                iso += f"{months.group(1)}M"
            if days:
                iso += f"{days.group(1)}D"
            
            return iso if iso != "P" else "P1Y"
        
        return 'PT0S'

    async def enrich_cookie(self, cookie: Dict, visited_url: str, cache: dict) -> Dict:
        """
        Main enrichment logic:
        1. Check cache
        2. Check extensive JSON database
        3. Use LLM (without web search to avoid rate limits)
        4. Fallback
        """
        
       
        if cookie['name'] in cache:
            cached_data = cache[cookie['name']].copy()
            base_domain = self.get_base_domain(cookie.get('domain', visited_url))
            is_third_party = base_domain != self.get_base_domain(visited_url)
            cached_data['domain'] = base_domain
            cached_data['is_third_party'] = is_third_party
            return cached_data

        normalized_name = self.normalize_cookie_name(cookie['name'])
        base_domain = self.get_base_domain(cookie.get('domain', visited_url))
        is_third_party = base_domain != self.get_base_domain(visited_url)
        
      
        db_info = CookieKnowledgeBase.get_cookie_info(normalized_name)
        if db_info:
            print(f"✓ Found '{normalized_name}' in database")
            result = {
                'cookie': normalized_name,
                'domain': base_domain,
                'description': db_info.get('description', ''),
                'type': db_info.get('type', 'Other'),
                'duration_human': db_info.get('duration_human', 'Session'),
                'duration_iso': db_info.get('duration_iso', 'PT0S'),
                'provider': db_info.get('provider', 'Unknown'),
                'confidence': 0.95,
                'kb_source': 'JSON Database',
                'is_third_party': is_third_party
            }
            cache[cookie['name']] = result
            return result
        
     
        print(f"⟳ Using LLM for '{normalized_name}'...")
        llm_result = await self.enrich_from_llm_direct({
            'name': cookie['name'],
            'domain': base_domain
        })
        
        if llm_result:
            print(f"✓ LLM enriched '{normalized_name}'")
            result = {
                'cookie': normalized_name,
                'domain': base_domain,
                'is_third_party': is_third_party,
                **llm_result
            }
            cache[cookie['name']] = result
            
       
            CookieKnowledgeBase.add_cookie(normalized_name, {
                'description': llm_result['description'],
                'type': llm_result['type'],
                'duration_human': llm_result['duration_human'],
                'duration_iso': llm_result['duration_iso'],
                'provider': llm_result['provider']
            })
            
            return result
        
  
        print(f"⚠ Using fallback for '{normalized_name}'")
        result = {
            'cookie': normalized_name,
            'domain': base_domain,
            'description': f"This cookie is set by {base_domain}. Specific information about its purpose and functionality is not currently available in our database. It may be used for site functionality, analytics, or user preferences.",
            'duration_iso': 'PT0S',
            'duration_human': 'Session',
            'type': 'Other',
            'provider': base_domain,
            'confidence': 0.3,
            'kb_source': 'Fallback',
            'is_third_party': is_third_party
        }
        cache[cookie['name']] = result
        return result
