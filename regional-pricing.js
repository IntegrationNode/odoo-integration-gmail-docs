/**
 * Regional Pricing for Odoo Integration for Gmail
 *
 * Uses ParityDeals API to detect visitor's location and display
 * appropriate pricing that matches the checkout price.
 */

(function() {
    'use strict';

    // ===========================================
    // CONFIGURATION
    // ===========================================

    const BASE_PRICE_MONTHLY = 19;
    const ANNUAL_DISCOUNT = 0.8; // 20% off for annual
    const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
    const PD_IDENTIFIER = 'ac2b5915-53b6-4f30-a157-847f446ae825';
    const PARITY_DEALS_API = 'https://api.paritydeals.com/api/v1/deals/discount/?pd_identifier=' + PD_IDENTIFIER;

    // ===========================================
    // PARITY DEALS API
    // ===========================================

    /**
     * Fetch discount information from ParityDeals API
     * @returns {Promise<Object|null>} Discount data or null on error
     */
    async function fetchParityDealsDiscount() {
        try {
            const response = await fetch(PARITY_DEALS_API, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                console.warn('[RegionalPricing] ParityDeals API returned:', response.status);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.warn('[RegionalPricing] Failed to fetch from ParityDeals:', error.message);
            return null;
        }
    }

    /**
     * Calculate prices based on discount percentage
     * @param {number} discountPercent - Discount percentage (e.g., 50 for 50%)
     * @returns {Object} Calculated prices with integer and cents parts
     */
    function calculatePrices(discountPercent) {
        const multiplier = 1 - (discountPercent / 100);
        const monthlyRaw = BASE_PRICE_MONTHLY * multiplier;
        const annualRaw = monthlyRaw * 12 * ANNUAL_DISCOUNT; // Annual = monthly * 12 * 0.8

        // Split into integer and cents
        const monthlyInt = Math.floor(monthlyRaw);
        const monthlyCents = Math.round((monthlyRaw - monthlyInt) * 100);
        const annualInt = Math.floor(annualRaw);
        const annualCents = Math.round((annualRaw - annualInt) * 100);

        return {
            monthly: monthlyInt,
            monthlyCents: monthlyCents.toString().padStart(2, '0'),
            annual: annualInt,
            annualCents: annualCents.toString().padStart(2, '0'),
            discountPercent
        };
    }

    /**
     * Format price with cents in superscript (for large prices)
     * @param {number} integer - Integer part
     * @param {string} cents - Cents part (2 digits)
     * @returns {string} HTML string with formatted price
     */
    function formatPriceWithCents(integer, cents) {
        if (cents === '00') {
            return integer.toString();
        }
        return integer + '<span class="cents">' + cents + '</span>';
    }

    /**
     * Format price as plain text with decimal (for small text prices)
     * @param {number} integer - Integer part
     * @param {string} cents - Cents part (2 digits)
     * @returns {string} Plain text price like "$109.20"
     */
    function formatPriceText(integer, cents) {
        if (cents === '00') {
            return '$' + integer;
        }
        return '$' + integer + '.' + cents;
    }

    /**
     * Update DOM elements with regional prices
     * @param {Object} prices - Calculated prices
     * @param {Object} data - ParityDeals response data
     */
    function updatePriceDisplay(prices, data) {
        const annualPriceText = formatPriceText(prices.annual, prices.annualCents);
        const monthlyPriceText = formatPriceText(prices.monthly, prices.monthlyCents);

        // Update PLUS card monthly price (pricing.html)
        const plusCard = document.querySelector('.pricing-card-extended.featured');
        if (plusCard) {
            // Update main price with cents in superscript
            const amountEl = plusCard.querySelector('.price-large .amount');
            if (amountEl) {
                amountEl.innerHTML = formatPriceWithCents(prices.monthly, prices.monthlyCents);
            }

            // Update annual price option (plain text format)
            const annualStrong = plusCard.querySelector('.price-annual-option strong');
            if (annualStrong) {
                const perYearSpan = annualStrong.querySelector('[data-t]');
                const perYearText = perYearSpan ? perYearSpan.textContent : '/year';
                annualStrong.innerHTML = annualPriceText + '<span>' + perYearText + '</span>';
            }
        }

        // Update homepage pricing section if present
        const homePlusCard = document.querySelector('.pricing-card.featured:not(.pricing-card-extended)');
        if (homePlusCard) {
            // Update main price with cents in superscript
            const amountEl = homePlusCard.querySelector('.price .amount');
            if (amountEl) {
                amountEl.innerHTML = formatPriceWithCents(prices.monthly, prices.monthlyCents);
            }

            // Update annual text - match pricing.html structure with <strong>
            // Structure: <div class="price-annual"><span>or $182/year</span>...
            const annualDiv = homePlusCard.querySelector('.price-annual');
            if (annualDiv) {
                const annualSpan = annualDiv.querySelector('span:first-child');
                if (annualSpan) {
                    // Rebuild with <strong> to match pricing.html format
                    annualSpan.innerHTML = 'or <strong>' + annualPriceText + '/year</strong>';
                }
            }
        }

        // Update any comparison tables (plain text format)
        document.querySelectorAll('.comparison-table td, .comparison-table th').forEach(cell => {
            if (cell.textContent.includes('$19')) {
                cell.textContent = cell.textContent.replace(/\$19/g, monthlyPriceText);
            }
            if (cell.textContent.includes('$182')) {
                cell.textContent = cell.textContent.replace(/\$182/g, annualPriceText);
            }
        });

        // Update Schema.org JSON-LD if present
        updateSchemaOrg(prices);
    }

    /**
     * Update Schema.org structured data
     * @param {Object} prices - Calculated prices
     */
    function updateSchemaOrg(prices) {
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        schemaScripts.forEach(script => {
            try {
                const schema = JSON.parse(script.textContent);
                if (schema.offers && Array.isArray(schema.offers)) {
                    let modified = false;
                    schema.offers.forEach(offer => {
                        if (offer.name && offer.name.includes('Monthly')) {
                            offer.price = prices.monthly.toString();
                            modified = true;
                        } else if (offer.name && offer.name.includes('Yearly')) {
                            offer.price = prices.annual.toString();
                            modified = true;
                        }
                    });
                    if (modified) {
                        script.textContent = JSON.stringify(schema);
                    }
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        });
    }

    /**
     * Show regional pricing banner
     * @param {Object} data - ParityDeals response data
     * @param {Object} prices - Calculated prices
     */
    function showRegionalBanner(data, prices) {
        // Don't show banner if no discount
        if (!data.discountPercentage || parseFloat(data.discountPercentage) === 0) {
            return;
        }

        const banner = document.createElement('div');
        banner.className = 'regional-pricing-banner';
        banner.innerHTML = '<span class="country-flag">' + (data.countryFlag || '') + '</span> ' +
            '<span class="discount-text">' + (data.messageText || (Math.round(data.discountPercentage) + '% OFF for ' + data.country)) + '</span>';

        banner.style.cssText =
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'gap: 0.5rem;' +
            'padding: 0.875rem 1rem;' +
            'background: linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%);' +
            'color: #166534;' +
            'border-radius: 12px;' +
            'font-size: 0.9375rem;' +
            'font-weight: 500;' +
            'margin: 0 auto 1.5rem auto;' +
            'max-width: 400px;' +
            'box-shadow: 0 2px 8px rgba(22, 101, 52, 0.1);' +
            'animation: slideIn 0.3s ease-out;';

        // Add animation keyframes
        if (!document.getElementById('regional-pricing-styles')) {
            const style = document.createElement('style');
            style.id = 'regional-pricing-styles';
            style.textContent = '@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }';
            document.head.appendChild(style);
        }

        // Insert after pricing hero or at the start of pricing section
        const pricingHero = document.querySelector('.pricing-hero');
        const pricingSection = document.querySelector('.pricing-section') || document.querySelector('[class*="pricing"]');

        if (pricingHero && pricingHero.parentNode) {
            pricingHero.parentNode.insertBefore(banner, pricingHero.nextSibling);
        } else if (pricingSection) {
            pricingSection.insertBefore(banner, pricingSection.firstChild);
        }
    }

    // ===========================================
    // CACHING
    // ===========================================

    /**
     * Store discount data in sessionStorage
     * @param {Object} data - ParityDeals response data
     */
    function cacheDiscountData(data) {
        try {
            sessionStorage.setItem('parity_deals_discount', JSON.stringify(data));
            sessionStorage.setItem('parity_deals_timestamp', Date.now().toString());
        } catch (e) {
            // sessionStorage not available
        }
    }

    /**
     * Get cached discount data if still valid
     * @returns {Object|null} Cached data or null
     */
    function getCachedDiscountData() {
        try {
            const data = sessionStorage.getItem('parity_deals_discount');
            const timestamp = sessionStorage.getItem('parity_deals_timestamp');

            if (data && timestamp) {
                const age = Date.now() - parseInt(timestamp, 10);
                if (age < CACHE_DURATION_MS) {
                    return JSON.parse(data);
                }
            }
        } catch (e) {
            // sessionStorage not available or parse error
        }
        return null;
    }

    // ===========================================
    // PRICE VISIBILITY CONTROL
    // ===========================================

    const PRICE_SELECTORS = '.price-large .amount, .price .amount, .price-annual-option strong, .annual-price, .price-annual';

    /**
     * Hide price elements initially to prevent flash
     * Note: CSS is already in HTML <head>, this is just a fallback
     */
    function hidePrices() {
        if (document.getElementById('regional-pricing-hide')) return;
        const style = document.createElement('style');
        style.id = 'regional-pricing-hide';
        style.textContent = PRICE_SELECTORS + ' { opacity: 0; }';
        document.head.appendChild(style);
    }

    /**
     * Show price elements with fade-in
     */
    function showPrices() {
        const style = document.getElementById('regional-pricing-hide');
        if (style) {
            style.textContent = PRICE_SELECTORS + ' { opacity: 1; transition: opacity 0.2s ease-in; }';
        }
    }

    // ===========================================
    // MAIN INITIALIZATION
    // ===========================================

    async function init() {
        // Only run on pages with pricing content
        const hasPricingContent = document.querySelector('.pricing-card, .pricing-card-extended, [class*="pricing"]');
        if (!hasPricingContent) {
            return;
        }

        // Hide prices immediately to prevent flash
        hidePrices();

        // Check cache first
        let data = getCachedDiscountData();

        if (!data) {
            data = await fetchParityDealsDiscount();
            if (data) {
                cacheDiscountData(data);
            }
        }

        if (!data) {
            console.log('[RegionalPricing] No discount data available, using default prices');
            showPrices();
            return;
        }

        // Log API response for debugging
        console.log('[RegionalPricing] API response:', {
            country: data.country,
            countryCode: data.countryCode,
            discountPercentage: data.discountPercentage,
            isVpn: data.isVpn,
            isProxy: data.isProxy,
            isTor: data.isTor
        });

        // Determine discount percentage
        let discountPercent = 0;

        // Check for VPN/proxy - use base price if detected
        if (data.isVpn || data.isProxy || data.isTor) {
            console.log('[RegionalPricing] VPN/Proxy detected, using default prices');
        } else {
            discountPercent = parseFloat(data.discountPercentage || 0);
            if (discountPercent === 0) {
                console.log('[RegionalPricing] No discount for', data.country || 'this region');
            } else {
                console.log('[RegionalPricing] Applying', discountPercent + '% discount for', data.country);
            }
        }

        // Always update display to ensure consistent formatting
        const prices = calculatePrices(discountPercent);
        updatePriceDisplay(prices, data);
        showPrices();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
