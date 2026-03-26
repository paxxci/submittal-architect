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

            // 2. Try to find first product link — check for h2, product cards, or any result
            console.log('Locating first product...');
            let clickedProduct = false;
            
            // Strategy A: Wait for visible h2 (fastest)
            try {
                const firstH2 = page.locator('h2:visible').first();
                await firstH2.waitFor({ state: 'visible', timeout: 12000 });
                const title = await firstH2.innerText();
                console.log(`Found product title via h2: ${title}`);
                await firstH2.click();
                clickedProduct = true;
            } catch (e) {
                console.log('h2 not found, trying product link fallback...');
            }
            
            // Strategy B: Find any product anchor link
            if (!clickedProduct) {
                const productLink = page.locator('a[href*="/product/"], a[href*="/p/"], .product-title a, .product-name a').first();
                if (await productLink.count() > 0) {
                    console.log('Clicking product link (fallback)...');
                    await productLink.click();
                    clickedProduct = true;
                }
            }
            
            if (!clickedProduct) {
                console.log(`No products found on Platt for query: "${query}"`);
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
            } else {
                // Fallback: search for ANY link ending in .pdf
                const fallbackPdf = page.locator('a[href$=".pdf"]').first();
                if (await fallbackPdf.count() > 0) {
                    cutsheetUrl = await fallbackPdf.getAttribute('href');
                }
            }
            if (cutsheetUrl) console.log(`Found PDF link: ${cutsheetUrl}`);

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

    /**
     * Fallback for high-end devices: Hubbell-Direct
     */
    async sourceFromHubbell(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`Fallback: Searching Hubbell for: "${query}"...`);
            const searchUrl = `https://www.hubbell.com/hubbell/en/search/?text=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Handle Cookie Banner (Accept All)
            const cookieBtn = page.locator('#onetrust-accept-btn-handler');
            await cookieBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await cookieBtn.isVisible()) {
                await cookieBtn.click({ force: true });
            }

            // Click "View Details" on first product
            const viewDetailsBtn = page.locator('a[title="View details"]').first();
            if (await viewDetailsBtn.count() > 0) {
                await viewDetailsBtn.click();
                await page.waitForLoadState('networkidle');
                
                // Switch to Resources Tab
                const resourcesTab = page.locator('text="Resources and downloads"');
                if (await resourcesTab.count() > 0) {
                    await resourcesTab.click();
                    await page.waitForTimeout(1000); // Wait for tab animation
                }

                // Look for Specification Sheet PDF
                const pdfLink = page.locator('a[title*="Specification Sheet"], a[title*="Spec Sheet"], a:has-text("Specification Sheet")').first();
                const cutsheetUrl = await pdfLink.count() > 0 ? await pdfLink.getAttribute('href') : null;

                return {
                    vendor: 'Hubbell Wiring Device',
                    sku: 'Hubbell-Managed',
                    cutsheetUrl: cutsheetUrl ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.hubbell.com${cutsheetUrl}`) : null,
                    pdpUrl: page.url()
                };
            }
            return null;
        } catch (error) {
            console.error(`Error sourcing from Hubbell: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    /**
     * Orchestrates tiered sourcing based on user preferences.
     */
    async tieredSource(query, prefs = { vendors: ['Platt'], brands: ['Hubbell'] }) {
        console.log(`Starting Tiered Sourcing for: "${query}"`);
        
        // Tier 1: Preferred Vendors
        for (const vendor of prefs.vendors) {
            let result = null;
            if (vendor.toLowerCase().includes('platt')) {
                result = await this.sourceFromPlatt(query);
            } else if (vendor.toLowerCase().includes('north coast') || vendor.toLowerCase().includes('northcoast')) {
                result = await this.sourceFromNorthCoast(query);
            }
            
            if (result && result.cutsheetUrl) {
                console.log(`Success in Tier 1: Found on ${vendor}`);
                return result;
            }
        }

        // Tier 2: Brand Fallback (If Tier 1 fails)
        console.log("Tier 1 found no results. Pivoting to Tier 2 (Brands)...");
        for (const brand of prefs.brands) {
            let result = null;
            if (brand.toLowerCase().includes('hubbell')) {
                result = await this.sourceFromHubbell(query);
            } else if (brand.toLowerCase().includes('leviton')) {
                result = await this.sourceFromLeviton(query);
            }

            if (result && result.cutsheetUrl) {
                console.log(`Success in Tier 2: Found on ${brand} site.`);
                return result;
            }
        }

        return null;
    }

    /**
     * Placeholder for North Coast - uses search query navigation
     */
    async sourceFromNorthCoast(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            console.log(`Searching North Coast for: "${query}"...`);
            // Custom search URL for North Coast
            const searchUrl = `https://www.northcoast.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
            
            // For now, return a placeholder to show it attempted the tier
            return null; 
        } catch (e) {
            return null;
        } finally {
            await page.close();
        }
    }

    /**
     * Placeholder for Leviton - uses search query navigation
     */
    async sourceFromLeviton(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            console.log(`Searching Leviton for: "${query}"...`);
            const searchUrl = `https://www.leviton.com/en/search-results?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
            return null;
        } catch (e) {
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
