/**
 * AI-Биржа: Мобильное бургер-меню
 * Автоматически создаёт бургер-кнопку и боковое меню на мобильных устройствах
 */
(function() {
  'use strict';

  const MOBILE_MENU_VERSION = '20251223b4';
  const MOBILE_MENU_CSS_URL = `/css/mobile-menu.css?v=${MOBILE_MENU_VERSION}`;
  window.AI_MOBILE_MENU_VERSION = MOBILE_MENU_VERSION;

  // Универсальная модалка авторизации (iframe с /auth.html) для страниц,
  // где нет встроенной openAuthModal / большой модалки с формой.
  function ensureIframeAuthModal() {
    let modal = document.getElementById('ai-auth-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ai-auth-modal';
    modal.className = 'ai-auth-modal';
    modal.innerHTML = `
      <div class="ai-auth-modal-overlay" data-ai-auth-close="1"></div>
      <div class="ai-auth-modal-card" role="dialog" aria-modal="true" aria-label="Вход / регистрация">
        <button class="ai-auth-modal-close" type="button" aria-label="Закрыть" data-ai-auth-close="1">×</button>
        <iframe class="ai-auth-iframe" title="Вход / регистрация" src="/auth.html"></iframe>
      </div>
    `;

    document.body.appendChild(modal);

    function close() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    modal.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-ai-auth-close') === '1') {
        close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) close();
    });

    // API
    modal.open = function open() {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    modal.close = close;

    return modal;
  }

  function openAuthModalAny() {
    // 1) Если на странице есть штатная функция (главная) — используем
    try {
      if (typeof window.openAuthModal === 'function') {
        window.openAuthModal();
        return;
      }
    } catch (_) {}

    // 2) Если на странице есть “большая” модалка (как на главной) — открываем напрямую
    const bigModal = document.getElementById('authModal');
    const looksLikeBigAuth =
      !!bigModal &&
      !!bigModal.querySelector('.auth-modal-overlay') &&
      !!bigModal.querySelector('#authForm');

    if (looksLikeBigAuth) {
      bigModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      return;
    }

    // 3) Иначе — универсальная модалка с auth.html внутри
    const m = ensureIframeAuthModal();
    m.open();
  }

  // Ждём загрузки DOM + ретраи (Tilda может дорисовывать шапку после DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    let mo = null;
    let last = 0;

    const attempt = () => {
      // троттлинг, чтобы observer не спамил
      const now = Date.now();
      if (now - last < 150) return;
      last = now;
      try { initOnce(); } catch (_) {}
    };

    // сразу пробуем
    attempt();
    // затем несколько ретраев
    setTimeout(attempt, 200);
    setTimeout(attempt, 700);
    setTimeout(attempt, 1500);
    setTimeout(attempt, 3000);

    // и наблюдатель DOM на 20 секунд — ловим позднюю отрисовку/перерисовку шапки Тильдой
    try {
      mo = new MutationObserver(attempt);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 20000);
    } catch (_) {}
  }

  function initOnce() {
    const nav = document.querySelector('.nav, header.nav, .nav-inner');
    if (!nav) return false;

    // На некоторых "склеенных" Tilda-страницах <link> в head может не подхватиться.
    // Поэтому гарантируем подключение CSS программно (JS у нас точно загружается).
    (function ensureMobileMenuCss() {
      try {
        const already =
          document.querySelector('link[data-ai-mobile-menu-css="1"]') ||
          document.querySelector('link[href*="mobile-menu.css"]');
        if (already) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = MOBILE_MENU_CSS_URL;
        link.setAttribute('data-ai-mobile-menu-css', '1');
        (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(link);
      } catch (_) {}
    })();

    // Фоллбек: если внешняя CSS по какой-то причине не применяется (часто на "склеенных" Tilda HTML),
    // всё равно рисуем бургер/сайдбар и делаем компактную шапку.
    (function ensureMobileMenuCoreCss() {
      try {
        if (document.getElementById('ai-mobile-menu-core-css')) return;
        const style = document.createElement('style');
        style.id = 'ai-mobile-menu-core-css';
        style.textContent = `
          .ai-burger{display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;padding:10px;background:transparent;border:none;cursor:pointer;z-index:1001;border-radius:12px}
          .ai-burger span{display:block;width:22px;height:2px;background:#13233F;border-radius:2px}
          .ai-burger.open span:nth-child(1){transform:rotate(45deg) translate(5px,5px)}
          .ai-burger.open span:nth-child(2){opacity:0}
          .ai-burger.open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}

          .ai-menu-overlay{position:fixed;inset:0;background:rgba(19,35,63,.5);backdrop-filter:blur(4px);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:1000}
          .ai-menu-overlay.open{opacity:1;visibility:visible}

          .ai-sidebar{position:fixed;top:0;left:0;width:280px;max-width:85vw;height:100%;background:linear-gradient(180deg,#F8FBFF 0%,#EEF3FA 100%);box-shadow:4px 0 24px rgba(19,35,63,.15);transform:translateX(-100%);transition:transform .28s cubic-bezier(.4,0,.2,1);z-index:1002;display:flex;flex-direction:column;overflow-y:auto}
          .ai-sidebar.open{transform:translateX(0)}

          .ai-sidebar-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(163,177,198,.25);background:rgba(255,255,255,.5)}
          .ai-sidebar-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#13233F;font-weight:800;font-size:16px}
          .ai-sidebar-logo{width:36px;height:36px;border-radius:50%;background:url("/images/ai-logo.png") center/cover no-repeat,linear-gradient(135deg,#1E78FF 0%,#00B7FF 100%)}
          .ai-sidebar-close{display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:rgba(163,177,198,.15);border:none;border-radius:50%;font-size:18px;color:#5B6C86;cursor:pointer}

          .ai-sidebar-nav{display:flex;flex-direction:column;padding:16px 12px;gap:4px}
          .ai-sidebar-link{display:block;padding:14px 16px;color:#13233F;text-decoration:none;font-weight:600;font-size:15px;border-radius:12px}
          .ai-sidebar-btn{display:block;padding:14px 16px;margin-top:8px;text-align:center;text-decoration:none;font-weight:700;font-size:14px;border-radius:14px;background:#EEF3FA;color:#13233F;border:1px solid rgba(255,255,255,.65)}
          .ai-sidebar-btn.primary{background:linear-gradient(135deg,#1E78FF 0%,#00B7FF 100%);color:#fff;border-color:rgba(30,120,255,.18)}

          .brand .logo,.nav .brand .logo,header .brand .logo{border-radius:50%;background:url("/images/ai-logo.png") center/cover no-repeat,linear-gradient(135deg,#1E78FF 0%,#00B7FF 100%)}

          @media (max-width: 900px){
            .ai-burger{display:flex !important}
            .nav-inner,.nav .nav-inner,header .nav-inner,.container.nav-inner{display:flex !important;align-items:center !important;gap:10px !important;justify-content:space-between !important;padding:8px 12px !important;min-height:auto !important;height:auto !important;max-height:56px !important}
            .brand,.nav .brand,a.brand{display:flex !important;align-items:center !important;gap:8px !important}
            .brand{min-width:0 !important;max-width:calc(100% - 54px) !important;overflow:hidden !important}
            .ai-burger{flex:0 0 auto !important}
            .brand span:not(.logo),.nav .brand span:not(.logo),a.brand span:not(.logo){display:block !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;color:#13233F !important;overflow:hidden !important;text-overflow:ellipsis !important}
            .brand .logo,.nav .brand .logo,a.brand .logo{width:32px !important;height:32px !important;flex-shrink:0 !important}
          }
        `;
        (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(style);
      } catch (_) {}
    })();

    function ensureHeaderBrand(navInnerEl) {
      try {
        if (!navInnerEl || !navInnerEl.querySelector) return;
        const existing = navInnerEl.querySelector('a.brand');
        if (existing) {
          // Если бренд есть, но структура сломана — восстановим (лого + текст)
          const hasLogo = !!existing.querySelector('.logo');
          const hasTextSpan = !!existing.querySelector('span:not(.logo)');
          if (!hasLogo || !hasTextSpan) {
            existing.innerHTML = '<span class="logo" aria-hidden="true"></span><span>Маркетплейс ИИ услуг</span>';
          }
          try { existing.setAttribute('href', '/index.html'); } catch (_) {}
          return;
        }

        const hasElementChild = !!navInnerEl.firstElementChild;
        const text = (navInnerEl.textContent || '').trim();

        // Если шапка “сломана” и внутри только текст — очищаем, чтобы не было дубля
        if (!hasElementChild && text) {
          navInnerEl.textContent = '';
        }

        const a = document.createElement('a');
        a.className = 'brand';
        a.setAttribute('href', '/index.html');
        a.innerHTML = '<span class="logo" aria-hidden="true"></span><span>Маркетплейс ИИ услуг</span>';

        if (navInnerEl.firstElementChild) navInnerEl.insertBefore(a, navInnerEl.firstElementChild);
        else navInnerEl.appendChild(a);
      } catch (_) {}
    }

    function forceHeaderBrandVisible() {
      if (window.innerWidth > 900) return;
      try {
        const navInnerEl = document.querySelector('.nav-inner') || nav;
        const brandEl = navInnerEl && navInnerEl.querySelector ? navInnerEl.querySelector('a.brand') : null;
        if (navInnerEl) {
          navInnerEl.style.cssText += 'display:flex !important;align-items:center !important;justify-content:space-between !important;gap:10px !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;';
        }
        if (brandEl) {
          brandEl.style.cssText += 'display:flex !important;align-items:center !important;gap:8px !important;min-width:0 !important;max-width:calc(100% - 54px) !important;overflow:hidden !important;visibility:visible !important;opacity:1 !important;';
          const text = brandEl.querySelector('span:not(.logo)');
          if (text) text.style.cssText += 'display:inline !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;';
          const logo = brandEl.querySelector('.logo');
          if (logo) {
            logo.style.cssText += 'display:block !important;width:32px !important;height:32px !important;flex:0 0 32px !important;border-radius:50% !important;background:url("/images/ai-logo.png") center/cover no-repeat,linear-gradient(135deg,#1E78FF 0%,#00B7FF 100%) !important;';
          }
        }
      } catch (_) {}
    }

    // Добавляем CSS для скрытия на мобильных
    if (!document.getElementById('ai-mobile-hide-css')) {
      const style = document.createElement('style');
      style.id = 'ai-mobile-hide-css';
      style.textContent = `
        @media (max-width: 900px) {
          .nav-links, .nav-cta, 
          .nav .nav-links, .nav .nav-cta,
          header .nav-links, header .nav-cta,
          .nav-inner > nav, .nav-inner > .nav-cta,
          [class*="nav-links"], [class*="nav-cta"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const navInner = document.querySelector('.nav-inner') || nav;
    // Если в nav-inner нет нормального бренда (иногда Тильда оставляет просто текст) — создаём
    ensureHeaderBrand(navInner);
    forceHeaderBrandVisible();

    // Если меню уже есть — не пересоздаём (иначе будет мигать). Просто поддерживаем бренд.
    const existingBurger = document.getElementById('ai-burger-btn');
    const existingSidebar = document.getElementById('ai-mobile-menu');
    const existingOverlay = document.getElementById('ai-menu-overlay');
    if (existingBurger && existingSidebar && existingOverlay) {
      return true;
    }

    // Если старая версия меню уже была создана — удаляем и создаём заново
    if (existingSidebar) existingSidebar.remove();
    if (existingOverlay) existingOverlay.remove();
    if (existingBurger) existingBurger.remove();

    // Единый бренд в шапке на мобильном
    const brandText = document.querySelector('.brand span:not(.logo)');
    const brand = document.querySelector('a.brand');
    if (window.innerWidth <= 900) {
      try {
        if (brand) brand.setAttribute('href', '/index.html');
      } catch (_) {}
      if (brandText) {
        brandText.textContent = 'Маркетплейс ИИ услуг';
        brandText.style.cssText = 'display:inline !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;color:#13233F !important;overflow:hidden !important;text-overflow:ellipsis !important;max-width:100% !important;';
        const b = brandText.closest('.brand');
        if (b) b.style.cssText += 'flex:1 1 auto !important;min-width:0 !important;max-width:calc(100% - 54px) !important;overflow:hidden !important;';
      }
    }

    // Собираем все ссылки из nav-links и nav-cta
    const navLinks = document.querySelector('.nav-links');
    const navCta = document.querySelector('.nav-cta');
    
    const links = [];
    
    if (navLinks) {
      navLinks.querySelectorAll('a').forEach(a => {
        const text = (a.textContent || '').trim();
        let href = a.getAttribute('href');
        const tNorm = text.replace(/\s+/g, '');
        // Единые правильные пути (на случай если в хедере стоит старая/битая ссылка)
        if (tNorm === 'Исполнители') href = '/page103811056.html';
        if (tNorm === 'Какэтоработает') href = '/page103811576.html';
        if (tNorm === 'FAQ') href = '/page103811816.html';
        if (tNorm === 'Галереяработ') href = '/gallery.html';
        links.push({ href, text, isBtn: false, isAuth: text.replace(/\s+/g, '') === 'Вход/регистрация' });
      });
    }
    
    if (navCta) {
      navCta.querySelectorAll('a').forEach(a => {
        // Пропускаем кнопку кабинета (она управляется авторизацией)
        if (a.id === 'cabinetBtn') return;
        // Пропускаем скрытые элементы (inline style)
        if (a.style.display === 'none') return;
        
        const isPrimary = a.classList.contains('primary');
        const text = (a.textContent || '').trim();
        const href = a.getAttribute('href');
        // Для authBtn/# делаем нормальную ссылку на страницу авторизации (на случай если JS отключён)
        const finalHref = (a.id === 'authBtn' || href === '#' || !href) ? '/auth.html' : href;
        
        links.push({ 
          href: finalHref, 
          text,
          isBtn: true,
          isPrimary: isPrimary,
          isAuth: (a.id === 'authBtn') || (text.replace(/\s+/g, '') === 'Вход/регистрация')
        });
      });
    }
    
    // Гарантируем наличие кнопки входа
    if (!links.find(l => l.isAuth || l.text === 'Вход/регистрация' || l.href === '/auth.html' || l.href === '/auth')) {
      links.push({
        href: '/auth.html',
        text: 'Вход/регистрация',
        isBtn: true,
        isPrimary: true,
        isAuth: true
      });
    }

    // Создаём бургер-кнопку
    const burger = document.createElement('button');
    burger.id = 'ai-burger-btn';
    burger.className = 'ai-burger';
    burger.setAttribute('aria-label', 'Открыть меню');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';
    
    // Фоллбек без CSS: чтобы бургер и лого были видимы даже если стили не подхватились
    if (window.innerWidth <= 900) {
      try {
        // шапка в одну строку, с местом под бургер
        navInner.style.cssText += 'display:flex !important;align-items:center !important;gap:10px !important;justify-content:space-between !important;';
      } catch (_) {}

      try {
        burger.style.cssText += 'display:flex !important;flex-direction:column !important;justify-content:center !important;align-items:center !important;gap:5px !important;width:44px !important;height:44px !important;padding:10px !important;background:transparent !important;border:none !important;cursor:pointer !important;border-radius:12px !important;';
        burger.querySelectorAll('span').forEach((s) => {
          s.style.cssText = 'display:block !important;width:22px !important;height:2px !important;background:#13233F !important;border-radius:2px !important;';
        });
      } catch (_) {}

      try {
        const logo = document.querySelector('.brand .logo');
        if (logo) {
          logo.style.cssText += 'display:block !important;width:32px !important;height:32px !important;border-radius:50% !important;background:url("/images/ai-logo.png") center/cover no-repeat,linear-gradient(135deg,#1E78FF 0%,#00B7FF 100%) !important;flex-shrink:0 !important;';
        }
      } catch (_) {}
    }

    // Создаём overlay
    const overlay = document.createElement('div');
    overlay.id = 'ai-menu-overlay';
    overlay.className = 'ai-menu-overlay';

    // Создаём боковое меню
    const sidebar = document.createElement('div');
    sidebar.id = 'ai-mobile-menu';
    sidebar.className = 'ai-sidebar';
    sidebar.innerHTML = `
      <div class="ai-sidebar-header">
        <a class="ai-sidebar-brand" href="/index.html">
          <span class="ai-sidebar-logo"></span>
          <span>Маркетплейс ИИ услуг</span>
        </a>
        <button class="ai-sidebar-close" aria-label="Закрыть меню">✕</button>
      </div>
      <nav class="ai-sidebar-nav">
        ${links.map(l => `
          <a href="${l.isAuth ? '#auth' : (l.href || '#')}" ${l.isAuth ? 'data-ai-auth="1"' : ''} class="${l.isBtn ? (l.isPrimary ? 'ai-sidebar-btn primary' : 'ai-sidebar-btn') : 'ai-sidebar-link'}">
            ${l.text}
          </a>
        `).join('')}
      </nav>
    `;

    // Вставляем элементы
    navInner.appendChild(burger);
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    // Обработчики
    function openMenu() {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      burger.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.addEventListener('click', closeMenu);
    sidebar.querySelector('.ai-sidebar-close').addEventListener('click', closeMenu);

    // Клик по пунктам меню (делегирование — надёжнее на всех страницах)
    sidebar.addEventListener('click', (e) => {
      // e.target может быть Text node — делаем безопасно
      const t = (e.target && e.target.nodeType === 1) ? e.target : (e.target && e.target.parentElement);
      const a = (t && t.closest) ? t.closest('a') : null;
      if (!a) return;

      const isAuthLink = a.getAttribute('data-ai-auth') === '1';
      if (isAuthLink) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        openAuthModalAny();
        return;
      }

      // Остальные ссылки — закрываем меню и даём браузеру перейти по href
      setTimeout(closeMenu, 100);
    });

    // Закрываем при Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeMenu();
      }
    });

    // Закрываем при ресайзе на десктоп
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && sidebar.classList.contains('open')) {
        closeMenu();
      }
    });
    return true;
  }
})();

