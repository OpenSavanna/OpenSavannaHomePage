/* =============================================
   OPEN SAVANNA - Interactive JavaScript
   UI Interactions + Analytics
   (Note: the SavannaParticles class below is currently inert — no #savanna-canvas
    element or Three.js library is loaded — and can be deleted in a cleanup pass.)
   ============================================= */

// =============================================
// THREE.JS SAVANNA PARTICLE SYSTEM
// =============================================

class SavannaParticles {
  constructor() {
    this.canvas = document.getElementById('savanna-canvas');
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });

    this.particles = null;
    this.particleCount = this.isMobile() ? 800 : 2000;
    this.mouseX = 0;
    this.mouseY = 0;
    this.scrollY = 0;
    this.time = 0;

    this.colors = {
      primary: new THREE.Color(0xC9A227),    // Savanna gold
      secondary: new THREE.Color(0xD4954A),   // Amber
      tertiary: new THREE.Color(0x8B7355),    // Acacia brown
      ambient: new THREE.Color(0xE8B84A)      // Honey
    };

    this.init();
  }

  isMobile() {
    return window.innerWidth < 768;
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Position camera
    this.camera.position.z = 50;

    // Create particles
    this.createParticles();

    // Create gradient background mesh
    this.createBackground();

    // Event listeners
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('scroll', () => this.onScroll());

    // Start animation
    this.animate();
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const speeds = new Float32Array(this.particleCount);

    const colorOptions = [this.colors.primary, this.colors.secondary, this.colors.tertiary, this.colors.ambient];

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Position - spread across screen with depth
      positions[i3] = (Math.random() - 0.5) * 150;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 80;

      // Color - pick from savanna palette
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Size - varying for depth effect
      sizes[i] = Math.random() * 2 + 0.5;

      // Speed - for animation variation
      speeds[i] = Math.random() * 0.5 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for better looking particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: this.renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        uniform float pixelRatio;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Subtle floating animation
          pos.y += sin(time * 0.5 + position.x * 0.1) * 2.0;
          pos.x += cos(time * 0.3 + position.y * 0.1) * 1.5;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * pixelRatio * (80.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // Circular particle with soft edges
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          alpha *= 0.6; // Overall transparency

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  createBackground() {
    // Gradient background plane (far back)
    const bgGeometry = new THREE.PlaneGeometry(200, 150);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x2D2A26) },
        color2: { value: new THREE.Color(0x4A3728) },
        color3: { value: new THREE.Color(0xC9A227) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;

        void main() {
          // Animated gradient
          float gradient = vUv.y + sin(vUv.x * 3.0 + time * 0.2) * 0.05;
          vec3 color = mix(color2, color1, gradient);

          // Add subtle warm glow at bottom
          float glow = smoothstep(0.3, 0.0, vUv.y) * 0.15;
          color = mix(color, color3, glow);

          gl_FragColor = vec4(color, 0.3);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    bg.position.z = -50;
    this.scene.add(bg);
    this.bgMaterial = bgMaterial;
  }

  onMouseMove(event) {
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onScroll() {
    this.scrollY = window.scrollY;
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.particles) {
      this.particles.material.uniforms.pixelRatio.value = this.renderer.getPixelRatio();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.time += 0.01;

    // Update particle shader time
    if (this.particles) {
      this.particles.material.uniforms.time.value = this.time;

      // Subtle mouse influence on rotation
      this.particles.rotation.y += (this.mouseX * 0.0005 - this.particles.rotation.y * 0.01);
      this.particles.rotation.x += (this.mouseY * 0.0003 - this.particles.rotation.x * 0.01);

      // Scroll-based parallax
      this.particles.position.y = -this.scrollY * 0.02;
    }

    // Update background
    if (this.bgMaterial) {
      this.bgMaterial.uniforms.time.value = this.time;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// =============================================
// UI INTERACTIONS
// =============================================

class OpenSavannaUI {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    this.navLinks = document.getElementById('nav-links');
    this.loader = document.getElementById('loader');

    this.init();
  }

  init() {
    // Loading screen
    this.handleLoading();

    // Navigation
    this.handleNavigation();

    // Mobile menu
    this.handleMobileMenu();

    // Scroll animations
    this.handleScrollAnimations();

    // Smooth scroll for anchor links
    this.handleSmoothScroll();
  }

  handleLoading() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (this.loader) {
          this.loader.classList.add('hidden');
        }
      }, 1500);
    });

    // Fallback - hide loader after 3 seconds regardless
    setTimeout(() => {
      if (this.loader) {
        this.loader.classList.add('hidden');
      }
    }, 3000);
  }

  handleNavigation() {
    let lastScroll = 0;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;

      // Add scrolled class for styling
      if (currentScroll > scrollThreshold) {
        this.navbar.classList.add('scrolled');
      } else {
        this.navbar.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    });
  }

  handleMobileMenu() {
    if (!this.mobileMenuBtn || !this.navLinks) return;

    this.mobileMenuBtn.addEventListener('click', () => {
      this.mobileMenuBtn.classList.toggle('active');
      this.navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    this.navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        this.mobileMenuBtn.classList.remove('active');
        this.navLinks.classList.remove('active');
      });
    });
  }

  handleScrollAnimations() {
    const animatedElements = document.querySelectorAll('[data-aos]');

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add delay if specified
          const delay = entry.target.dataset.aosDelay || 0;
          setTimeout(() => {
            entry.target.classList.add('aos-animate');
          }, delay);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
  }

  handleSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          const navHeight = this.navbar ? this.navbar.offsetHeight : 0;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
}

// =============================================
// ADDITIONAL INTERACTIVE EFFECTS
// =============================================

class InteractiveEffects {
  constructor() {
    this.init();
  }

  init() {
    this.addServiceCardEffects();
    this.addButtonRipple();
    this.addParallaxHero();
    this.addFAQAccordion();
  }

  addFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      if (!question) return;

      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all other items (optional - remove for multi-open)
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherBtn = otherItem.querySelector('.faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current item
        item.classList.toggle('active');
        question.setAttribute('aria-expanded', !isActive);
      });
    });
  }

  addServiceCardEffects() {
    // Simple hover effects now handled by CSS
  }

  addButtonRipple() {
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();

        ripple.style.cssText = `
          position: absolute;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        `;

        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Add ripple animation to stylesheet
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addParallaxHero() {
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');

    if (!hero || !heroContent) return;

    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const heroHeight = hero.offsetHeight;

      if (scrolled < heroHeight) {
        const parallaxValue = scrolled * 0.4;
        const opacityValue = 1 - (scrolled / heroHeight) * 0.8;

        heroContent.style.transform = `translateY(${parallaxValue}px)`;
        heroContent.style.opacity = opacityValue;
      }
    });
  }
}

// =============================================
// TYPED TEXT EFFECT (Optional)
// =============================================

class TypedText {
  constructor(element, texts, options = {}) {
    this.element = element;
    this.texts = texts;
    this.typeSpeed = options.typeSpeed || 100;
    this.deleteSpeed = options.deleteSpeed || 50;
    this.pauseTime = options.pauseTime || 2000;
    this.currentTextIndex = 0;
    this.currentCharIndex = 0;
    this.isDeleting = false;

    this.type();
  }

  type() {
    const currentText = this.texts[this.currentTextIndex];

    if (this.isDeleting) {
      this.element.textContent = currentText.substring(0, this.currentCharIndex - 1);
      this.currentCharIndex--;
    } else {
      this.element.textContent = currentText.substring(0, this.currentCharIndex + 1);
      this.currentCharIndex++;
    }

    let typeSpeed = this.isDeleting ? this.deleteSpeed : this.typeSpeed;

    if (!this.isDeleting && this.currentCharIndex === currentText.length) {
      typeSpeed = this.pauseTime;
      this.isDeleting = true;
    } else if (this.isDeleting && this.currentCharIndex === 0) {
      this.isDeleting = false;
      this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
      typeSpeed = 500;
    }

    setTimeout(() => this.type(), typeSpeed);
  }
}

// =============================================
// GOOGLE ANALYTICS EVENT TRACKING
// =============================================

class AnalyticsTracker {
  constructor() {
    this.init();
  }

  init() {
    this.trackPricingClicks();
    this.trackContactClicks();
    this.trackBookingClicks();
  }

  // Track pricing tier button clicks
  trackPricingClicks() {
    const pricingButtons = document.querySelectorAll('.pricing-cta');
    const tiers = ['Learn', 'Consult', 'Grow', 'Scale'];

    pricingButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const tierName = tiers[index] || 'Unknown';
        if (typeof gtag !== 'undefined') {
          gtag('event', 'pricing_click', {
            'event_category': 'Pricing',
            'event_label': tierName,
            'value': index + 1
          });
        }
        console.log(`Analytics: Pricing click - ${tierName}`);
      });
    });

    // Enterprise section
    const enterpriseBtn = document.querySelector('.enterprise-cta .btn');
    if (enterpriseBtn) {
      enterpriseBtn.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'pricing_click', {
            'event_category': 'Pricing',
            'event_label': 'Enterprise',
            'value': 5
          });
        }
      });
    }
  }

  // Track contact button clicks
  trackContactClicks() {
    // WhatsApp clicks
    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
      link.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'contact_click', {
            'event_category': 'Contact',
            'event_label': 'WhatsApp'
          });
        }
      });
    });

    // Email clicks
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      link.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'contact_click', {
            'event_category': 'Contact',
            'event_label': 'Email'
          });
        }
      });
    });

    // Phone clicks
    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      link.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'contact_click', {
            'event_category': 'Contact',
            'event_label': 'Phone'
          });
        }
      });
    });

    // LinkedIn clicks
    document.querySelectorAll('a[href*="linkedin.com"]').forEach(link => {
      link.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'contact_click', {
            'event_category': 'Contact',
            'event_label': 'LinkedIn'
          });
        }
      });
    });
  }

  // Track booking button clicks
  trackBookingClicks() {
    document.querySelectorAll('a[href*="cal.com"]').forEach(link => {
      link.addEventListener('click', () => {
        if (typeof gtag !== 'undefined') {
          gtag('event', 'book_call_click', {
            'event_category': 'Conversion',
            'event_label': 'Book a Call'
          });
        }
      });
    });
  }
}

// =============================================
// INITIALIZE EVERYTHING
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI interactions
  const ui = new OpenSavannaUI();

  // Initialize interactive effects
  const effects = new InteractiveEffects();

  // Initialize analytics tracking
  const analytics = new AnalyticsTracker();

  // Console branding
  console.log(
    '%c🌳 Open Savanna',
    'font-size: 24px; font-weight: bold; color: #e07c3e;'
  );
  console.log(
    '%cTechnology leadership for ambitious businesses',
    'font-size: 12px; color: #4a5568;'
  );
  console.log(
    '%chttps://www.opensavanna.com',
    'font-size: 12px; color: #1a6b7c;'
  );
});

// =============================================
// PERFORMANCE OPTIMIZATION
// =============================================

// Lazy load images
document.addEventListener('DOMContentLoaded', () => {
  const lazyImages = document.querySelectorAll('img[loading="lazy"]');

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
  }
});

// Reduce animations for users who prefer reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.setProperty('--transition-slow', '0.01s');
  document.documentElement.style.setProperty('--transition-base', '0.01s');
}

// =============================================
// COOKIE CONSENT + GATED GOOGLE ANALYTICS (Kenya DPA 2019)
// Analytics (gtag) is NOT loaded until the visitor clicks "Accept".
// =============================================

const GA_MEASUREMENT_ID = 'G-GE47V1SZLD';

function loadGoogleAnalytics() {
  if (window.__osGaLoaded) return;
  window.__osGaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
}

class CookieConsent {
  constructor() {
    this.storageKey = 'os-cookie-consent';
    this.injectStyles();
    this.init();
  }

  init() {
    let choice = null;
    try { choice = localStorage.getItem(this.storageKey); } catch (e) {}
    if (choice === 'accepted') { loadGoogleAnalytics(); return; }
    if (choice === 'rejected') { return; }
    this.renderBanner();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .cookie-banner {
        position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 9999;
        max-width: 640px; margin: 0 auto;
        background: #2D2A26; color: #F5F2ED;
        border: 1px solid rgba(201,162,39,0.4); border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.35);
        padding: 1rem 1.25rem;
        opacity: 0; transform: translateY(20px);
        transition: opacity .3s ease, transform .3s ease;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .cookie-banner.show { opacity: 1; transform: translateY(0); }
      .cookie-banner-content { display: flex; flex-direction: column; gap: .85rem; }
      .cookie-banner p { margin: 0; font-size: .9rem; line-height: 1.5; }
      .cookie-banner a { color: #C9A227; text-decoration: underline; }
      .cookie-banner-actions { display: flex; gap: .6rem; justify-content: flex-end; }
      .cookie-btn {
        cursor: pointer; border-radius: 8px; padding: .55rem 1.1rem;
        font-size: .85rem; font-weight: 600; border: 1px solid transparent;
        font-family: inherit;
      }
      .cookie-accept { background: #C9A227; color: #2D2A26; }
      .cookie-accept:hover { background: #d8b43a; }
      .cookie-reject { background: transparent; color: #F5F2ED; border-color: rgba(245,242,237,0.35); }
      .cookie-reject:hover { border-color: #F5F2ED; }
      @media (min-width: 520px) {
        .cookie-banner-content { flex-direction: row; align-items: center; }
        .cookie-banner-actions { flex-shrink: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  renderBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = `
      <div class="cookie-banner-content">
        <p>We use cookies and Google Analytics to understand how visitors use our site.
           Analytics loads only if you accept. See our <a href="/privacy">Privacy Policy</a>.</p>
        <div class="cookie-banner-actions">
          <button class="cookie-btn cookie-reject" id="cookie-reject" type="button">Reject</button>
          <button class="cookie-btn cookie-accept" id="cookie-accept" type="button">Accept</button>
        </div>
      </div>`;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));
    banner.querySelector('#cookie-accept').addEventListener('click', () => this.setChoice('accepted'));
    banner.querySelector('#cookie-reject').addEventListener('click', () => this.setChoice('rejected'));
  }

  setChoice(value) {
    try { localStorage.setItem(this.storageKey, value); } catch (e) {}
    if (value === 'accepted') loadGoogleAnalytics();
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 300);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CookieConsent());
} else {
  new CookieConsent();
}
