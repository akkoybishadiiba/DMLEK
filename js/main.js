/* ========================================
   DMLEK Website — Main JavaScript
   Firebase Firestore
   ======================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCFUzAQucspGeL9e580ha0t9ajmibtZYVU",
    authDomain: "dmlek-5e41d.firebaseapp.com",
    projectId: "dmlek-5e41d",
    storageBucket: "dmlek-5e41d.firebasestorage.app",
    messagingSenderId: "776258229369",
    appId: "1:776258229369:web:19b757e38f79156f91f0a8"
};

let db, auth;
try {
    firebase.initializeApp(firebaseConfig);
    db   = firebase.firestore();
    auth = firebase.auth ? firebase.auth() : null;
} catch (e) {
    console.warn('Firebase init:', e.message);
}

// Convert Firestore Timestamp or number to Date
function tsToDate(val) {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'object' && val.toDate) return val.toDate();
    if (typeof val === 'number') return new Date(val);
    return new Date();
}

// ========================================
// GLOBAL STATE
// ========================================
const state = {
    theme: localStorage.getItem('theme') || 'light',
    language: localStorage.getItem('ui_lang') || 'en',
    articles: [],
    isLoading: false
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initBackToTop();
    initReadingProgress();
    updateCopyrightYear();

    const page = document.body.dataset.page;
    if (page) {
        switch (page) {
            case 'home':      initHomePage();      break;
            case 'articles':  initArticlesPage();  break;
            case 'article':   initArticlePage();   break;
            case 'media':     initMediaPage();     break;
            case 'documents': initDocumentsPage(); break;
            case 'document':  initDocumentPage();  break;
            case 'events':    initEventsPage();    break;
            case 'about':     initAboutPage();     break;
            case 'photos':    initPhotosPage();    break;
        }
    }
});

// ========================================
// THEME
// ========================================
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    const btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const sun  = document.querySelector('.sun-icon');
    const moon = document.querySelector('.moon-icon');
    if (sun)  sun.style.display  = state.theme === 'light' ? 'block' : 'none';
    if (moon) moon.style.display = state.theme === 'dark'  ? 'block' : 'none';
}

// ========================================
// NAVIGATION
// ========================================
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    const mobileToggle  = document.getElementById('mobileToggle');
    const mobileMenu    = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileClose   = document.getElementById('mobileClose');

    const closeMobileMenu = () => {
        if (mobileMenu)    mobileMenu.classList.remove('active');
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    };
    const openMobileMenu = () => {
        if (mobileMenu)    mobileMenu.classList.add('active');
        if (mobileOverlay) mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    if (mobileToggle)  mobileToggle.addEventListener('click', openMobileMenu);
    if (mobileClose)   mobileClose.addEventListener('click', closeMobileMenu);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);

    document.querySelectorAll('.mobile-nav-links a').forEach(a => a.addEventListener('click', closeMobileMenu));
    window.addEventListener('popstate', closeMobileMenu);

    // Active link
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a, .mobile-nav-links a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && (path.endsWith(href) || (path === '/' && href === '/index.html'))) {
            a.classList.add('active');
        }
    });

    // Lang dropdown
    document.querySelectorAll('.lang-option').forEach(opt =>
        opt.addEventListener('click', () => setLanguage(opt.dataset.lang))
    );
}

// ========================================
// BACK TO TOP
// ========================================
function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 500));
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ========================================
// READING PROGRESS
// ========================================
function initReadingProgress() {
    const bar = document.getElementById('readingProgress');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (window.scrollY / h) * 100 + '%';
    });
}

// ========================================
// COPYRIGHT YEAR
// ========================================
function updateCopyrightYear() {
    document.querySelectorAll('#copyrightYear').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
}

// ========================================
// LANGUAGE — navigates to filtered articles
// ========================================
const langToFilter = { en: 'english', ti: 'tigrinya', ar: 'arabic', ku: 'kunama' };

function setLanguage(lang) {
    const filter = langToFilter[lang] || lang;
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = (isInPages ? './articles.html' : 'pages/articles.html') + '?lang=' + filter;
}



// ========================================
// DATA FETCHING — Firestore
// ========================================
async function fetchArticles(options = {}) {
    const { language, limit = 50, status = 'published' } = options;
    try {
        let q = db.collection('articles')
            .where('status', '==', status)
            .orderBy('createdAt', 'desc')
            .limit(limit);
        if (language && language !== 'all') q = q.where('language', '==', language);
        const snap = await q.get();
        const results = snap.docs.map(d => ({
            id: d.id, ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date()
        }));
        window._dmlek_articlesCache = results;
        return results;
    } catch (e) {
        console.error('fetchArticles:', e);
        return [];
    }
}

async function fetchArticleById(id) {
    try {
        const snap = await db.collection('articles').doc(id).get();
        if (!snap.exists) return null;
        return { id: snap.id, ...snap.data(), createdAt: snap.data().createdAt?.toDate() || new Date() };
    } catch (e) {
        console.error('fetchArticleById:', e);
        return null;
    }
}

async function fetchMedia(options = {}) {
    const { limit = 50 } = options;
    try {
        const snap = await db.collection('media')
            .orderBy('createdAt', 'desc').limit(limit).get();
        const results = snap.docs.map(m => ({
            id: m.id, ...m.data(),
            createdAt: m.data().createdAt?.toDate() || new Date()
        }));
        window._dmlek_mediaCache = results;
        return results;
    } catch (e) {
        console.error('fetchMedia:', e);
        return [];
    }
}

async function fetchDocuments(options = {}) {
    const { limit = 50 } = options;
    try {
        const snap = await db.collection('documents')
            .where('status', '==', 'published')
            .orderBy('createdAt', 'desc')
            .limit(limit).get();
        return snap.docs.map(d => ({
            id: d.id, ...d.data(),
            createdAt: d.data().createdAt?.toDate() || new Date()
        }));
    } catch (e) {
        console.error('fetchDocuments:', e);
        return [];
    }
}

async function fetchEvents(options = {}) {
    const { upcoming = false, limit = 50 } = options;
    try {
        const snap = await db.collection('events')
            .orderBy('date', 'asc').limit(limit).get();
        let arr = snap.docs.map(e => ({
            id: e.id, ...e.data(),
            date: e.data().date?.toDate() || new Date()
        }));
        if (upcoming) arr = arr.filter(e => e.date >= new Date());
        window._dmlek_eventsCache = arr;
        return arr;
    } catch (e) {
        console.error('fetchEvents:', e);
        return [];
    }
}

async function fetchPhotos(options = {}) {
    const { limit = 100 } = options;
    try {
        const snap = await db.collection('photos')
            .orderBy('createdAt', 'desc').limit(limit).get();
        return snap.docs.map(p => ({
            id: p.id, ...p.data(),
            createdAt: p.data().createdAt?.toDate() || new Date()
        }));
    } catch (e) {
        console.error('fetchPhotos:', e);
        return [];
    }
}

// ========================================
// RENDERING
// ========================================
function calcReadingTime(text) {
    const words = (text || '').replace(/<[^>]+>/g, '').trim().split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 200));
    return mins === 1 ? '1 min read' : `${mins} min read`;
}

function renderEmptyState(icon, title, msg) {
    return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><h3>${title}</h3><p>${msg}</p></div>`;
}

function renderArticleCard(article) {
    const isRtl   = article.language === 'arabic';
    const dateStr = article.createdAt.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
    const readTime = calcReadingTime((article.content || '') + (article.excerpt || ''));
    const isInPages = window.location.pathname.includes('/pages/');
    const path = isInPages ? `./article.html?id=${article.id}` : `pages/article.html?id=${article.id}`;

    return `
        <article class="card ${isRtl ? 'card-rtl' : ''}">
            ${article.image ? `<div class="card-image"><img src="${article.image}" alt="${article.title}" loading="lazy"></div>` : '<div class="card-accent"></div>'}
            <div class="card-body">
                <div class="card-meta">
                    <span class="card-lang ${article.language}">${article.language}</span>
                    <span class="card-date">${dateStr}</span>
                    <span class="reading-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${readTime}</span>
                </div>
                <h3 class="card-title"><a href="${path}">${article.title}</a></h3>
                <p class="card-excerpt">${article.excerpt || ''}</p>
                <div class="card-footer">
                    <a href="${path}" class="card-link">Read More <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
                </div>
            </div>
        </article>`;
}

function renderDocumentCard(doc) {
    const dateStr  = doc.createdAt.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
    const readTime = calcReadingTime((doc.content || '') + (doc.excerpt || ''));
    const isRtl    = doc.language === 'arabic';
    const isInPages = window.location.pathname.includes('/pages/');
    const path = isInPages ? `./document.html?id=${doc.id}` : `pages/document.html?id=${doc.id}`;

    return `
        <article class="card ${isRtl ? 'card-rtl' : ''}">
            ${doc.image ? `<div class="card-image"><img src="${doc.image}" alt="${doc.title}" loading="lazy"></div>` : '<div class="card-accent"></div>'}
            <div class="card-body">
                <div class="card-meta">
                    <span class="card-lang ${doc.language || 'english'}">${doc.language || 'document'}</span>
                    <span class="card-date">${dateStr}</span>
                    <span class="reading-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${readTime}</span>
                </div>
                <h3 class="card-title"><a href="${path}">${doc.title}</a></h3>
                <p class="card-excerpt">${doc.excerpt || ''}</p>
                <div class="card-footer">
                    <a href="${path}" class="card-link">Read Document <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
                </div>
            </div>
        </article>`;
}

function renderMediaCard(media) {
    const dateStr = media.createdAt.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
    const ytId    = extractYouTubeId(media.youtubeUrl || media.url || '');
    const thumb   = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : '';

    return `
        <article class="card" style="cursor:pointer;" onclick="openYouTube('${media.id}','${ytId}')">
            <div class="card-image" style="background:#111;">
                ${thumb ? `<img src="${thumb}" alt="${media.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">` : ''}
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                    <div style="width:56px;height:56px;background:rgba(192,39,29,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="card-meta">
                    <span class="card-lang ${media.language || 'english'}">${media.language || ''}</span>
                    <span class="card-date">${dateStr}</span>
                </div>
                <h3 class="card-title">${media.title}</h3>
                <p class="card-excerpt">${media.description || ''}</p>
            </div>
        </article>`;
}

function renderPhotoCard(photo) {
    return `
        <div class="photo-card" onclick="openPhotoLightbox('${photo.id}')">
            <img src="${photo.image}" alt="${photo.title || 'Photo'}" loading="lazy">
            ${photo.title ? `<div class="photo-caption">${photo.title}</div>` : ''}
        </div>`;
}

function renderEventCard(event) {
    const dateStr = event.date.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `
        <div class="card">
            <div class="card-body">
                <div style="display:flex;align-items:center;gap:.5rem;font-size:.85rem;color:var(--terracotta);font-weight:600;margin-bottom:.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    ${dateStr}
                </div>
                <h3 class="card-title" style="font-size:1.1rem;">${event.title}</h3>
                <p class="card-excerpt">${event.description || ''}</p>
                ${event.location ? `<p style="font-size:.85rem;color:var(--text-muted);">📍 ${event.location}</p>` : ''}
                <div class="card-footer" style="margin-top:1rem;">
                    <button class="btn btn-sm btn-secondary" onclick="addToCalendar('${event.id}')">Add to Calendar</button>
                </div>
            </div>
        </div>`;
}

function renderLoadingCards(n = 6) {
    return Array(n).fill('<div class="card"><div class="skeleton skeleton-card"></div></div>').join('');
}

// ========================================
// YOUTUBE
// ========================================
function extractYouTubeId(url) {
    if (!url) return '';
    const patterns = [/youtu\.be\/([^?&\s]+)/, /youtube\.com\/watch\?v=([^&\s]+)/, /youtube\.com\/embed\/([^?&\s]+)/];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return '';
}

function openYouTube(mediaId, ytId) {
    if (!ytId) { showToast('No YouTube link available.', 'error'); return; }
    const existing = document.getElementById('ytPlayerOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ytPlayerOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:5000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.innerHTML = `
        <div style="background:#111;border-radius:12px;width:100%;max-width:860px;overflow:hidden;position:relative;">
            <button onclick="document.getElementById('ytPlayerOverlay').remove()" style="position:absolute;top:10px;right:10px;z-index:1;width:36px;height:36px;border-radius:8px;border:none;background:rgba(255,255,255,0.15);color:white;cursor:pointer;font-size:1.1rem;">✕</button>
            <div style="position:relative;padding-top:56.25%;">
                <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="autoplay;fullscreen" allowfullscreen></iframe>
            </div>
        </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const esc = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    document.body.appendChild(overlay);
}

// ========================================
// PHOTO LIGHTBOX
// ========================================
let _photoCache = [];

function openPhotoLightbox(photoId) {
    const photo = _photoCache.find(p => p.id === photoId);
    if (!photo) return;

    const existing = document.getElementById('photoLightbox');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'photoLightbox';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:5000;display:flex;align-items:center;justify-content:center;padding:1rem;flex-direction:column;gap:1rem;';
    overlay.innerHTML = `
        <button onclick="document.getElementById('photoLightbox').remove()" style="position:absolute;top:1rem;right:1rem;width:40px;height:40px;border-radius:8px;border:none;background:rgba(255,255,255,0.15);color:white;cursor:pointer;font-size:1.2rem;">✕</button>
        <img src="${photo.image}" alt="${photo.title || ''}" style="max-width:100%;max-height:80vh;border-radius:8px;object-fit:contain;">
        ${photo.title ? `<p style="color:white;font-size:1rem;text-align:center;max-width:600px;">${photo.title}</p>` : ''}
        ${photo.caption ? `<p style="color:rgba(255,255,255,0.65);font-size:.88rem;text-align:center;max-width:600px;">${photo.caption}</p>` : ''}`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const esc = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    document.body.appendChild(overlay);
}

// ========================================
// DOCUMENT DOWNLOAD (now reads content inline)
// Kept for backward compat — redirects to reader
// ========================================
function downloadDocument(docId) {
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = (isInPages ? './document.html' : 'pages/document.html') + '?id=' + docId;
}

// ========================================
// ADD TO CALENDAR (.ics)
// ========================================
function addToCalendar(eventId) {
    const cached = (_window_eventsCache || []).find(e => e.id === eventId);
    const doGenerate = (event) => {
        if (!event) { showToast('Event not available.', 'error'); return; }
        const pad = n => String(n).padStart(2, '0');
        const fmt = d => { const dt = new Date(d); return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`; };
        const end = new Date(event.date); end.setHours(end.getHours() + 2);
        const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//DMLEK//Events//EN','BEGIN:VEVENT',
            `UID:${eventId}@dmlek`,`DTSTART:${fmt(event.date)}`,`DTEND:${fmt(end)}`,
            `SUMMARY:${(event.title||'').replace(/[,;\\]/g,'\\$&')}`,
            `DESCRIPTION:${(event.description||'').replace(/\n/g,'\\n').replace(/[,;\\]/g,'\\$&')}`,
            `LOCATION:${(event.location||'').replace(/[,;\\]/g,'\\$&')}`,
            'END:VEVENT','END:VCALENDAR'].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `${(event.title||'event').replace(/\s+/g,'-').toLowerCase()}.ics` });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Calendar file downloaded.', 'success');
    };

    if (cached) { doGenerate(cached); return; }
    if (db) {
        db.collection('events').doc(eventId).get().then(snap => {
            if (snap.exists) { const d=snap.data(); doGenerate({ id: snap.id, ...d, date: d.date?.toDate()||new Date() }); }
            else showToast('Event not found.', 'error');
        }).catch(() => showToast('Could not load event.', 'error'));
    }
}
let _window_eventsCache = [];

// ========================================
// UTILITIES
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg   = document.getElementById('toastMessage');
    if (!toast || !msg) return;
    toast.className = 'toast ' + type + ' show';
    msg.textContent = message;
    setTimeout(() => toast.classList.remove('show'), 3200);
}

function formatDate(date) {
    return date.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getUrlParam(p) {
    return new URLSearchParams(window.location.search).get(p);
}

// ========================================
// PAGE INITIALIZERS
// ========================================
async function initHomePage() {
    const articlesEl = document.getElementById('featuredArticles');
    const eventsEl   = document.getElementById('upcomingEvents');

    if (articlesEl) {
        articlesEl.innerHTML = renderLoadingCards(6);
        const articles = await fetchArticles({ limit: 6 });
        articlesEl.innerHTML = articles.length
            ? articles.map(renderArticleCard).join('')
            : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', 'No articles yet', 'Check back soon.');
        articlesEl.querySelectorAll('.card').forEach((c, i) => {
            c.classList.add('fade-up');
            setTimeout(() => c.classList.add('visible'), i * 80);
        });
    }

    if (eventsEl) {
        const events = await fetchEvents({ limit: 3 });
        _window_eventsCache = events;
        eventsEl.innerHTML = events.length
            ? events.map(renderEventCard).join('')
            : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'No upcoming events', 'Events will appear here when scheduled.');
    }

    // Scroll fade-up
    initScrollEffects();
    initAnimatedCounters();

    // Search
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) initSearch();
}

async function initArticlesPage() {
    const container = document.getElementById('articlesGrid');
    if (!container) return;

    const urlLang = getUrlParam('lang');
    let currentFilter = 'all';

    if (urlLang) {
        currentFilter = urlLang;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === urlLang));
    } else {
        const active = document.querySelector('.filter-btn.active');
        if (active) currentFilter = active.dataset.filter || 'all';
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            const url = new URL(window.location);
            currentFilter === 'all' ? url.searchParams.delete('lang') : url.searchParams.set('lang', currentFilter);
            window.history.replaceState({}, '', url);
            await load();
        });
    });

    async function load() {
        container.innerHTML = renderLoadingCards(9);
        const articles = await fetchArticles({ language: currentFilter === 'all' ? null : currentFilter, limit: 60 });
        container.innerHTML = articles.length
            ? articles.map(renderArticleCard).join('')
            : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', 'No articles yet', 'Check back soon for articles in English, Tigrinya, Arabic, and Kunama.');
    }
    await load();
}

async function initArticlePage() {
    const id = getUrlParam('id');
    if (!id) { window.location.href = './articles.html'; return; }

    const article = await fetchArticleById(id);
    if (!article) { window.location.href = './articles.html'; return; }

    document.getElementById('articleTitle').textContent = article.title;
    document.getElementById('articleDate').textContent  = formatDate(article.createdAt);
    const langEl = document.getElementById('articleLang');
    if (langEl) { langEl.textContent = article.language; langEl.className = 'card-lang ' + article.language; }
    document.title = article.title + ' | DMLEK';

    const contentEl = document.getElementById('articleContent');
    contentEl.innerHTML = article.content || '<p>No content available.</p>';
    contentEl.querySelectorAll('img').forEach(img => { if (!img.loading) img.loading = 'lazy'; });
    if (article.language === 'arabic') contentEl.style.direction = 'rtl';

    // Reading time
    const words = (article.content || '').replace(/<[^>]+>/g, '').trim().split(/\s+/).length;
    const mins  = Math.max(1, Math.round(words / 200));
    const rt    = document.getElementById('readingTime');
    if (rt) rt.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${mins} min read`;

    document.dispatchEvent(new CustomEvent('dmlek:articleLoaded', { detail: { content: article.content || '' } }));

    // Related articles
    const relEl = document.getElementById('relatedArticles');
    if (relEl) {
        const related = await fetchArticles({ language: article.language, limit: 6 });
        const others  = related.filter(a => a.id !== id).slice(0, 3);
        relEl.innerHTML = others.length
            ? others.map(a => `<div class="related-article"><div><a href="./article.html?id=${a.id}" class="related-article-title">${a.title}</a><div class="related-article-date">${formatDate(a.createdAt)}</div></div></div>`).join('')
            : '<p style="color:var(--text-muted);font-size:.9rem;">No related articles.</p>';
    }
}

async function initMediaPage() {
    const container = document.getElementById('mediaGrid');
    if (!container) return;

    const media = await fetchMedia({ limit: 60 });
    container.innerHTML = media.length
        ? media.map(renderMediaCard).join('')
        : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>', 'No videos yet', 'YouTube videos will appear here once published.');
}

async function initDocumentsPage() {
    const container = document.getElementById('documentsGrid');
    if (!container) return;
    container.innerHTML = renderLoadingCards(6);
    const docs = await fetchDocuments();
    container.innerHTML = docs.length
        ? docs.map(renderDocumentCard).join('')
        : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', 'No documents yet', 'Official documents and publications will be listed here.');
}

async function initDocumentPage() {
    const id = getUrlParam('id');
    if (!id) { window.location.href = './documents.html'; return; }
    try {
        const snap = await db.collection('documents').doc(id).get();
        if (!snap.exists) { window.location.href = './documents.html'; return; }
        const doc = { id: snap.id, ...snap.data(), createdAt: snap.data().createdAt?.toDate() || new Date() };

        document.getElementById('docTitle').textContent = doc.title;
        const bc = document.getElementById('docBreadcrumb');
        if (bc) bc.textContent = doc.title.length > 40 ? doc.title.slice(0, 40) + '…' : doc.title;
        document.getElementById('docDate').textContent = formatDate(doc.createdAt);
        const langEl = document.getElementById('docLang');
        if (langEl) { langEl.textContent = doc.language || 'english'; langEl.className = 'card-lang ' + (doc.language || 'english'); }
        document.title = doc.title + ' | DMLEK Documents';

        const contentEl = document.getElementById('docContent');
        contentEl.innerHTML = doc.content || '<p>No content available.</p>';
        contentEl.querySelectorAll('img').forEach(img => { if (!img.loading) img.loading = 'lazy'; });
        if (doc.language === 'arabic') contentEl.style.direction = 'rtl';

        const words = (doc.content || '').replace(/<[^>]+>/g, '').trim().split(/\s+/).length;
        const mins  = Math.max(1, Math.round(words / 200));
        const rt    = document.getElementById('docReadingTime');
        if (rt) rt.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${mins} min read`;

        const relEl = document.getElementById('relatedDocuments');
        if (relEl) {
            const allDocs = await fetchDocuments({ limit: 10 });
            const others  = allDocs.filter(d => d.id !== id).slice(0, 4);
            relEl.innerHTML = others.length
                ? others.map(d => `<div class="related-article"><div><a href="./document.html?id=${d.id}" class="related-article-title">${d.title}</a><div class="related-article-date">${formatDate(d.createdAt)}</div></div></div>`).join('')
                : '<p style="color:var(--text-muted);font-size:.9rem;">No other documents yet.</p>';
        }
    } catch (e) {
        console.error('initDocumentPage:', e);
        const contentEl = document.getElementById('docContent');
        if (contentEl) contentEl.innerHTML = '<p style="color:var(--text-muted);">Could not load this document. Please try again.</p>';
    }
}

async function initEventsPage() {
    const container = document.getElementById('eventsGrid');
    if (!container) return;
    const events = await fetchEvents({ upcoming: true });
    _window_eventsCache = events;
    container.innerHTML = events.length
        ? events.map(renderEventCard).join('')
        : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'No upcoming events', 'Events and gatherings will be announced here.');
}

async function initPhotosPage() {
    const container = document.getElementById('photosGrid');
    if (!container) return;
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">Loading photos...</div>';
    const photos = await fetchPhotos({ limit: 100 });
    _photoCache = photos;
    container.innerHTML = photos.length
        ? photos.map(renderPhotoCard).join('')
        : renderEmptyState('<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>', 'No photos yet', 'Photos and gallery images will appear here.');
}

function initAboutPage() {}

// ========================================
// HOME PAGE EXTRAS
// ========================================
function initScrollEffects() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

function initAnimatedCounters() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target, target = parseInt(el.dataset.target);
                let n = 0; const inc = target / 30;
                const t = setInterval(() => {
                    n += inc;
                    if (n >= target) { el.textContent = target; clearInterval(t); }
                    else el.textContent = Math.floor(n);
                }, 50);
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('.stat-number[data-target]').forEach(c => obs.observe(c));
}

function initSearch() {
    const overlay  = document.getElementById('searchOverlay');
    const input    = document.getElementById('searchInput');
    const results  = document.getElementById('searchResults');
    if (!overlay || !input || !results) return;

    const open  = () => { overlay.classList.add('active'); setTimeout(() => input.focus(), 100); };
    const close = () => { overlay.classList.remove('active'); input.value = ''; results.innerHTML = '<div class="search-empty">Start typing to search...</div>'; };

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', open);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
        if (e.key === 'Escape') close();
    });

    input.addEventListener('input', async () => {
        const q = input.value.toLowerCase().trim();
        if (!q) { results.innerHTML = '<div class="search-empty">Start typing to search...</div>'; return; }
        const articles = state.articles.length ? state.articles : await fetchArticles({ limit: 100 });
        state.articles = articles;
        const found = articles.filter(a => a.title.toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q));
        results.innerHTML = found.length === 0
            ? '<div class="search-empty">No results found</div>'
            : found.slice(0, 8).map(a => `<a href="pages/article.html?id=${a.id}" class="search-result-item"><div class="search-result-title">${a.title}</div><div class="search-result-excerpt">${a.excerpt || ''}</div></a>`).join('');
    });
}

// ========================================
// ANALYTICS
// ========================================
function trackPageView() {
    if (db) {
        db.collection('analytics').add({
            page: window.location.pathname,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ua: navigator.userAgent.substring(0, 100)
        }).catch(() => {});
    }
}
trackPageView();
