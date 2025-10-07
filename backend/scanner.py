import asyncio
import re
from typing import List, Dict,Optional
from playwright.async_api import async_playwright, Browser, BrowserContext
from urllib.parse import urlparse
from datetime import datetime

class PlaywrightScanner:
    def __init__(self):
        self.browser: Optional[Browser] = None
        
    async def initialize(self):
        """Initialize browser"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
    
    async def close(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def scan_url(self, url: str, options: Dict) -> Dict:
        """Scan URL and collect cookies"""
        
        # --- MODIFICATION START ---
        # Disguise the browser to avoid anti-bot detection
        context = await self.browser.new_context(
            accept_downloads=False,
            java_script_enabled=True,
            # Add a common desktop User-Agent
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            # Emulate a standard screen size
            viewport={'width': 1920, 'height': 1080}
        )
        # --- MODIFICATION END ---
        
        page = await context.new_page()
        
        # Collect Set-Cookie headers from responses
        set_cookie_headers = []
        
        async def handle_response(response):
            headers = await response.all_headers()
            if 'set-cookie' in headers:
                set_cookie_headers.append({
                    'url': response.url,
                    'set_cookie': headers['set-cookie']
                })
        
        page.on('response', handle_response)
        
        try:
            # Navigate to page
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # Wait specified time
            await asyncio.sleep(options.get('wait_seconds', 10))
            
            # Simulate user actions
            if 'scroll' in options.get('simulate_user_actions', []):
                await self._auto_scroll(page)
            
            if 'click_accept_if_present' in options.get('simulate_user_actions', []):
                await self._click_consent_button(page)
            
            # Collect cookies from browser
            browser_cookies = await context.cookies()
            
            # Collect cookies from document.cookie
            js_cookies = await page.evaluate("document.cookie")
            
            return {
                'browser_cookies': browser_cookies,
                'js_cookies': js_cookies,
                'set_cookie_headers': set_cookie_headers,
                'visited_url': url
            }
        
        finally:
            await context.close()
    
    async def _auto_scroll(self, page):
        """Auto-scroll page to trigger lazy-loaded content"""
        await page.evaluate("""
            async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            }
        """)
    
    async def _click_consent_button(self, page):
        """Try to click common consent buttons"""
        selectors = [
            'button:has-text("Accept")',
            'button:has-text("Accept All")',
            'button:has-text("I Accept")',
            '[id*="accept"]',
            '[class*="accept"]'
        ]
        
        for selector in selectors:
            try:
                element = await page.query_selector(selector)
                if element:
                    await element.click()
                    await asyncio.sleep(1)
                    break
            except:
                continue