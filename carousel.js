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
        setupLightboxHandlers();

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
                    // Force reload GIF to restart from frame 1
                    const wasLoaded = state.loadedGifs.has(gifUrl);
                    if (wasLoaded) {
                        // Reset src to force browser to reload and restart animation
                        gifImg.src = '';
                        // Brief delay before setting src again
                        setTimeout(() => {
                            gifImg.src = gifUrl;
                            // Fade in the GIF
                            gifImg.style.opacity = '1';
                            stillImg.style.opacity = '0';
                        }, 10);
                    } else {
                        // First time loading
                        loadGif(gifImg, gifUrl);
                        // Fade in the GIF
                        gifImg.style.opacity = '1';
                        stillImg.style.opacity = '0';
                    }
                }
            });

            // Reset to thumbnail on mouseleave
            media.addEventListener('mouseleave', function() {
                // Fade back to thumbnail
                gifImg.style.opacity = '0';
                stillImg.style.opacity = '1';
            });

            // Open lightbox on click
            media.addEventListener('click', function(e) {
                e.preventDefault();
                const gifUrl = gifImg?.getAttribute('data-gif');
                if (gifUrl && state.sectionVisible) {
                    openLightbox(gifUrl);
                }
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
     * Open lightbox with GIF
     */
    function openLightbox(gifUrl) {
        const lightbox = document.getElementById('demo-lightbox');
        const lightboxImage = lightbox?.querySelector('.demo-lightbox-image');

        if (!lightbox || !lightboxImage) return;

        // Set image source
        lightboxImage.src = gifUrl;

        // Show lightbox
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('[Carousel] Lightbox opened:', gifUrl);
    }

    /**
     * Close lightbox
     */
    function closeLightbox() {
        const lightbox = document.getElementById('demo-lightbox');

        if (!lightbox) return;

        // Hide lightbox
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');

        // Restore body scroll
        document.body.style.overflow = '';

        // Clear image after animation
        setTimeout(() => {
            const lightboxImage = lightbox.querySelector('.demo-lightbox-image');
            if (lightboxImage) {
                lightboxImage.src = '';
            }
        }, 200); // Match transition time

        console.log('[Carousel] Lightbox closed');
    }

    /**
     * Setup lightbox close handlers
     */
    function setupLightboxHandlers() {
        const lightbox = document.getElementById('demo-lightbox');

        if (!lightbox) return;

        // Close on click anywhere
        lightbox.addEventListener('click', closeLightbox);

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });

        // Close on scroll
        window.addEventListener('scroll', function() {
            if (lightbox.classList.contains('active')) {
                closeLightbox();
            }
        }, { passive: true });
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
