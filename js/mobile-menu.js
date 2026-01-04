/**
 * AI-Биржа: Мобильное бургер-меню
 * Автоматически создаёт бургер-кнопку и боковое меню на мобильных устройствах
 */
(function() {
  'use strict';

  const MOBILE_MENU_VERSION = '20260104a1';
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

  // ====== Авторизация: синхронизация пункта меню (Вход/регистрация ↔ Личный кабинет) ======
  function getSbClient() {
    try {
      return window.AI_BIRZHA && window.AI_BIRZHA.sb ? window.AI_BIRZHA.sb : null;
    } catch (_) {
      return null;
    }
  }

  function normalizePath(p) {
    try {
      return (p || '').split('#')[0].split('?')[0].replace(/\/+$/, '');
    } catch (_) {
      return (p || '').replace(/\/+$/, '');
    }
  }

  function updateBurgerAuthLink(session) {
    const sidebar = document.getElementById('ai-mobile-menu');
    if (!sidebar) return;

    const isAuthed = !!(session && session.user);
    const all = Array.from(sidebar.querySelectorAll('a'));
    const candidates = all.filter((a) => {
      const t = ((a.textContent || '').trim().toLowerCase());
      const hasAttr = a.getAttribute('data-ai-auth') === '1' || a.getAttribute('data-ai-cabinet') === '1';
      const looks = t.includes('вход') || t.includes('регистрац') || t.includes('кабинет');
      return hasAttr || looks;
    });
    if (!candidates.length) return;

    const main = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      try { candidates[i].style.display = 'none'; } catch (_) {}
    }

    if (isAuthed) {
      main.textContent = 'Личный кабинет';
      main.setAttribute('href', '/add');
      main.className = 'ai-sidebar-btn primary';
      main.removeAttribute('data-ai-auth');
      main.setAttribute('data-ai-cabinet', '1');
    } else {
      main.textContent = 'Вход/регистрация';
      main.setAttribute('href', '#auth');
      main.className = 'ai-sidebar-btn primary';
      main.setAttribute('data-ai-auth', '1');
      main.removeAttribute('data-ai-cabinet');
    }
  }

  function ensureAuthWatcherStarted() {
    if (window.__AI_MOBILE_MENU_AUTH_WATCH_STARTED) return;
    window.__AI_MOBILE_MENU_AUTH_WATCH_STARTED = true;

    function attach(sb) {
      if (!sb || !sb.auth) return;

      // начальная синхронизация
      try {
        sb.auth.getSession().then((res) => {
          updateBurgerAuthLink(res && res.data ? res.data.session : null);
        }).catch(() => {});
      } catch (_) {}

      // подписка на изменения
      try {
        if (window.__AI_MOBILE_MENU_AUTH_SUB && window.__AI_MOBILE_MENU_AUTH_SUB.unsubscribe) {
          try { window.__AI_MOBILE_MENU_AUTH_SUB.unsubscribe(); } catch (_) {}
        }
      } catch (_) {}

      try {
        const out = sb.auth.onAuthStateChange((event, session) => {
          updateBurgerAuthLink(session);
        });
        const sub = out && out.data ? out.data.subscription : null;
        if (sub && sub.unsubscribe) window.__AI_MOBILE_MENU_AUTH_SUB = sub;
      } catch (_) {}

      // фоллбек: иногда логин происходит внутри iframe/модалки — проверим ещё раз
      setTimeout(() => {
        try {
          sb.auth.getSession().then((res) => updateBurgerAuthLink(res && res.data ? res.data.session : null)).catch(() => {});
        } catch (_) {}
      }, 1200);
      setTimeout(() => {
        try {
          sb.auth.getSession().then((res) => updateBurgerAuthLink(res && res.data ? res.data.session : null)).catch(() => {});
        } catch (_) {}
      }, 3500);
    }

    // ждём supabase клиент (он может появиться позже)
    const startedAt = Date.now();
    (function waitLoop() {
      const sb = getSbClient();
      if (sb) return attach(sb);
      if (Date.now() - startedAt > 12000) return;
      setTimeout(waitLoop, 250);
    })();
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
    // иногда Тильда/скрипты “доперерисовывают” шапку позже
    setTimeout(attempt, 8000);
    setTimeout(attempt, 20000);
    setTimeout(attempt, 60000);

    // и наблюдатель DOM — ловим позднюю отрисовку/перерисовку шапки Тильдой
    try {
      mo = new MutationObserver(attempt);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      // дольше, потому что на некоторых страницах блоки догружаются с задержкой
      setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 120000);
    } catch (_) {}
  }

  function initOnce() {
    const header =
      document.querySelector('header.nav') ||
      document.querySelector('.nav') ||
      document.querySelector('header');
    if (!header) return false;

    // берём именно “внутренний контейнер” шапки, если он есть,
    // иначе используем сам header (чтобы бургер не “улетал” к краю экрана)
    const navInnerPreferred =
      (header.querySelector && header.querySelector('.nav-inner')) ||
      document.querySelector('.nav-inner') ||
      header;

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
            .brand{flex:0 0 auto !important}
            .ai-burger{flex:0 0 auto !important}
            .brand span:not(.logo),.nav .brand span:not(.logo),a.brand span:not(.logo){display:block !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;color:#13233F !important}
            .brand .logo,.nav .brand .logo,a.brand .logo{width:32px !important;height:32px !important;flex-shrink:0 !important}
          }
        `;
        (document.head || document.getElementsByTagName('head')[0] || document.documentElement).appendChild(style);
      } catch (_) {}
    })();

    function ensureHeaderBrand(navInnerEl) {
      try {
        if (!navInnerEl || !navInnerEl.querySelector) return;

        // Чистим “висящий” текст внутри контейнера шапки (частая причина: остаётся один текст бренда без тегов)
        // ВАЖНО: чистим только прямые текстовые узлы, чтобы не ломать вложенные элементы
        try {
          const nodes = navInnerEl.childNodes;
          for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            if (n && n.nodeType === 3 && (n.textContent || '').trim()) {
              n.parentNode && n.parentNode.removeChild(n);
            }
          }
        } catch (_) {}

        const existing = navInnerEl.querySelector('a.brand');
        if (existing) {
          // Если бренд есть, но структура сломана — восстановим (лого + текст)
          const hasLogo = !!existing.querySelector('.logo');
          const hasTextSpan = !!existing.querySelector('span:not(.logo)');
          if (!hasLogo || !hasTextSpan) {
            existing.innerHTML = '<span class="logo" aria-hidden="true"></span><span>Маркетплейс ИИ услуг</span>';
          }
          try { existing.setAttribute('href', '/index.html'); } catch (_) {}

          // Бренд должен быть первым элементом внутри nav-inner (чтобы не исчезать при сжатии)
          try {
            const firstEl = navInnerEl.firstElementChild;
            if (firstEl && firstEl !== existing) navInnerEl.insertBefore(existing, firstEl);
          } catch (_) {}
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
        const navInnerEl = navInnerPreferred;
        const brandEl = navInnerEl && navInnerEl.querySelector ? navInnerEl.querySelector('a.brand') : null;
        if (navInnerEl) {
          navInnerEl.style.cssText += 'display:flex !important;align-items:center !important;justify-content:space-between !important;gap:10px !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;';
        }
        if (brandEl) {
          brandEl.style.cssText += 'display:flex !important;align-items:center !important;gap:8px !important;flex:0 0 auto !important;visibility:visible !important;opacity:1 !important;';
          const text = brandEl.querySelector('span:not(.logo)');
          if (text) text.style.cssText += 'display:block !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;color:#13233F !important;';
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

    const navInner = navInnerPreferred;
    // Если в nav-inner нет нормального бренда (иногда Тильда оставляет просто текст) — создаём
    ensureHeaderBrand(navInner);
    forceHeaderBrandVisible();

    // Если меню уже есть — не пересоздаём (иначе будет мигать). Просто поддерживаем бренд.
    const existingBurger = document.getElementById('ai-burger-btn');
    const existingSidebar = document.getElementById('ai-mobile-menu');
    const existingOverlay = document.getElementById('ai-menu-overlay');
    if (existingBurger && existingSidebar && existingOverlay) {
      // меню уже есть — но пункт авторизации может устареть после логина
      ensureAuthWatcherStarted();
      try {
        const sb = getSbClient();
        if (sb && sb.auth && sb.auth.getSession) {
          sb.auth.getSession().then((res) => updateBurgerAuthLink(res && res.data ? res.data.session : null)).catch(() => {});
        }
      } catch (_) {}
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
        brandText.style.cssText = 'display:block !important;font-size:12px !important;font-weight:700 !important;white-space:nowrap !important;color:#13233F !important;';
        const b = brandText.closest('.brand');
        if (b) b.style.cssText += 'flex:0 0 auto !important;';
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
        if (normalizePath(href) === '/gallery') href = '/gallery.html';
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
        burger.style.cssText += 'display:flex !important;flex-direction:column !important;justify-content:center !important;align-items:center !important;gap:5px !important;width:44px !important;height:44px !important;padding:10px !important;background:transparent !important;border:none !important;cursor:pointer !important;border-radius:12px !important;position:relative !important;flex-shrink:0 !important;margin-left:auto !important;';
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

      // Жёсткий фикс: если ссылка ведёт на /gallery (алиас), открываем гарантированно /gallery.html
      try {
        const href = a.getAttribute('href') || '';
        if (normalizePath(href) === '/gallery') {
          e.preventDefault();
          e.stopPropagation();
          closeMenu();
          window.location.href = '/gallery.html';
          return;
        }
      } catch (_) {}

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

    // Запускаем слежение за авторизацией (чтобы пункт меню обновлялся сразу после логина)
    ensureAuthWatcherStarted();
    
    // Создаём нижнюю навигацию
    createBottomNav();
    
    return true;
  }

  // ====== Нижняя навигация (Bottom Navigation Bar) ======
  
  // SVG иконки для нижней навигации
  const bottomNavIcons = {
    catalog: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
    projects: `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    gallery: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
    card: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="6" y1="14" x2="14" y2="14"/></svg>`,
    cabinet: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  };

  function createBottomNav() {
    // Если уже есть — не создаём повторно
    if (document.getElementById('ai-bottom-nav')) return;
    
    const nav = document.createElement('nav');
    nav.id = 'ai-bottom-nav';
    nav.className = 'ai-bottom-nav';
    nav.setAttribute('aria-label', 'Основная навигация');
    
    nav.innerHTML = `
      <div class="ai-bottom-nav-inner">
        <a href="/page103811056.html" class="ai-bottom-nav-item" data-nav="catalog">
          <span class="ai-bottom-nav-icon">${bottomNavIcons.catalog}</span>
          <span class="ai-bottom-nav-label">Каталог</span>
        </a>
        <a href="/projects.html" class="ai-bottom-nav-item" data-nav="projects">
          <span class="ai-bottom-nav-icon">${bottomNavIcons.projects}</span>
          <span class="ai-bottom-nav-label">Проекты</span>
        </a>
        <a href="/gallery.html" class="ai-bottom-nav-item" data-nav="gallery">
          <span class="ai-bottom-nav-icon">${bottomNavIcons.gallery}</span>
          <span class="ai-bottom-nav-label">Галерея</span>
        </a>
        <button type="button" class="ai-bottom-nav-item" data-nav="card" data-requires-auth="card">
          <span class="ai-bottom-nav-icon">${bottomNavIcons.card}</span>
          <span class="ai-bottom-nav-label">Моя карточка</span>
        </button>
        <button type="button" class="ai-bottom-nav-item" data-nav="cabinet" data-requires-auth="cabinet">
          <span class="ai-bottom-nav-icon">${bottomNavIcons.cabinet}</span>
          <span class="ai-bottom-nav-label">Кабинет</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(nav);
    
    // Подсвечиваем текущую страницу
    highlightCurrentNavItem();
    
    // Обработчики кликов
    nav.addEventListener('click', handleBottomNavClick);
    
    // Следим за авторизацией для обновления состояния кнопок
    initBottomNavAuthWatcher();
  }

  function highlightCurrentNavItem() {
    const nav = document.getElementById('ai-bottom-nav');
    if (!nav) return;
    
    const path = normalizePath(location.pathname);
    const items = nav.querySelectorAll('.ai-bottom-nav-item');
    
    items.forEach(item => {
      item.classList.remove('active');
      const href = item.getAttribute('href');
      if (href) {
        const itemPath = normalizePath(href);
        // Проверяем совпадение пути
        if (path === itemPath || 
            (path === '' && itemPath === '/index') ||
            (path === '/experts' && itemPath === '/page103811056') ||
            (path.includes('page103811056') && itemPath.includes('page103811056')) ||
            (path.includes('gallery') && itemPath.includes('gallery')) ||
            (path.includes('projects') && itemPath.includes('projects'))) {
          item.classList.add('active');
        }
      }
      // Для кнопок кабинета и карточки
      const navType = item.getAttribute('data-nav');
      if (navType === 'cabinet' && path.includes('/add')) {
        item.classList.add('active');
      }
      if (navType === 'card' && path.includes('/card')) {
        item.classList.add('active');
      }
    });
  }

  async function handleBottomNavClick(e) {
    const item = e.target.closest('.ai-bottom-nav-item');
    if (!item) return;
    
    const requiresAuth = item.getAttribute('data-requires-auth');
    
    // Если это обычная ссылка (не требует авторизации) — пусть браузер обработает
    if (!requiresAuth) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Проверяем авторизацию
    const sb = getSbClient();
    let isAuthed = false;
    let userId = null;
    
    if (sb && sb.auth) {
      try {
        const { data } = await sb.auth.getSession();
        isAuthed = !!(data && data.session && data.session.user);
        userId = data?.session?.user?.id;
      } catch (_) {}
    }
    
    if (!isAuthed) {
      // Не авторизован — открываем модалку авторизации
      openAuthModalAny();
      return;
    }
    
    // Авторизован — обрабатываем действие
    if (requiresAuth === 'cabinet') {
      // Переход в личный кабинет
      window.location.href = '/add.html';
    } else if (requiresAuth === 'card') {
      // Моя карточка — нужно найти ID карточки пользователя
      await goToMyCard(sb, userId);
    }
  }

  async function goToMyCard(sb, userId) {
    if (!sb || !userId) {
      openAuthModalAny();
      return;
    }
    
    try {
      // Ищем карточку пользователя
      const { data, error } = await sb
        .from('experts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      if (error || !data || data.length === 0) {
        // Карточки нет — отправляем создавать
        alert('У вас ещё нет карточки. Создайте её в личном кабинете.');
        window.location.href = '/add.html';
        return;
      }
      
      // Карточка есть — открываем её
      const expertId = data[0].id;
      window.location.href = '/page104196026.html?id=' + expertId;
    } catch (err) {
      console.error('Ошибка при получении карточки:', err);
      window.location.href = '/add.html';
    }
  }

  // Следим за авторизацией для обновления иконок в нижней навигации
  function initBottomNavAuthWatcher() {
    const sb = getSbClient();
    if (!sb || !sb.auth) {
      // Пробуем позже, когда supabase загрузится
      setTimeout(initBottomNavAuthWatcher, 500);
      return;
    }
    
    // Начальная синхронизация
    try {
      sb.auth.getSession().then((res) => {
        updateBottomNavAuth(res && res.data ? res.data.session : null);
      }).catch(() => {});
    } catch (_) {}
    
    // Подписка на изменения авторизации
    try {
      sb.auth.onAuthStateChange((event, session) => {
        updateBottomNavAuth(session);
      });
    } catch (_) {}
  }

  function updateBottomNavAuth(session) {
    const nav = document.getElementById('ai-bottom-nav');
    if (!nav) return;
    
    const isAuthed = !!(session && session.user);
    const cardBtn = nav.querySelector('[data-nav="card"]');
    const cabinetBtn = nav.querySelector('[data-nav="cabinet"]');
    
    // Можно визуально показать состояние авторизации (например, другой цвет иконки)
    // Пока просто обновляем подсветку
    highlightCurrentNavItem();
  }
})();

