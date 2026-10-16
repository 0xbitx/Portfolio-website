// Slow, extra-smooth scrolling for the glass header's anchor links.
//
// Native anchor jumps (and the browser's own `scroll-behavior: smooth`) move
// too quickly to feel calm, and their speed can't be tuned. This intercepts
// clicks on the header nav, then glides to the section with a smootherstep
// curve so the motion eases in and out instead of snapping to a stop.
export function initSmoothHeaderScroll() {
  var links = document.querySelectorAll('header .nav-list li a');
  if (!links.length) return;

  var root = document.documentElement;
  var animId = 0;
  var savedBehavior = null;

  // While we drive scrollY frame-by-frame we must stop the CSS smooth
  // behaviour, otherwise every scrollTo() would itself animate. The saved
  // value is restored only once the last glide finishes.
  function beginInstant() {
    if (savedBehavior === null) savedBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
  }

  function endInstant() {
    if (savedBehavior !== null) {
      root.style.scrollBehavior = savedBehavior;
      savedBehavior = null;
    }
  }

  function smootherstep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function glideTo(targetY) {
    var startY = window.pageYOffset || root.scrollTop || 0;
    var distance = targetY - startY;
    if (!distance) return;

    // Longer journeys glide for longer, but stay within a calm range so a
    // short hop still feels deliberate rather than twitchy.
    var duration = Math.min(2600, Math.max(1400, Math.abs(distance) * 1.6));
    var startTime = null;
    var lastY = -1;
    var token = ++animId;

    beginInstant();

    function step(now) {
      if (token !== animId) return;   // a newer glide took over
      if (startTime === null) startTime = now;
      var t = Math.min((now - startTime) / duration, 1);
      var y = Math.round(startY + distance * smootherstep(t));
      if (y !== lastY) {
        lastY = y;
        window.scrollTo(0, y);
      }
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        endInstant();
      }
    }
    requestAnimationFrame(step);
  }

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href') || '';
      if (href.charAt(0) !== '#' || href.length < 2) return;   // skip external links
      var target = document.getElementById(href.slice(1));
      if (!target) return;

      // Respect users who ask for no motion — let the browser jump instantly.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      e.preventDefault();
      if (window.history && history.pushState) history.pushState(null, '', href);

      var startY = window.pageYOffset || root.scrollTop || 0;
      glideTo(target.getBoundingClientRect().top + startY);
    });
  });
}
