export function initSkillsReveal() {
  const els = document.querySelectorAll('#s-skills .skills-reveal');
  if (!els.length) return;

  const show = (el, delay) => {
    if (delay > 0) {
      el.style.transitionDelay = delay + 's';
    }
    el.classList.add('is-visible');
    if (delay > 0) {
      setTimeout(() => {
        el.style.transitionDelay = '';
      }, (delay + 1.2) * 1000);
    }
  };

  if (typeof IntersectionObserver === 'undefined') {
    els.forEach((el, i) => show(el, 0));
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          const i = Number(el.dataset.skillsIndex || 0);
          show(el, Math.min(i * 0.05, 0.5));
        } else {
          el.classList.remove('is-visible');
          el.style.transitionDelay = '';
        }
      });
    },
    { threshold: 0.1 }
  );

  els.forEach((el, i) => {
    el.dataset.skillsIndex = i;
    obs.observe(el);
  });
}
