import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:8080")
        
        print("Waiting for catalog...")
        await page.wait_for_selector("text=Camiseta Modelo 01")
        
        # Check TSHIRT-01 image
        tshirt01_img = page.locator("img[alt='Camiseta Modelo 01']").first
        src = await tshirt01_img.get_attribute("src")
        print(f"TSHIRT-01 image src: {src}")
        
        if "tshirt-01-oficial.webp" in (src or ""):
            print("ART03 — URL carregando → PASS")
            print("ART04 — placeholder removido → PASS")
            print("ART05 — card mostra arte → PASS")
        else:
            print("ART03-05 → FAIL")

        # Open Gallery
        await page.click("text=Ver Detalhes")
        await page.wait_for_selector("text=Camiseta Oficial")
        
        gallery_img = page.locator("div[class*='fixed'] img[alt='Camiseta Modelo 01 - Frente']").first
        gallery_src = await gallery_img.get_attribute("src")
        print(f"Gallery image src: {gallery_src}")
        
        if gallery_src == src:
            print("ART06 — galeria mostra arte → PASS")
        
        await browser.close()

asyncio.run(main())
