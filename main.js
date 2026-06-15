/* =============================================
   OPEN SAVANNA - Interactive JavaScript
   Three.js Savanna Particles + UI Interactions
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
// INITIALIZE EVERYTHING
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Three.js particles
  const particles = new SavannaParticles();

  // Initialize UI interactions
  const ui = new OpenSavannaUI();

  // Initialize interactive effects
  const effects = new InteractiveEffects();

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
