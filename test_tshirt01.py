import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        print("Navigating to catalog...")
        await page.goto("http://localhost:8080", wait_until="networkidle")
        
        # Look for TSHIRT-01 card
        tshirt01_card = page.locator("div:has-text('TSHIRT-01')").first
        if await tshirt01_card.count() > 0:
            print("Found TSHIRT-01 card")
            
            # Check for placeholder vs real image
            img = tshirt01_card.locator("img")
            src = await img.get_attribute("src")
            print(f"Current image src: {src}")
            
            if "placehold.co" in (src or "") or not src:
                print("Placeholder still present or no src")
            else:
                print("Official image found in card")
        else:
            print("TSHIRT-01 card not found")

        await browser.close()

asyncio.run(main())
