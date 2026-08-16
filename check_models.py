import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:8080")
        await page.wait_for_selector("text=Escolha seu estilo")
        
        # Log all text content of sections that might contain models
        content = await page.evaluate("() => document.body.innerText")
        print("Page content length:", len(content))
        if "TSHIRT-01" in content:
            print("TSHIRT-01 found in text")
        else:
            print("TSHIRT-01 NOT found in text")
            
        await browser.close()

asyncio.run(main())
