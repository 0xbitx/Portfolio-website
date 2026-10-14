export function initSectionsReveal() {
  const selector =
    '.delaySmallReveal, .delayMediumReveal, .delayLargeReveal, .delayExtraBigReveal, .intervalCardReveal';
  const all = Array.from(document.querySelectorAll(selector));
  if (!all.length) return;

  const baseDelay = (el) => {
    if (el.classList.contains('delaySmallReveal')) return 0.2;
    if (el.classList.contains('delayMediumReveal')) return 0.3;
    if (el.classList.contains('delayLargeReveal')) return 0.4;
    if (el.classList.contains('delayExtraBigReveal')) return 0.6;
    if (el.classList.contains('intervalCardReveal')) {
      return Number(el.dataset.intervalIndex || 0) * 0.15;
    }
    return 0;
  };

  const show = (el) => {
    el.style.transitionDelay = baseDelay(el).toFixed(2) + 's';
    el.classList.add('is-visible');
  };

  const hide = (el) => {
    el.style.transitionDelay = '';
    el.classList.remove('is-visible');
  };

  const counters = new Map();
  all
    .filter((el) => el.classList.contains('intervalCardReveal'))
    .forEach((el) => {
      const parent = el.parentElement;
      const n = counters.get(parent) || 0;
      el.dataset.intervalIndex = n;
      counters.set(parent, n + 1);
    });

  const groups = new Map();
  all.forEach((el) => {
    const section = el.closest('section') || document.body;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(el);
  });

  if (typeof IntersectionObserver === 'undefined') {
    all.forEach(show);
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const els = groups.get(entry.target) || [];
        els.forEach((el) => {
          if (entry.isIntersecting) {
            show(el);
          } else {
            hide(el);
          }
        });
      });
    },
    { threshold: 0, rootMargin: '-10% 0px -35% 0px' }
  );

  groups.forEach((els, section) => obs.observe(section));
}
