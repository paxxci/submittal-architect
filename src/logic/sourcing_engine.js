const { chromium } = require('playwright');

/**
 * Sourcing Engine — Spec-Verified Product Discovery
 *
 * Flow:
 *   1. getPlattCandidates(query)  → returns top 5 product titles+hrefs from search results
 *   2. AI scores candidates against spec keyRequirements → picks winner
 *   3. getPlattPDP(href)          → navigates to winner's page, returns price + cut sheet URL
 *
 * Tier 1: Platt.com
 * Tier 2: North Coast Electric
 * Tier 3: Manufacturer direct (Hubbell, Leviton)
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
    // PLATT — Step 1: Get search result candidates (no PDP navigation)
    // ─────────────────────────────────────────────────────────────

    /**
     * Search Platt.com and return up to `maxResults` product candidates
     * WITHOUT navigating to any individual product page.
     * Returns: [{ title, description, href }]
     */
    async getPlattCandidates(query, maxResults = 5) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`[Platt] Getting candidates for: "${query}"`);
            const searchUrl = `https://www.platt.com/search.aspx?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Dismiss cookie banner
            const cookieBtn = page.locator('button:has-text("OK")');
            if (await cookieBtn.isVisible()) {
                await cookieBtn.click();
                await page.waitForTimeout(600);
            }

            // Wait for results to appear
            try {
                await page.locator('h2:visible').first().waitFor({ state: 'visible', timeout: 12000 });
            } catch (e) {
                console.log('[Platt] No h2 results found on search page.');
                return [];
            }

            // Collect all visible product h2 titles + their closest anchor href
            const candidates = await page.evaluate((max) => {
                const results = [];
                const headings = document.querySelectorAll('h2');
                for (const h2 of headings) {
                    if (results.length >= max) break;
                    const text = h2.innerText?.trim();
                    if (!text || text.length < 3) continue;

                    // Find the closest ancestor or sibling anchor link for this product
                    let href = null;
                    const anchor = h2.querySelector('a') || h2.closest('a');
                    if (anchor) {
                        href = anchor.href;
                    } else {
                        // Look for a nearby link in the parent card/container
                        const container = h2.closest('div, li, article');
                        if (container) {
                            const link = container.querySelector('a[href*="product"], a[href*="/p/"]');
                            if (link) href = link.href;
                        }
                    }

                    // Grab a short description if available (specs, features, etc.)
                    const container = h2.closest('div, li, article');
                    let description = '';
                    if (container) {
                        const descEl = container.querySelector('p, .description, .product-description, [class*="desc"]');
                        if (descEl) description = descEl.innerText?.trim().slice(0, 200);
                    }

                    results.push({ title: text, href, description });
                }
                return results;
            }, maxResults);

            console.log(`[Platt] Found ${candidates.length} candidates: ${candidates.map(c => `"${c.title}"`).join(', ')}`);
            return candidates;

        } catch (err) {
            console.error(`[Platt] getPlattCandidates error: ${err.message}`);
            return [];
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PLATT — Step 2: Navigate to winning product's PDP
    // ─────────────────────────────────────────────────────────────

    /**
     * Navigate to a specific Platt product page and extract price + cut sheet URL.
     * @param {string} href - Full URL to the Platt product page
     * @param {string} fallbackQuery - Used if href is null (click first result via search)
     */
    async getPlattPDP(href, fallbackQuery = null) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            if (href) {
                console.log(`[Platt] Navigating to PDP: ${href}`);
                await page.goto(href, { waitUntil: 'load', timeout: 60000 });
            } else if (fallbackQuery) {
                // Fallback: search and click first result
                const searchUrl = `https://www.platt.com/search.aspx?q=${encodeURIComponent(fallbackQuery)}`;
                await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
                const firstH2 = page.locator('h2:visible').first();
                await firstH2.waitFor({ state: 'visible', timeout: 12000 });
                await firstH2.click();
            } else {
                return null;
            }

            // Wait for PDP to load
            await page.waitForSelector('text=Item #:', { timeout: 30000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });

            const html = await page.content();
            const skuMatch = html.match(/Item #:\s*(\d+)/);
            const sku = skuMatch ? skuMatch[1] : 'Unknown';
            const title = await page.title();

            // Extract price
            let priceText = null;
            let priceNum = null;
            for (const sel of ['.text-h5', 'span[data-price]', '.product-price', '.price-block span']) {
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
                const m = bodyText.match(/\$\s*(\d+\.\d{2})/);
                if (m) { priceText = `$${m[1]}`; priceNum = parseFloat(m[1]); }
            }

            // Extract cut sheet PDF
            let cutsheetUrl = null;
            const pdfLocator = page.locator('a').filter({ hasText: /Catalog Page|Cut Sheet|Data Sheet|Submittal|Technical|Specification|Product Specs/i });
            if (await pdfLocator.count() > 0) {
                cutsheetUrl = await pdfLocator.first().getAttribute('href');
            } else {
                const fallbackPdf = page.locator('a[href$=".pdf"]').first();
                if (await fallbackPdf.count() > 0) cutsheetUrl = await fallbackPdf.getAttribute('href');
            }

            console.log(`[Platt] PDP: "${title}" | Price: ${priceText || 'N/A'} | PDF: ${cutsheetUrl ? 'found' : 'not found'}`);

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

        } catch (err) {
            console.error(`[Platt] getPlattPDP error: ${err.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // NORTH COAST — Candidates + PDP
    // ─────────────────────────────────────────────────────────────

    async getNorthCoastCandidates(query, maxResults = 5) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            console.log(`[NorthCoast] Getting candidates for: "${query}"`);
            const searchUrl = `https://www.northcoastelectric.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });

            // Wait for results
            const resultSelectors = ['a.product-item__title', 'a.product-title', 'h2 a', 'h3 a', '.product a'];
            let found = false;
            for (const sel of resultSelectors) {
                if (await page.locator(sel).count() > 0) { found = true; break; }
            }
            if (!found) return [];

            const candidates = await page.evaluate((max) => {
                const results = [];
                const anchors = document.querySelectorAll('a.product-item__title, a.product-title, .product-list-item a, h2 a, h3 a');
                for (const a of anchors) {
                    if (results.length >= max) break;
                    const text = a.innerText?.trim();
                    if (!text || text.length < 3) continue;
                    results.push({ title: text, href: a.href, description: '' });
                }
                return results;
            }, maxResults);

            console.log(`[NorthCoast] Found ${candidates.length} candidates`);
            return candidates;

        } catch (err) {
            console.error(`[NorthCoast] getCandidates error: ${err.message}`);
            return [];
        } finally {
            await page.close();
        }
    }

    async getNorthCoastPDP(href) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();

        try {
            await page.goto(href, { waitUntil: 'load', timeout: 60000 });
            await page.waitForLoadState('networkidle', { timeout: 10000 });

            const title = await page.title();
            let priceText = null, priceNum = null;

            for (const sel of ['.product-price', '.price', '[data-price]', '.product__price']) {
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

            let cutsheetUrl = null;
            const pdfLink = page.locator('a[href$=".pdf"], a:has-text("Cut Sheet"), a:has-text("Data Sheet"), a:has-text("Spec Sheet")').first();
            if (await pdfLink.count() > 0) {
                const raw = await pdfLink.getAttribute('href');
                cutsheetUrl = raw?.startsWith('http') ? raw : `https://www.northcoastelectric.com${raw}`;
            }

            return {
                vendor: 'North Coast Electric',
                vendorShort: 'NorthCoast',
                title: title.trim(),
                sku: 'NCE',
                price: priceText,
                priceNum,
                cutsheetUrl,
                pdpUrl: page.url()
            };

        } catch (err) {
            console.error(`[NorthCoast] getPDP error: ${err.message}`);
            return null;
        } finally {
            await page.close();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 3: Manufacturer direct (Hubbell, Leviton)
    // ─────────────────────────────────────────────────────────────

    async sourceFromHubbell(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            console.log(`[Hubbell] Searching for: "${query}"`);
            await page.goto(`https://www.hubbell.com/hubbell/en/search/?text=${encodeURIComponent(query)}`, { waitUntil: 'load', timeout: 60000 });

            const cookieBtn = page.locator('#onetrust-accept-btn-handler');
            await cookieBtn.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
            if (await cookieBtn.isVisible()) await cookieBtn.click({ force: true });

            const viewBtn = page.locator('a[title="View details"]').first();
            if (await viewBtn.count() === 0) return null;
            await viewBtn.click();
            await page.waitForLoadState('networkidle');

            const resourcesTab = page.locator('text="Resources and downloads"');
            if (await resourcesTab.count() > 0) { await resourcesTab.click(); await page.waitForTimeout(1000); }

            const pdfLink = page.locator('a[title*="Specification Sheet"], a[title*="Spec Sheet"], a:has-text("Specification Sheet"), a:has-text("Cut Sheet")').first();
            const cutsheetUrl = await pdfLink.count() > 0 ? await pdfLink.getAttribute('href') : null;

            return {
                vendor: 'Hubbell Direct', vendorShort: 'Hubbell',
                title: (await page.title()).trim(), sku: 'Hubbell-Direct',
                price: null, priceNum: null,
                cutsheetUrl: cutsheetUrl ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.hubbell.com${cutsheetUrl}`) : null,
                pdpUrl: page.url()
            };
        } catch (err) { console.error(`[Hubbell] Error: ${err.message}`); return null; }
        finally { await page.close(); }
    }

    async sourceFromLeviton(query) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            console.log(`[Leviton] Searching for: "${query}"`);
            await page.goto(`https://www.leviton.com/en/search-results?q=${encodeURIComponent(query)}`, { waitUntil: 'load', timeout: 60000 });

            const closeBtn = page.locator('button[aria-label*="close"], button[aria-label*="Close"], button:has-text("Accept")').first();
            await closeBtn.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
            if (await closeBtn.isVisible()) await closeBtn.click().catch(() => {});

            const firstProduct = page.locator('.product-tile a, .product-card a, .result-item a, h2 a').first();
            if (await firstProduct.count() === 0) return null;
            await firstProduct.click();
            await page.waitForLoadState('networkidle', { timeout: 20000 });

            let cutsheetUrl = null;
            const pdfLink = page.locator('a[href$=".pdf"], a:has-text("Spec Sheet"), a:has-text("Cut Sheet"), a:has-text("Data Sheet")').first();
            if (await pdfLink.count() > 0) {
                const raw = await pdfLink.getAttribute('href');
                cutsheetUrl = raw?.startsWith('http') ? raw : `https://www.leviton.com${raw}`;
            }

            return {
                vendor: 'Leviton Direct', vendorShort: 'Leviton',
                title: (await page.title()).trim(), sku: 'Leviton-Direct',
                price: null, priceNum: null, cutsheetUrl, pdpUrl: page.url()
            };
        } catch (err) { console.error(`[Leviton] Error: ${err.message}`); return null; }
        finally { await page.close(); }
    }

    async shutdown() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = SourcingEngine;
