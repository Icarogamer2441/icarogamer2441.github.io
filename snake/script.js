
document.addEventListener('DOMContentLoaded', () => {
    // Basic Scroll Reveal Animation
    const observerOptions = {
        root: null, // use the viewport
        rootMargin: '0px',
        threshold: 0.1 // trigger when 10% of the element is visible
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once visible
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Target elements to animate
    const elementsToAnimate = document.querySelectorAll('.feature-card, .hero-content, .hero-visual'); // Includes the newly added feature cards
    elementsToAnimate.forEach(el => {
        el.classList.add('hidden'); // Initially hide elements
        observer.observe(el);
    });

    // Smooth scrolling for nav links
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add subtle parallax effect to hero background (optional)
    window.addEventListener('scroll', () => {
        const heroSection = document.getElementById('hero');
        if (heroSection) {
            const scrollY = window.scrollY;
            // Adjust background position slightly based on scroll
            // This is a very basic parallax, more complex effects might need libraries
            heroSection.style.backgroundPositionY = `${-scrollY * 0.1}px`;
        }
    });

});
