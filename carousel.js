/**
 * Interactive Demo Carousel with Lazy Loading GIFs
 *
 * Features:
 * - Navigate through demo cards with prev/next buttons
 * - Show 3 cards on desktop, 1 on mobile
 * - Lazy load GIFs on hover
 * - Smooth transitions
 * - Keyboard navigation support
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        cardsPerViewDesktop: 3,
        cardsPerViewMobile: 1,
        breakpoint: 768,
        rootMargin: '100px',
        threshold: 0.1
    };

    // State
    const state = {
        currentIndex: 0,
        cardsPerView: window.innerWidth > CONFIG.breakpoint ? CONFIG.cardsPerViewDesktop : CONFIG.cardsPerViewMobile,
        totalCards: 0,
        totalPages: 0,
        sectionVisible: false,
        loadedGifs: new Set()
    };

    // DOM Elements
    let track, cards, prevBtn, nextBtn, demoSection;

    /**
     * Initialize carousel
     */
    function init() {
        // Get DOM elements
        track = document.querySelector('.carousel-track');
        prevBtn = document.querySelector('.carousel-prev');
        nextBtn = document.querySelector('.carousel-next');
        demoSection = document.querySelector('#demo');

        if (!track || !prevBtn || !nextBtn || !demoSection) {
            console.warn('[Carousel] Required elements not found');
            return;
        }

        cards = Array.from(track.children);
        state.totalCards = cards.length;
        state.totalPages = Math.ceil(state.totalCards / state.cardsPerView);

        // Setup event listeners
        setupNavigation();
        setupHoverGifLoading();
        setupIntersectionObserver();
        setupKeyboardNavigation();
        setupResizeHandler();

        // Initial state
        updateButtonStates();

        console.log('[Carousel] Initialized with', state.totalCards, 'cards');
    }

    /**
     * Setup navigation buttons
     */
    function setupNavigation() {
        prevBtn.addEventListener('click', goToPrevPage);
        nextBtn.addEventListener('click', goToNextPage);
    }

    /**
     * Go to previous page
     */
    function goToPrevPage() {
        if (state.currentIndex > 0) {
            state.currentIndex--;
            moveToPage(state.currentIndex);
        }
    }

    /**
     * Go to next page
     */
    function goToNextPage() {
        if (state.currentIndex < state.totalPages - 1) {
            state.currentIndex++;
            moveToPage(state.currentIndex);
        }
    }

    /**
     * Move carousel to specific page
     */
    function moveToPage(pageIndex) {
        const cardWidth = cards[0].getBoundingClientRect().width;
        const gap = parseInt(getComputedStyle(track).gap) || 32;
        const moveAmount = (cardWidth + gap) * state.cardsPerView * pageIndex;

        track.style.transform = `translateX(-${moveAmount}px)`;

        updateButtonStates();

        console.log('[Carousel] Moved to page', pageIndex + 1, 'of', state.totalPages);
    }

    /**
     * Update button enabled/disabled states
     */
    function updateButtonStates() {
        prevBtn.disabled = state.currentIndex === 0;
        nextBtn.disabled = state.currentIndex === state.totalPages - 1;
    }

    /**
     * Setup hover GIF loading
     */
    function setupHoverGifLoading() {
        cards.forEach(card => {
            const media = card.querySelector('.demo-media');
            const gifImg = card.querySelector('.demo-gif');
            const stillImg = card.querySelector('.demo-still');
            const gifUrl = gifImg?.getAttribute('data-gif');

            if (!gifUrl) return;

            // Show GIF on hover
            media.addEventListener('mouseenter', function() {
                if (state.sectionVisible) {
                    loadGif(gifImg, gifUrl);
                }
            });

            // Reset to thumbnail on mouseleave
            media.addEventListener('mouseleave', function() {
                // Fade back to thumbnail
                gifImg.style.opacity = '0';
                stillImg.style.opacity = '1';

                // Reset GIF to first frame after fade completes
                setTimeout(() => {
                    if (gifImg.src && state.loadedGifs.has(gifUrl)) {
                        const currentSrc = gifImg.src;
                        gifImg.src = '';
                        // Force reload after a brief delay
                        setTimeout(() => {
                            gifImg.src = currentSrc;
                        }, 10);
                    }
                }, 400); // Match CSS transition duration
            });
        });
    }

    /**
     * Load a specific GIF
     */
    function loadGif(gifImg, gifUrl) {
        if (state.loadedGifs.has(gifUrl)) {
            return;
        }

        console.log('[Carousel] Loading GIF:', gifUrl);

        gifImg.src = gifUrl;
        state.loadedGifs.add(gifUrl);

        gifImg.addEventListener('load', function() {
            console.log('[Carousel] GIF loaded:', gifUrl);
        }, { once: true });

        gifImg.addEventListener('error', function() {
            console.error('[Carousel] Failed to load GIF:', gifUrl);
        }, { once: true });
    }

    /**
     * Setup Intersection Observer for section visibility
     */
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver(handleSectionVisibility, {
            rootMargin: CONFIG.rootMargin,
            threshold: CONFIG.threshold
        });

        observer.observe(demoSection);
    }

    /**
     * Handle section visibility
     */
    function handleSectionVisibility(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.sectionVisible) {
                state.sectionVisible = true;
                console.log('[Carousel] Section visible, enabling GIF loading');

                // On mobile, autoplay all visible GIFs
                if (window.innerWidth <= CONFIG.breakpoint) {
                    autoplayVisibleGifs();
                }
            }
        });
    }

    /**
     * Autoplay visible GIFs (mobile)
     */
    function autoplayVisibleGifs() {
        const visibleCards = getVisibleCards();

        visibleCards.forEach(card => {
            const gifImg = card.querySelector('.demo-gif');
            const gifUrl = gifImg?.getAttribute('data-gif');

            if (gifUrl) {
                loadGif(gifImg, gifUrl);
                // Show GIF immediately
                gifImg.style.opacity = '1';
                const stillImg = card.querySelector('.demo-still');
                if (stillImg) {
                    stillImg.style.opacity = '0';
                }
            }
        });
    }

    /**
     * Get currently visible cards
     */
    function getVisibleCards() {
        const startIndex = state.currentIndex * state.cardsPerView;
        const endIndex = Math.min(startIndex + state.cardsPerView, state.totalCards);
        return cards.slice(startIndex, endIndex);
    }

    /**
     * Setup keyboard navigation
     */
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                goToPrevPage();
            } else if (e.key === 'ArrowRight') {
                goToNextPage();
            }
        });
    }

    /**
     * Setup resize handler
     */
    function setupResizeHandler() {
        let resizeTimeout;

        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 250);
        });
    }

    /**
     * Handle window resize
     */
    function handleResize() {
        const newCardsPerView = window.innerWidth > CONFIG.breakpoint
            ? CONFIG.cardsPerViewDesktop
            : CONFIG.cardsPerViewMobile;

        if (newCardsPerView !== state.cardsPerView) {
            console.log('[Carousel] Viewport changed, recalculating...');

            state.cardsPerView = newCardsPerView;
            state.totalPages = Math.ceil(state.totalCards / state.cardsPerView);

            // Reset to first page
            state.currentIndex = 0;
            moveToPage(0);

            // On mobile, autoplay visible GIFs
            if (window.innerWidth <= CONFIG.breakpoint && state.sectionVisible) {
                autoplayVisibleGifs();
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.carouselDebug = {
        getState: () => state,
        getConfig: () => CONFIG,
        goToPage: moveToPage,
        resetCarousel: init
    };

})();
