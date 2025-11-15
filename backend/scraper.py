import re
import time
from typing import Optional, Dict
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import requests
import os
import subprocess

class JobScraper:
    def __init__(self, linkedin_cookies: dict = None):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
        self.linkedin_cookies = linkedin_cookies or {}
    
    def _setup_driver(self):
        """Setup Selenium WebDriver with headless Chrome"""
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument(f"user-agent={self.headers['User-Agent']}")
        chrome_options.add_argument("--window-size=1920,1080")
        
        try:
            # Use system chromedriver directly
            driver = webdriver.Chrome(options=chrome_options)
            driver.set_page_load_timeout(30)
            
            # Hide webdriver property
            driver.execute_cdp_cmd('Network.setUserAgentOverride', {
                "userAgent": self.headers['User-Agent']
            })
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            return driver
        except Exception as e:
            print(f"Error initializing Chrome WebDriver: {e}")
            raise Exception("Could not initialize Chrome WebDriver. Please ensure Chrome and ChromeDriver are installed.")
    
    def _add_cookies_to_driver(self, driver, url: str):
        """Add LinkedIn cookies to the driver for authentication"""
        if not self.linkedin_cookies:
            return
        
        try:
            # Navigate to a simple LinkedIn page first to set cookies
            print("Setting LinkedIn cookies...")
            driver.get("https://www.linkedin.com/feed/")
            
            # Add cookies
            for name, value in self.linkedin_cookies.items():
                try:
                    driver.add_cookie({
                        'name': name,
                        'value': value,
                        'domain': '.linkedin.com',
                        'path': '/',
                        'secure': True
                    })
                    print(f"Added cookie: {name}")
                except Exception as e:
                    print(f"Error adding cookie {name}: {e}")
            
            # Now navigate to the actual URL
            print(f"Navigating to job URL: {url}")
            driver.get(url)
        except Exception as e:
            print(f"Error in _add_cookies_to_driver: {e}")
            # Don't raise, let it continue with the current state
    
    def scrape_linkedin(self, url: str) -> Optional[Dict[str, str]]:
        """Scrape LinkedIn job posting"""
        driver = None
        try:
            driver = self._setup_driver()
            
            # Add cookies if available for authentication
            try:
                if self.linkedin_cookies:
                    self._add_cookies_to_driver(driver, url)
                else:
                    print("No LinkedIn cookies, loading page without authentication")
                    driver.get(url)
                
                # Give page time to load
                time.sleep(8)
                
                # Check if page loaded
                current_url = driver.current_url
                print(f"Current URL after load: {current_url}")
                
            except Exception as e:
                print(f"Error during page load: {e}")
                # Continue anyway to try to parse what we have
            
            page_source = driver.page_source
            
            # Check if we got JSON instead of HTML
            if page_source.strip().startswith('{') or '"data":' in page_source[:200]:
                print("WARNING: Received JSON response instead of HTML page")
                # Try refreshing the page
                driver.refresh()
                time.sleep(5)
                page_source = driver.page_source
            
            soup = BeautifulSoup(page_source, 'html.parser')
            
            # Debug: Check page title
            page_title = soup.find('title')
            if page_title:
                print(f"Page title: {page_title.get_text()}")
            
            # Check if page has actual job content
            body_text = soup.get_text()[:500]
            print(f"First 500 chars of body: {body_text[:200]}...")
            
            # Extract job title
            job_title = None
            title_selectors = [
                'h1.top-card-layout__title',
                'h1.t-24.t-bold',
                'h1.topcard__title',
                'h2.top-card-layout__title',
                'h1[class*="job"]',
                'h1'
            ]
            for selector in title_selectors:
                element = soup.select_one(selector)
                if element:
                    job_title = element.get_text(strip=True)
                    if job_title and len(job_title) > 5:  # Ensure it's substantial
                        break
            
            # Extract company name
            company_name = None
            company_selectors = [
                'a.topcard__org-name-link',
                'a.app-aware-link[href*="/company/"]',
                'span.topcard__flavor',
                'a.sub-nav-cta__optional-url',
                'div.job-details-jobs-unified-top-card__company-name a'
            ]
            for selector in company_selectors:
                element = soup.select_one(selector)
                if element:
                    company_name = element.get_text(strip=True)
                    if company_name and len(company_name) > 1:
                        break
            
            # Extract location
            location = None
            location_selectors = [
                'span.topcard__flavor.topcard__flavor--bullet',
                'span.sub-nav-cta__meta-text'
            ]
            for selector in location_selectors:
                element = soup.select_one(selector)
                if element:
                    location = element.get_text(strip=True)
                    break
            
            # Extract job description
            description = None
            desc_selectors = [
                'div.show-more-less-html__markup',
                'div.jobs-description__content',
                'div.description__text',
                'article.jobs-description__container',
                'div[class*="description"]'
            ]
            for selector in desc_selectors:
                element = soup.select_one(selector)
                if element:
                    description = element.get_text(separator='\n', strip=True)
                    if description and len(description) > 100:  # Ensure it's substantial
                        break
            
            # Fallback: look for any substantial text content
            if not description or len(description) < 100:
                # Try to find main content area
                main_content = soup.find('main') or soup.find('div', {'role': 'main'})
                if main_content:
                    description = main_content.get_text(separator='\n', strip=True)
                else:
                    body = soup.find('body')
                    if body:
                        description = body.get_text(separator='\n', strip=True)
                
                # Clean up and limit length
                if description:
                    lines = [line.strip() for line in description.split('\n') if line.strip()]
                    description = '\n'.join(lines)[:5000]
            
            return {
                'job_title': job_title or 'LinkedIn Job',
                'company_name': company_name or 'Unknown Company',
                'location': location,
                'job_description': description or 'Unable to extract job description'
            }
            
        except Exception as e:
            print(f"Error scraping LinkedIn: {str(e)}")
            return None
        finally:
            if driver:
                driver.quit()
    
    def scrape_indeed(self, url: str) -> Optional[Dict[str, str]]:
        """Scrape Indeed job posting"""
        driver = None
        try:
            driver = self._setup_driver()
            driver.get(url)
            
            # Wait for content to load
            time.sleep(3)
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            
            # Extract job title
            job_title = None
            title_selectors = [
                'h1.jobsearch-JobInfoHeader-title',
                'h1[class*="jobTitle"]',
                'h2.jobTitle',
                'h1'
            ]
            for selector in title_selectors:
                if '[' in selector:
                    elements = soup.find_all('h1')
                    for elem in elements:
                        if 'jobTitle' in elem.get('class', []):
                            job_title = elem.get_text(strip=True)
                            break
                else:
                    element = soup.select_one(selector)
                    if element:
                        job_title = element.get_text(strip=True)
                        break
                if job_title:
                    break
            
            # Extract company name
            company_name = None
            company_selectors = [
                'div[data-company-name="true"]',
                'span[class*="companyName"]',
                'a[data-tn-element="companyName"]'
            ]
            for selector in company_selectors:
                element = soup.select_one(selector)
                if element:
                    company_name = element.get_text(strip=True)
                    break
            
            # Extract location
            location = None
            location_selectors = [
                'div[data-testid="inlineHeader-companyLocation"]',
                'div[class*="companyLocation"]',
                'span[class*="location"]'
            ]
            for selector in location_selectors:
                element = soup.select_one(selector)
                if element:
                    location = element.get_text(strip=True)
                    break
            
            # Extract job description
            description = None
            desc_selectors = [
                'div#jobDescriptionText',
                'div[class*="jobDescriptionText"]',
                'div[id*="jobDescription"]'
            ]
            for selector in desc_selectors:
                element = soup.select_one(selector)
                if element:
                    description = element.get_text(separator='\n', strip=True)
                    break
            
            # Fallback
            if not description:
                body = soup.find('body')
                if body:
                    description = body.get_text(separator='\n', strip=True)[:2000]
            
            return {
                'job_title': job_title or 'Indeed Job',
                'company_name': company_name or 'Unknown Company',
                'location': location,
                'job_description': description or 'Unable to extract job description'
            }
            
        except Exception as e:
            print(f"Error scraping Indeed: {str(e)}")
            return None
        finally:
            if driver:
                driver.quit()
    
    def scrape_job(self, url: str) -> Optional[Dict[str, str]]:
        """Main scraping method that detects the source and scrapes accordingly"""
        if 'linkedin.com' in url:
            result = self.scrape_linkedin(url)
            if result:
                result['source'] = 'linkedin'
            return result
        elif 'indeed.com' in url:
            result = self.scrape_indeed(url)
            if result:
                result['source'] = 'indeed'
            return result
        else:
            return None
