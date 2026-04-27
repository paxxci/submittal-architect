const { chromium } = require('playwright');

/**
 * Sourcing Engine — Spec-Verified Product Discovery
 * 
 * Hierarchy:
 *   Tier 0: Preferred Domains (User's specific vendors)
 *   Tier 1: Manufacturer Direct (Extracted from Spec)
 *   Tier 2: Global Fallback (Verified Industrial Domains)
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
    // VENDOR-SPECIFIC UTILITIES (PLATT / NORTH COAST)
    // ─────────────────────────────────────────────────────────────

    async getPlattCandidates(query, maxResults = 5) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            console.log(`[Platt] Getting candidates for: "${query}"`);
            const searchUrl = `https://www.platt.com/search.aspx?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
            const cookieBtn = page.locator('button:has-text("OK")');
            if (await cookieBtn.isVisible()) await cookieBtn.click();
            
            try { await page.locator('h2:visible').first().waitFor({ state: 'visible', timeout: 12000 }); }
            catch (e) { return []; }

            return await page.evaluate((max) => {
                const results = [];
                const headings = document.querySelectorAll('h2');
                for (const h2 of headings) {
                    if (results.length >= max) break;
                    const text = h2.innerText?.trim();
                    if (!text || text.length < 3) continue;
                    const anchor = h2.querySelector('a') || h2.closest('a');
                    results.push({ title: text, href: anchor ? anchor.href : null, description: '' });
                }
                return results;
            }, maxResults);
        } catch (err) {
            console.error(`[Platt] Candidates error: ${err.message}`);
            return [];
        } finally { await page.close(); }
    }

    async getPlattPDP(href) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            await page.goto(href, { waitUntil: 'load', timeout: 45000 });
            const html = await page.content();
            const skuMatch = html.match(/Item #:\s*(\d+)/);
            const title = await page.title();
            
            let priceText = null;
            for (const sel of ['.text-h5', 'span[data-price]', '.product-price']) {
                const el = page.locator(sel).first();
                if (await el.count() > 0) {
                    const t = await el.innerText();
                    if (t.includes('$')) { priceText = t.trim(); break; }
                }
            }

            let cutsheetUrl = null;
            const pdfLoc = page.locator('a').filter({ hasText: /Catalog Page|Cut Sheet|Data Sheet|Submittal|Technical|Specification/i });
            if (await pdfLoc.count() > 0) cutsheetUrl = await pdfLoc.first().getAttribute('href');
            else {
                const fpdf = page.locator('a[href$=".pdf"]').first();
                if (await fpdf.count() > 0) cutsheetUrl = await fpdf.getAttribute('href');
            }

            return {
                vendor: 'Platt Electric Supply', vendorShort: 'Platt',
                title: title.trim(), sku: skuMatch ? skuMatch[1] : 'Unknown',
                price: priceText, cutsheetUrl: cutsheetUrl ? (cutsheetUrl.startsWith('http') ? cutsheetUrl : `https://www.platt.com${cutsheetUrl}`) : null,
                pdpUrl: page.url()
            };
        } catch (err) { return null; } finally { await page.close(); }
    }

    async getNorthCoastCandidates(query, maxResults = 5) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            const searchUrl = `https://www.northcoastelectric.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
            return await page.evaluate((max) => {
                const results = [];
                const anchors = document.querySelectorAll('a.product-item__title, a.product-title, h2 a, h3 a');
                for (const a of anchors) {
                    if (results.length >= max) break;
                    results.push({ title: a.innerText?.trim(), href: a.href, description: '' });
                }
                return results;
            }, maxResults);
        } catch (err) { return []; } finally { await page.close(); }
    }

    async getNorthCoastPDP(href) {
        if (!this.browser) await this.init();
        const page = await this.context.newPage();
        try {
            await page.goto(href, { waitUntil: 'load', timeout: 45000 });
            const pdf = page.locator('a[href$=".pdf"], a:has-text("Cut Sheet"), a:has-text("Data Sheet")').first();
            let cutsheetUrl = null;
            if (await pdf.count() > 0) {
                const raw = await pdf.getAttribute('href');
                cutsheetUrl = raw?.startsWith('http') ? raw : `https://www.northcoastelectric.com${raw}`;
            }
            return {
                vendor: 'North Coast Electric', vendorShort: 'NorthCoast',
                title: await page.title(), sku: 'NCE', price: 'Contact for Price',
                cutsheetUrl, pdpUrl: page.url()
            };
        } catch (err) { return null; } finally { await page.close(); }
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 1: MANUFACTURER DIRECT
    // ─────────────────────────────────────────────────────────────

    static MANUFACTURER_SEARCH_URLS = {
        'hubbell':       'https://www.hubbell.com/hubbell/en/search/?text={QUERY}',
        'leviton':       'https://www.leviton.com/en/search-results?q={QUERY}',
        'legrand':       'https://www.legrand.us/search#q={QUERY}&t=All',
        'lutron':        'https://www.lutron.com/en-US/Search/Pages/Results.aspx?k={QUERY}',
        'eaton':         'https://www.eaton.com/us/en-us/search.html?q={QUERY}',
        'siemens':       'https://mall.industry.siemens.com/mall/en/us/catalog/search.aspx?searchTerm={QUERY}',
        'square d':      'https://www.se.com/ww/en/search/?q={QUERY}',
        'schneider':     'https://www.se.com/ww/en/search/?q={QUERY}',
        'abb':           'https://search.abb.com/library/?q={QUERY}',
        'panduit':       'https://www.panduit.com/en/search.html?q={QUERY}',
        'milwaukee':     'https://www.milwaukeetool.com/Search#q={QUERY}',
        'hoffman':       'https://hoffman.nvent.com/en-us/search?searchPhrase={QUERY}',
        'nvent':         'https://hoffman.nvent.com/en-us/search?searchPhrase={QUERY}',
        'southwire':     'https://www.southwire.com/search?q={QUERY}',
        'ideal':         'https://www.idealindustries.com/search?q={QUERY}',
        'klein':         'https://www.kleintools.com/search?query={QUERY}',
    };

    async sourceFromManufacturerDirect(manufacturerName, productQuery) {
        if (!this.browser) await this.init();
        const nameLower = manufacturerName.toLowerCase().trim();
        let searchUrl = null;
        for (const [key, urlTpl] of Object.entries(SourcingEngine.MANUFACTURER_SEARCH_URLS)) {
            if (nameLower.includes(key) || key.includes(nameLower)) {
                searchUrl = urlTpl.replace('{QUERY}', encodeURIComponent(productQuery));
                break;
            }
        }
        if (!searchUrl) {
            searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(`${manufacturerName} ${productQuery} cut sheet filetype:pdf`)}&ia=web`;
        }

        const page = await this.context.newPage();
        try {
            await page.goto(searchUrl, { waitUntil: 'load', timeout: 45000 });
            await page.waitForTimeout(2000);

            // Strategy 1: Find direct PDF
            const pdf = page.locator('a[href$=".pdf"]').first();
            if (await pdf.count() > 0) {
                const raw = await pdf.getAttribute('href');
                return {
                    vendor: `${manufacturerName} Direct`, vendorShort: manufacturerName,
                    title: await page.title(), sku: null, price: null,
                    cutsheetUrl: raw.startsWith('http') ? raw : `${new URL(searchUrl).origin}${raw}`,
                    pdpUrl: page.url()
                };
            }

            // Strategy 2: Click first product, look for tech tabs
            const first = page.locator('a[href*="/product/"], a[href*="/catalog/"], a[href*="/p/"], h2 a, h3 a').first();
            if (await first.count() > 0) {
                await first.click();
                await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
                await page.waitForTimeout(1500);

                const techTabs = page.locator('button, a').filter({ hasText: /Technical|Documentation|Downloads|Resources|Support/i });
                if (await techTabs.count() > 0) {
                    await techTabs.first().click().catch(() => {});
                    await page.waitForTimeout(800);
                }

                const pdpPdf = page.locator('a[href$=".pdf"], a:has-text("Spec Sheet"), a:has-text("Data Sheet"), a:has-text("Cut Sheet")').first();
                if (await pdpPdf.count() > 0) {
                    const raw = await pdpPdf.getAttribute('href');
                    const cur = new URL(page.url());
                    return {
                        vendor: `${manufacturerName} Direct`, vendorShort: manufacturerName,
                        title: await page.title(), sku: null, price: null,
                        cutsheetUrl: raw.startsWith('http') ? raw : `${cur.protocol}//${cur.host}${raw.startsWith('/') ? '' : '/'}${raw}`,
                        pdpUrl: page.url()
                    };
                }
            }
            return null;
        } catch (err) { return null; } finally { await page.close(); }
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 0 / 2: CUSTOM DOMAIN SEARCH (PREFERRED OR GLOBAL FALLBACK)
    // ─────────────────────────────────────────────────────────────

    async sourceFromCustomDomains(domains, productQuery, keyRequirements = [], approvedManufacturers = []) {
        if (!this.browser) await this.init();
        if (!domains || domains.length === 0) return null;

        for (const domain of domains) {
            const cleanDomain = domain.replace(/https?:\/\//, '').replace(/www\./, '').split('/')[0];
            
            // --- NATIVE INTERCEPTS ---
            if (cleanDomain.includes('platt.com')) {
                const candidates = await this.getPlattCandidates(productQuery);
                if (candidates && candidates.length > 0) {
                    // Just take the top result for speed in the demo, or use AI to pick
                    const best = candidates[0]; 
                    if (best.href) {
                        const pdp = await this.getPlattPDP(best.href);
                        if (pdp && pdp.cutsheetUrl) return pdp;
                    }
                }
                continue; // Skip DDG for Platt
            }
            if (cleanDomain.includes('northcoast') || cleanDomain.includes('northcoastelectric.com')) {
                const candidates = await this.getNorthCoastCandidates(productQuery);
                if (candidates && candidates.length > 0) {
                    const best = candidates[0];
                    if (best.href) {
                        const pdp = await this.getNorthCoastPDP(best.href);
                        if (pdp && pdp.cutsheetUrl) return pdp;
                    }
                }
                continue; // Skip DDG for North Coast
            }
            
            // --- DUCKDUCKGO FALLBACK ---
            const ddgQuery = `site:${cleanDomain} ${productQuery} cut sheet filetype:pdf`;
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`;
            
            const page = await this.context.newPage();
            try {
                console.log(`[DDG] Searching: ${searchUrl}`);
                await page.goto(searchUrl, { waitUntil: 'load', timeout: 30000 });
                await page.waitForTimeout(1000);

                const bestPdf = await page.evaluate(() => {
                    const link = Array.from(document.querySelectorAll('a')).find(a => a.href.toLowerCase().endsWith('.pdf'));
                    return link ? { href: link.href, text: link.innerText } : null;
                });

                if (bestPdf) {
                    console.log(`[DDG] Found PDF: ${bestPdf.href}`);
                    return {
                        vendor: `${cleanDomain}`, vendorShort: cleanDomain,
                        title: bestPdf.text || `Product Data Sheet (${cleanDomain})`,
                        sku: 'PREF', price: null,
                        cutsheetUrl: bestPdf.href, pdpUrl: page.url()
                    };
                }

                console.log(`[DDG] No direct PDF found. Trying PDP search...`);
                // Strategy 2: PDP Search
                const pdpQuery = `site:${cleanDomain} ${productQuery}`;
                const pdpSearchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(pdpQuery)}&ia=web`;
                await page.goto(pdpSearchUrl, { waitUntil: 'load', timeout: 25000 });
                const res = await page.evaluate((d) => {
                    return Array.from(document.querySelectorAll('a'))
                        .map(a => a.href)
                        .filter(h => h.includes(d) && !h.includes('duckduckgo.com'))[0];
                }, cleanDomain);
                
                console.log(`[DDG] PDP Result Link: ${res || 'none'}`);

                if (res) {
                    await page.goto(res, { waitUntil: 'load', timeout: 20000 });
                    const pdfOnPage = await page.evaluate(() => {
                        const allLinks = Array.from(document.querySelectorAll('a'));
                        const selectors = [
                            'a[href$=".pdf"]', 
                            'a:has-text("Spec Sheet")', 
                            'a:has-text("Data Sheet")', 
                            'a:has-text("Technical Documentation")',
                            'a:has-text("Product PDF")',
                            'a:has-text("Download PDF")',
                            'a:has-text("Cut Sheet")',
                            'a:has-text("Catalog Page")',
                            '.pdf-link', '.download-link', 'a[title*="PDF"]'
                        ];
                        for (const selector of selectors) {
                            try {
                                const el = document.querySelector(selector);
                                if (el && el.href) return { href: el.href, text: el.innerText };
                            } catch (e) {}
                        }
                        
                        // Last resort: find any link containing 'download' and '.pdf' or just any PDF
                        const found = allLinks.find(a => 
                            a.href && (
                                (a.href.toLowerCase().includes('download') && a.href.toLowerCase().includes('.pdf')) ||
                                a.href.toLowerCase().endsWith('.pdf') ||
                                (a.innerText && /Cut Sheet|Data Sheet|Spec Sheet|PDF/i.test(a.innerText))
                            )
                        );
                        return found ? { href: found.href, text: found.innerText } : null;
                    });
                    if (pdfOnPage) {
                        return {
                            vendor: `${cleanDomain}`, vendorShort: cleanDomain,
                            title: pdfOnPage.text || `${productQuery} (${cleanDomain})`,
                            sku: 'PREF', price: null,
                            cutsheetUrl: pdfOnPage.href, pdpUrl: res
                        };
                    }
                }
            } catch (err) { } finally { await page.close(); }
        }
        return null;
    }

    async shutdown() {
        if (this.browser) { await this.browser.close(); this.browser = null; }
    }
}

module.exports = SourcingEngine;
