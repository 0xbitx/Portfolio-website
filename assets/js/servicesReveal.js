export function initServicesReveal() {
  const els = document.querySelectorAll('#s-services .service-reveal');
  if (!els.length) return;

  const parts = (el) => [
    el.querySelector('.skills-icons'),
    el.querySelector('h3'),
    el.querySelector('p'),
  ];

  const show = (el, delay) => {
    const [icon, h3, p] = parts(el);
    const targets = [
      [icon, delay],
      [h3, delay + 0.12],
      [p, delay + 0.22],
    ];
    targets.forEach(([node, d]) => {
      if (node) node.style.transitionDelay = d.toFixed(2) + 's';
    });
    el.classList.add('is-visible');
    setTimeout(() => {
      targets.forEach(([node]) => {
        if (node) node.style.transitionDelay = '';
      });
    }, (delay + 1.4) * 1000);
  };

  const clear = (el) => {
    parts(el).forEach((node) => {
      if (node) node.style.transitionDelay = '';
    });
  };

  if (typeof IntersectionObserver === 'undefined') {
    els.forEach((el) => show(el, 0));
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          const i = Number(el.dataset.serviceIndex || 0);
          show(el, Math.min(i * 0.12, 0.5));
        } else {
          el.classList.remove('is-visible');
          clear(el);
        }
      });
    },
    { threshold: 0.2 }
  );

  els.forEach((el, i) => {
    el.dataset.serviceIndex = i;
    obs.observe(el);
  });
}
