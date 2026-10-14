export function initProjectsReveal() {
  const section = document.querySelector('#s-projects');
  if (!section) return;

  const els = Array.from(section.querySelectorAll('.project-reveal'));
  if (!els.length) return;

  const STEP = 0.12;

  const reveal = () => {
    els.forEach((el, i) => {
      el.style.transitionDelay = (i * STEP).toFixed(2) + 's';
      el.classList.add('is-visible');
    });
  };

  const reset = () => {
    els.forEach((el) => {
      el.classList.remove('is-visible');
      el.style.transitionDelay = '';
    });
  };

  if (typeof IntersectionObserver === 'undefined') {
    reveal();
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal();
        } else {
          reset();
        }
      });
    },
    { threshold: 0.15 }
  );

  obs.observe(section);
}
