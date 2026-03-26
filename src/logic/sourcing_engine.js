const { chromium } = require('playwright');

/**
 * Sourcing Engine
 * 
 * Automates product discovery on vendor sites and returns cut sheet URLs + prices.
 * 
 * Tier 1: Platt.com (primary preferred vendor)
 * Tier 2: North Coast Electric (secondary preferred vendor)  
 * Tier 3: Manufacturer direct (Hubbell.com, Leviton.com, etc.)
 * 
 * Multi-manufacturer mode: for each listed manufacturer, search Tier 1 → Tier 2 → Tier 3.
 * All candidates with prices are returned, caller picks the winner (lowest price).
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

    // ─────────────────────────────────────────────────────────────
    // TIER 1: Platt.com
    // ─────────────────────────────────────────────────────────────

    /**
     * Search Platt.com and return the top result with price + cut sheet.
     * @param {string} query - e.g. "Hubbell wall switch" or "Leviton duplex receptacle"
     */
    async sourceFromPlatt(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`[Platt] Searching for: "${query}"`);
            const searchUrl = `https://www.platt.com/search.aspx?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Clear cookie banner
            const cookieButton = page.locator('button:has-text("OK")');
            if (await cookieButton.isVisible()) {
                await cookieButton.click();
                await page.waitForTimeout(800);
            }

            // Click first product — try h2 first, then any product link
            let clickedProduct = false;
            try {
                const firstH2 = page.locator('h2:visible').first();
                await firstH2.waitFor({ state: 'visible', timeout: 12000 });
                const title = await firstH2.innerText();
                console.log(`[Platt] First result: "${title}"`);
                await firstH2.click();
                clickedProduct = true;
            } catch (e) {
                const productLink = page.locator('a[href*="/product/"], a[href*="/p/"], .product-title a, .product-name a').first();
                if (await productLink.count() > 0) {
                    await productLink.click();
                    clickedProduct = true;
                }
            }

            if (!clickedProduct) {
                console.log(`[Platt] No results for: "${query}"`);
                return null;
            }

            // Wait for PDP
            await page.waitForSelector('text=Item #:', { timeout: 30000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });

            const html = await page.content();
            const skuMatch = html.match(/Item #:\s*(\d+)/);
            const sku = skuMatch ? skuMatch[1] : 'Unknown';
            const title = await page.title();

            // Extract price — Platt PDP shows price in various selectors
            let priceText = null;
            let priceNum = null;
            const priceSelectors = [
                '.text-h5',
                'span[data-price]',
                '.product-price',
                'span:text("$")',
                '.price-block span',
            ];
            for (const sel of priceSelectors) {
                try {
                    const el = page.locator(sel).first();
                    if (await el.count() > 0) {
                        const t = await el.innerText();
                        if (t.includes('$')) {
                            priceText = t.trim();
                            // Parse numeric value for comparison
                            priceNum = parseFloat(t.replace(/[^0-9.]/g, ''));
                            break;
                        }
                    }
                } catch (e) { /* try next */ }
            }
            if (!priceText) {
                // Try all text content for a $ pattern
                const bodyText = await page.innerText('body');
                const match = bodyText.match(/\$\s*(\d+\.\d{2})/);
                if (match) {
                    priceText = `$${match[1]}`;
                    priceNum = parseFloat(match[1]);
                }
            }
            console.log(`[Platt] Price: ${priceText || 'not found'}`);

            // Extract cut sheet PDF
            let cutsheetUrl = null;
            const pdfLocator = page.locator('a').filter({ hasText: /Catalog Page|Cut Sheet|Data Sheet|Submittal|Technical|Specification|Product Specs/i });
            if (await pdfLocator.count() > 0) {
                cutsheetUrl = await pdfLocator.first().getAttribute('href');
            } else {
                const fallbackPdf = page.locator('a[href$=".pdf"]').first();
                if (await fallbackPdf.count() > 0) {
                    cutsheetUrl = await fallbackPdf.getAttribute('href');
                }
            }
            if (cutsheetUrl) console.log(`[Platt] Cut sheet: ${cutsheetUrl}`);

            return {
                vendor: 'Platt Electric Supply',
                vendorShort: 'Platt',
                title: title.trim(),
                sku,
                price: priceText,
                priceNum,
                cutsheetUrl: cutsheetUrl
                    ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.platt.com${cutsheetUrl}`)
                    : null,
                pdpUrl: page.url()
            };

        } catch (error) {
            console.error(`[Platt] Error: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 2: North Coast Electric
    // ─────────────────────────────────────────────────────────────

    /**
     * Search North Coast Electric and return top result with price + cut sheet.
     */
    async sourceFromNorthCoast(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`[NorthCoast] Searching for: "${query}"`);
            const searchUrl = `https://www.northcoastelectric.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Click first product result
            let clickedProduct = false;
            const productSelectors = [
                'a.product-item__title',
                'a.product-title',
                '.product-list-item a',
                'h2 a',
                '.product a',
            ];
            for (const sel of productSelectors) {
                const el = page.locator(sel).first();
                if (await el.count() > 0) {
                    const text = await el.innerText().catch(() => '');
                    console.log(`[NorthCoast] First result: "${text.trim()}"`);
                    await el.click();
                    clickedProduct = true;
                    break;
                }
            }

            // Fallback: try clicking any h2 or h3 link
            if (!clickedProduct) {
                try {
                    const h2Link = page.locator('h2:visible, h3:visible').first();
                    await h2Link.waitFor({ state: 'visible', timeout: 8000 });
                    await h2Link.click();
                    clickedProduct = true;
                } catch (e) {}
            }

            if (!clickedProduct) {
                console.log(`[NorthCoast] No results for: "${query}"`);
                return null;
            }

            await page.waitForLoadState('networkidle', { timeout: 15000 });

            const title = await page.title();

            // Extract price
            let priceText = null;
            let priceNum = null;
            const priceSelectors = [
                '.product-price',
                '.price',
                '[data-price]',
                'span:has-text("$")',
                '.product__price',
            ];
            for (const sel of priceSelectors) {
                try {
                    const el = page.locator(sel).first();
                    if (await el.count() > 0) {
                        const t = await el.innerText();
                        if (t.includes('$')) {
                            priceText = t.trim();
                            priceNum = parseFloat(t.replace(/[^0-9.]/g, ''));
                            break;
                        }
                    }
                } catch (e) {}
            }
            if (!priceText) {
                const bodyText = await page.innerText('body');
                const match = bodyText.match(/\$\s*(\d+\.\d{2})/);
                if (match) { priceText = `$${match[1]}`; priceNum = parseFloat(match[1]); }
            }
            console.log(`[NorthCoast] Price: ${priceText || 'not found'}`);

            // Extract PDF link
            let cutsheetUrl = null;
            const pdfLink = page.locator('a[href$=".pdf"], a:has-text("Cut Sheet"), a:has-text("Data Sheet"), a:has-text("Spec Sheet")').first();
            if (await pdfLink.count() > 0) {
                cutsheetUrl = await pdfLink.getAttribute('href');
            }
            if (cutsheetUrl) console.log(`[NorthCoast] Cut sheet: ${cutsheetUrl}`);

            return {
                vendor: 'North Coast Electric',
                vendorShort: 'NorthCoast',
                title: title.trim(),
                sku: 'NCE',
                price: priceText,
                priceNum,
                cutsheetUrl: cutsheetUrl
                    ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.northcoastelectric.com${cutsheetUrl}`)
                    : null,
                pdpUrl: page.url()
            };

        } catch (error) {
            console.error(`[NorthCoast] Error: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 3A: Hubbell Direct
    // ─────────────────────────────────────────────────────────────

    async sourceFromHubbell(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`[Hubbell] Searching for: "${query}"`);
            const searchUrl = `https://www.hubbell.com/hubbell/en/search/?text=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Accept cookies
            const cookieBtn = page.locator('#onetrust-accept-btn-handler');
            await cookieBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await cookieBtn.isVisible()) await cookieBtn.click({ force: true });

            // Click "View Details" on first product
            const viewDetailsBtn = page.locator('a[title="View details"]').first();
            if (await viewDetailsBtn.count() === 0) {
                console.log(`[Hubbell] No results for: "${query}"`);
                return null;
            }
            await viewDetailsBtn.click();
            await page.waitForLoadState('networkidle');

            const title = await page.title();

            // Switch to Resources tab
            const resourcesTab = page.locator('text="Resources and downloads"');
            if (await resourcesTab.count() > 0) {
                await resourcesTab.click();
                await page.waitForTimeout(1000);
            }

            const pdfLink = page.locator('a[title*="Specification Sheet"], a[title*="Spec Sheet"], a:has-text("Specification Sheet"), a:has-text("Cut Sheet")').first();
            const cutsheetUrl = await pdfLink.count() > 0 ? await pdfLink.getAttribute('href') : null;
            if (cutsheetUrl) console.log(`[Hubbell] Cut sheet: ${cutsheetUrl}`);

            return {
                vendor: 'Hubbell Direct',
                vendorShort: 'Hubbell',
                title: title.trim(),
                sku: 'Hubbell-Direct',
                price: null,
                priceNum: null,
                cutsheetUrl: cutsheetUrl
                    ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.hubbell.com${cutsheetUrl}`)
                    : null,
                pdpUrl: page.url()
            };

        } catch (error) {
            console.error(`[Hubbell] Error: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 3B: Leviton Direct
    // ─────────────────────────────────────────────────────────────

    async sourceFromLeviton(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`[Leviton] Searching for: "${query}"`);
            const searchUrl = `https://www.leviton.com/en/search-results?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Close any cookie / modal overlay
            const closeBtn = page.locator('button[aria-label*="close"], button[aria-label*="Close"], button:has-text("Accept")').first();
            await closeBtn.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
            if (await closeBtn.isVisible()) await closeBtn.click().catch(() => {});

            // Click first product result
            const firstProduct = page.locator('.product-tile a, .product-card a, .result-item a, h2 a').first();
            if (await firstProduct.count() === 0) {
                console.log(`[Leviton] No results for: "${query}"`);
                return null;
            }
            await firstProduct.click();
            await page.waitForLoadState('networkidle', { timeout: 20000 });

            const title = await page.title();

            // Look for spec/cut sheet PDF link
            let cutsheetUrl = null;
            const pdfLink = page.locator('a[href$=".pdf"], a:has-text("Spec Sheet"), a:has-text("Cut Sheet"), a:has-text("Data Sheet"), a:has-text("Submittal")').first();
            if (await pdfLink.count() > 0) {
                cutsheetUrl = await pdfLink.getAttribute('href');
                // Sometimes Leviton uses relative /media paths
                if (cutsheetUrl && !cutsheetUrl.startsWith('http')) {
                    cutsheetUrl = `https://www.leviton.com${cutsheetUrl}`;
                }
            }
            if (cutsheetUrl) console.log(`[Leviton] Cut sheet: ${cutsheetUrl}`);

            return {
                vendor: 'Leviton Direct',
                vendorShort: 'Leviton',
                title: title.trim(),
                sku: 'Leviton-Direct',
                price: null,
                priceNum: null,
                cutsheetUrl,
                pdpUrl: page.url()
            };

        } catch (error) {
            console.error(`[Leviton] Error: ${error.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ORCHESTRATION: Multi-Manufacturer Price Comparison
    // ─────────────────────────────────────────────────────────────

    /**
     * For each manufacturer in the list, search Platt, then North Coast, then manufacturer direct.
     * Collect all candidates that have a cut sheet, compare prices, return the lowest-priced one.
     * 
     * @param {string} baseQuery - Generic product type (e.g. "wall switch")
     * @param {string[]} manufacturers - Brands from spec (e.g. ["Hubbell", "Leviton"])
     * @param {object} prefs - { vendors: [...], brands: [...] }
     * @returns {object} { selected: {...}, candidates: [...], reason: "..." }
     */
    async multiManufacturerSource(baseQuery, manufacturers = [], prefs = {}) {
        const hasManufacturers = manufacturers.length > 0;
        
        // Build search variants
        // If manufacturers listed: search "{brand} {product}" for each brand
        // If no manufacturers: fall back to simple tiered search
        const searchTargets = hasManufacturers
            ? manufacturers.map(brand => ({
                brand,
                query: `${brand} ${baseQuery}`.trim().slice(0, 80)
              }))
            : [{ brand: null, query: baseQuery }];

        console.log(`[Sourcing] Multi-source: ${searchTargets.length} target(s) for "${baseQuery}"`);

        const candidates = [];

        for (const target of searchTargets) {
            const { brand, query } = target;
            console.log(`\n[Sourcing] Trying: "${query}"`);
            let found = null;

            // Tier 1: Platt
            found = await this.sourceFromPlatt(query);
            if (found?.cutsheetUrl) {
                found.searchedBrand = brand;
                found.searchQuery = query;
                candidates.push(found);
                console.log(`[Sourcing] ✓ Found on Platt: ${found.price || 'no price'}`);
                continue; // Got it at Platt for this brand, no need to try Tier 2
            }

            // Tier 2: North Coast
            found = await this.sourceFromNorthCoast(query);
            if (found?.cutsheetUrl) {
                found.searchedBrand = brand;
                found.searchQuery = query;
                candidates.push(found);
                console.log(`[Sourcing] ✓ Found on NorthCoast: ${found.price || 'no price'}`);
                continue;
            }

            // Tier 3: Brand-specific manufacturer site (only if brand is named)
            if (brand) {
                const brandLower = brand.toLowerCase();
                if (brandLower.includes('hubbell')) {
                    found = await this.sourceFromHubbell(baseQuery);
                } else if (brandLower.includes('leviton')) {
                    found = await this.sourceFromLeviton(baseQuery);
                }
                if (found?.cutsheetUrl) {
                    found.searchedBrand = brand;
                    found.searchQuery = query;
                    candidates.push(found);
                    console.log(`[Sourcing] ✓ Found on ${brand} direct`);
                }
            }
        }

        if (candidates.length === 0) {
            console.log('[Sourcing] No candidates found across all tiers.');
            return null;
        }

        // Pick winner: prefer lowest price among distributor results (Platt/NorthCoast)
        // Manufacturer-direct results (no price) are used as fallback only
        const withPrice = candidates.filter(c => c.priceNum != null && c.priceNum > 0);
        let selected;
        let reason;

        if (withPrice.length > 0) {
            // Sort by price ascending, pick cheapest
            withPrice.sort((a, b) => a.priceNum - b.priceNum);
            selected = withPrice[0];
            reason = withPrice.length > 1
                ? `Lowest price among ${withPrice.length} vendors: ${withPrice.map(c => `${c.vendorShort} $${c.priceNum?.toFixed(2)}`).join(', ')}`
                : `Only priced result found at ${selected.vendorShort}`;
        } else {
            // No prices found — just use first candidate with a cut sheet
            selected = candidates[0];
            reason = 'No price data available — using first result with cut sheet';
        }

        console.log(`\n[Sourcing] 🏆 Selected: ${selected.vendor} — ${selected.searchedBrand || baseQuery} — ${selected.price || 'no price'}`);
        console.log(`[Sourcing] Reason: ${reason}`);

        return {
            ...selected,
            candidates,
            selectionReason: reason,
            totalCandidates: candidates.length
        };
    }

    /**
     * Legacy simple tiered source (used when no manufacturers listed).
     * Platt → North Coast → Hubbell direct.
     */
    async tieredSource(query, prefs = { vendors: ['Platt'], brands: ['Hubbell'] }) {
        console.log(`[Sourcing] Simple tiered search for: "${query}"`);

        for (const vendor of (prefs.vendors || [])) {
            let result = null;
            if (vendor.toLowerCase().includes('platt')) {
                result = await this.sourceFromPlatt(query);
            } else if (vendor.toLowerCase().includes('north') || vendor.toLowerCase().includes('northcoast')) {
                result = await this.sourceFromNorthCoast(query);
            }
            if (result?.cutsheetUrl) {
                console.log(`[Sourcing] ✓ Found at ${vendor}`);
                return result;
            }
        }

        // Brand fallback
        for (const brand of (prefs.brands || [])) {
            let result = null;
            if (brand.toLowerCase().includes('hubbell')) result = await this.sourceFromHubbell(query);
            else if (brand.toLowerCase().includes('leviton')) result = await this.sourceFromLeviton(query);
            if (result?.cutsheetUrl) {
                console.log(`[Sourcing] ✓ Found at ${brand} direct`);
                return result;
            }
        }

        return null;
    }

    async shutdown() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = SourcingEngine;
