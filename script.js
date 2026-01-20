// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function () {
  // Initialize animations
  initializeAnimations();

  // Setup mobile navigation
  setupMobileNavigation();

  // Setup counter animations (removed from about section but keeping for potential future use)
  setupCounters();

  // Randomize Twitch links
  randomizeTwitchLinks();

  // Randomize streamer profiles
  randomizeStreamerProfiles();

  // Setup contact form
  setupContactForm();

  // Setup theme switcher (if needed)
  setupThemeSwitcher();
});

// Mobile navigation functionality
function setupMobileNavigation() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileNavLinks = document.getElementById('mobileNavLinks');

  if (mobileMenuToggle && mobileNavLinks) {
    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', function () {
      mobileNavLinks.classList.toggle('active');

      // Change hamburger icon
      const icon = this.querySelector('i');
      if (mobileNavLinks.classList.contains('active')) {
        icon.classList.replace('fa-bars', 'fa-times');
      } else {
        icon.classList.replace('fa-times', 'fa-bars');
      }
    });

    // Handle nav link clicks
    const navLinks = mobileNavLinks.querySelectorAll('a');
    navLinks.forEach((link) => {
      link.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
          const mobileNavHeight =
            document.getElementById('mobile-navbar').offsetHeight;
          const targetPosition = targetSection.offsetTop - mobileNavHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });

          // Close mobile menu
          mobileNavLinks.classList.remove('active');
          const icon = mobileMenuToggle.querySelector('i');
          icon.classList.replace('fa-times', 'fa-bars');

          // Update active link
          navLinks.forEach((navLink) => navLink.classList.remove('active'));
          this.classList.add('active');
        }
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#mobile-navbar')) {
        mobileNavLinks.classList.remove('active');
        const icon = mobileMenuToggle.querySelector('i');
        icon.classList.replace('fa-times', 'fa-bars');
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        mobileNavLinks.classList.remove('active');
        const icon = mobileMenuToggle.querySelector('i');
        icon.classList.replace('fa-times', 'fa-bars');
      }
    });
  }
}

// Animation on scroll
function initializeAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');

        // Trigger counter animation if it's a stats section
        if (entry.target.querySelector('.stat-number')) {
          animateCounters();
        }
      }
    });
  }, observerOptions);

  // Observe all elements with animation classes
  const animatedElements = document.querySelectorAll(
    '.hero-content-compact, .link-item, .streamer-profile',
  );
  animatedElements.forEach((element) => {
    observer.observe(element);
  });
}

// Contact form functionality
function setupContactForm() {
  const contactForm = document.querySelector('.contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Show "coming soon" message
      alert(
        'Coming Soon! 🚀\n\nThe contact form feature is currently under development. Please check back later or reach out to us directly through our social media channels.',
      );
    });
  }
}

// Randomize Twitch links order
function randomizeTwitchLinks() {
  const twitchContainer = document.getElementById('twitch-links');
  const twitchLinks = Array.from(
    twitchContainer.querySelectorAll('.twitch-streamer'),
  );

  // Fisher-Yates shuffle algorithm
  for (let i = twitchLinks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [twitchLinks[i], twitchLinks[j]] = [twitchLinks[j], twitchLinks[i]];
  }

  // Clear container and append shuffled links
  twitchContainer.innerHTML = '';
  twitchLinks.forEach((link) => {
    twitchContainer.appendChild(link);
  });

  // Add staggered animation delay
  twitchLinks.forEach((link, index) => {
    link.style.animationDelay = `${index * 0.1}s`;
  });
}

// Randomize streamer profiles order
function randomizeStreamerProfiles() {
  const profilesContainer = document.querySelector('.streamers-about-grid');
  const profiles = Array.from(
    profilesContainer.querySelectorAll('.streamer-profile'),
  );

  // Fisher-Yates shuffle algorithm
  for (let i = profiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [profiles[i], profiles[j]] = [profiles[j], profiles[i]];
  }

  // Clear container and append shuffled profiles
  profilesContainer.innerHTML = '';
  profiles.forEach((profile) => {
    profilesContainer.appendChild(profile);
  });

  // Add staggered animation delay
  profiles.forEach((profile, index) => {
    profile.style.animationDelay = `${index * 0.2}s`;
  });
}

// Counter animation
function setupCounters() {
  // This will be triggered by the intersection observer
}

function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');

  counters.forEach((counter) => {
    if (counter.classList.contains('counted')) return; // Already animated

    const target = parseInt(counter.getAttribute('data-count'));
    const duration = 2000; // 2 seconds
    const start = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeOutExpo * target);

      counter.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target.toLocaleString();
        counter.classList.add('counted');
      }
    }

    requestAnimationFrame(updateCounter);
  });
}

// Theme switcher functionality (for easy color scheme changes)
function setupThemeSwitcher() {
  // You can uncomment this to add a theme switcher button
  /*
    const themeSwitcher = document.createElement('button');
    themeSwitcher.innerHTML = '<i class="fas fa-palette"></i>';
    themeSwitcher.className = 'theme-switcher';
    themeSwitcher.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        background: var(--primary-color);
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        z-index: 1000;
        box-shadow: var(--shadow-card);
        transition: var(--transition);
    `;
    
    themeSwitcher.addEventListener('click', switchTheme);
    document.body.appendChild(themeSwitcher);
    */
}

// Theme switching function
function switchTheme() {
  const root = document.documentElement;
  const currentTheme = localStorage.getItem('theme') || 'default';

  if (currentTheme === 'default') {
    // Switch to neon theme
    root.style.setProperty('--primary-color', '#00ff88');
    root.style.setProperty('--primary-dark', '#00cc6a');
    root.style.setProperty('--primary-light', '#4dffaa');
    root.style.setProperty('--secondary-color', '#ff0080');
    root.style.setProperty('--secondary-dark', '#cc0066');
    root.style.setProperty('--secondary-light', '#ff4da6');
    localStorage.setItem('theme', 'neon');
  } else if (currentTheme === 'neon') {
    // Switch to synthwave theme
    root.style.setProperty('--primary-color', '#ff006e');
    root.style.setProperty('--primary-dark', '#cc0058');
    root.style.setProperty('--primary-light', '#ff4d94');
    root.style.setProperty('--secondary-color', '#ffbe0b');
    root.style.setProperty('--secondary-dark', '#cc9809');
    root.style.setProperty('--secondary-light', '#ffcb3d');
    localStorage.setItem('theme', 'synthwave');
  } else {
    // Switch back to default
    root.style.setProperty('--primary-color', '#9146ff');
    root.style.setProperty('--primary-dark', '#772ce8');
    root.style.setProperty('--primary-light', '#a970ff');
    root.style.setProperty('--secondary-color', '#00f5ff');
    root.style.setProperty('--secondary-dark', '#00d4ea');
    root.style.setProperty('--secondary-light', '#4dffff');
    localStorage.setItem('theme', 'default');
  }
}

// Load saved theme on page load
function loadSavedTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && savedTheme !== 'default') {
    switchTheme();
  }
}

// Social link tracking (optional - for analytics)
function trackSocialClick(platform, streamer = 'general') {
  // You can implement analytics tracking here
  console.log(`Social click: ${platform} for ${streamer}`);
}

// Add click tracking to social links
document.addEventListener('DOMContentLoaded', function () {
  const linkItems = document.querySelectorAll('.link-item');

  linkItems.forEach((link) => {
    link.addEventListener('click', function () {
      const linkText = this.querySelector('h3').textContent;
      const href = this.getAttribute('href');

      // Track link clicks
      console.log(`Link clicked: ${linkText} - ${href}`);

      // Add click animation
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
  });
});

// Keyboard navigation support
document.addEventListener('keydown', function (e) {
  // ESC key closes mobile menu
  if (e.key === 'Escape') {
    closeMobileMenu();
  }
});

// Performance optimization: Throttle scroll events
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Add loading animation
window.addEventListener('load', function () {
  document.body.classList.add('loaded');

  // Trigger initial animations
  const heroContent = document.querySelector('.hero-content-compact');
  if (heroContent) {
    heroContent.classList.add('fade-in-up');
  }
});
