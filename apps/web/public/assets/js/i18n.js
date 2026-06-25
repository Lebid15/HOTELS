window.FandqiI18n = (() => {
  const state = {
    lang: localStorage.getItem('fandqi.lang') || 'ar',
    messages: {}
  };

  async function load(lang = state.lang) {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) throw new Error(`Cannot load locale: ${lang}`);
    state.lang = lang;
    state.messages = await response.json();
    localStorage.setItem('fandqi.lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    applyDocumentLanguageMeta();
  }

  function t(path, fallback = '') {
    return path.split('.').reduce((value, key) => value?.[key], state.messages) ?? fallback ?? path;
  }

  function applyDocumentLanguageMeta() {
    const title = t('app.title', state.lang === 'ar' ? 'فندقي | منصة إدارة وتشغيل الفنادق' : 'Fandqi | Hotel operations platform');
    document.title = title;
    const boot = document.getElementById('app');
    if (boot?.classList?.contains('boot-screen') && !boot.dataset.localized) {
      boot.textContent = t('app.loading', state.lang === 'ar' ? 'جاري التحميل...' : 'Loading...');
      boot.dataset.localized = 'true';
    }
  }

  async function toggle() {
    await load(state.lang === 'ar' ? 'en' : 'ar');
  }

  return { state, load, t, toggle, applyDocumentLanguageMeta };
})();
