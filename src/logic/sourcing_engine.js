const { chromium } = require('playwright');

/**
 * Sourcing Engine
 * 
 * Automates product discovery on vendor sites based on technical traits.
 * Currently optimized for Platt.com.
 */
class SourcingEngine {
    constructor() {
        this.browser = null;
        this.context = null;
    }

    async init() {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true });
            this.context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            });
        }
    }

    /**
     * Performs a search on Platt.com and retrieves the top candidate.
   * @param {string} query - The search query (e.g., "3/4 x 8 copper ground rod").
   * @returns {object} - Object containing SKU, Price, Title, and Cutsheet URL.
   */
    async sourceFromPlatt(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`Searching Platt.com for: "${query}"...`);
            const searchUrl = `https://www.platt.com/search.aspx?q=${encodeURIComponent(query)}`;
            console.log(`Navigating to: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // 1. Handle Cookie Banner (Aggressive)
            console.log('Clearing overlays...');
            const cookieButton = page.locator('button:has-text("OK")');
            if (await cookieButton.isVisible()) {
                await cookieButton.click();
                await page.waitForTimeout(1000);
            }

            // 2. Identify Product Link
            console.log('Locating first product...');
            const firstH2 = page.locator('h2:visible').first();
            try {
                await firstH2.waitFor({ state: 'visible', timeout: 30000 });
                console.log(`Found product title: ${await firstH2.innerText()}`);
                await firstH2.click();
            } catch (e) {
                console.log('Timeout waiting for visible product title (h2).');
                const debugPath = 'e:\\Antigravity google\\Submittal Architect\\.tmp\\failure_screenshot.png';
                await page.screenshot({ path: debugPath });
                console.log(`Saved failure screenshot to: ${debugPath}`);
                return null;
            }

            // 3. Extract from Product Detail Page (PDP)
            console.log('Navigating to PDP...');
            // Wait for unique PDP indicators
            await page.waitForSelector('text=Item #:', { timeout: 30000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });

            const html = await page.content();
            const skuMatch = html.match(/Item #:\s*(\d+)/);
            const sku = skuMatch ? skuMatch[1] : 'Unknown';
            const title = await page.title();

            // Extract Price
            const priceLocator = page.locator('.text-h5, span:text("$")').first();
            let priceText = 'Price not found';
            if (await priceLocator.count() > 0) {
                priceText = await priceLocator.first().innerText();
            }

            // 4. Extract PDF link (The "Source of Truth")
            console.log('Extracting Documentation PDF...');
            // Broad search for any technical document link - EXPANDED BASED ON FEEDBACK
            const pdfLocator = page.locator('a').filter({ hasText: /Catalog Page|Cut Sheet|Data Sheet|Submittal|Technical|Specification|Product Specs/i });
            let cutsheetUrl = null;
            if (await pdfLocator.count() > 0) {
                cutsheetUrl = await pdfLocator.first().getAttribute('href');
                console.log(`Found PDF link: ${cutsheetUrl}`);
            }

            return {
                vendor: 'Platt Electric Supply',
                title: title.trim(),
                sku: sku,
                price: priceText.trim(),
                cutsheetUrl: cutsheetUrl ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.platt.com${cutsheetUrl}`) : null,
                pdpUrl: page.url()
            };

        } catch (error) {
            console.error(`Error sourcing from Platt: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    async shutdown() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = SourcingEngine;
