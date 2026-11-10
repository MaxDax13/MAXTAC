const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
const menuLabel = menuButton?.querySelector('.sr-only');
const mobileNavigation = window.matchMedia('(max-width: 640px)');

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 18);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const setMenuOpen = (isOpen, restoreFocus = false) => {
  menuButton?.setAttribute('aria-expanded', String(isOpen));
  navigation?.classList.toggle('open', isOpen);
  if (menuLabel) menuLabel.textContent = isOpen ? 'Menü schließen' : 'Menü öffnen';
  if (restoreFocus) menuButton?.focus();
};

menuButton?.addEventListener('click', () => {
  setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
});

document.addEventListener('pointerdown', (event) => {
  if (menuButton?.getAttribute('aria-expanded') !== 'true' || header?.contains(event.target)) return;
  setMenuOpen(false);
});

mobileNavigation.addEventListener('change', (event) => {
  if (!event.matches) setMenuOpen(false);
});

document.querySelector('#year').textContent = new Date().getFullYear();

const openFooterDetailFromHash = () => {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const target = document.getElementById(hash);
  if (target?.matches('.footer-detail')) target.open = true;
};
window.addEventListener('hashchange', openFooterDetailFromHash);
openFooterDetailFromHash();

const zoomGauge = document.querySelector('.zoom-gauge');
const zoomValue = document.querySelector('#zoom-value');
const angleValue = document.querySelector('#angle-value');
const cameraAxes = document.querySelectorAll('.camera-axis');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heroVisual = document.querySelector('.hero-visual');
let heroAnimationVisible = true;
let heroAnimationFrame = 0;

const updateZoom = (time = 0) => {
  if (!zoomGauge || !zoomValue) return;

  // Das Sichtfeld ist zur Mitte des 4,5-Sekunden-Zyklus am breitesten.
  // Optischer Zoom verhält sich umgekehrt: enges Sichtfeld = hoher Zoom.
  const fovWidth = (1 - Math.cos((time % 4500) / 4500 * Math.PI * 2)) / 2;
  const zoom = 2.5 - (fovWidth * 1.5);
  const level = .3 + ((zoom - 1) / 1.5 * .5);

  const aim = (1 - Math.cos((time % 7000) / 7000 * Math.PI * 2)) / 2;
  const angle = -7 + (aim * 12);

  zoomGauge.style.setProperty('--zoom-level', level.toFixed(3));
  zoomValue.textContent = `${zoom.toFixed(1).replace('.', ',')}×`;
  cameraAxes.forEach((axis) => axis.style.setProperty('--camera-angle', `${angle.toFixed(2)}deg`));
  if (angleValue) {
    const prefix = angle > 0 ? '+' : angle < 0 ? '−' : '';
    angleValue.textContent = `${prefix}${Math.abs(angle).toFixed(1).replace('.', ',')}°`;
  }

  if (!reducedMotion.matches && heroAnimationVisible) heroAnimationFrame = requestAnimationFrame(updateZoom);
  else heroAnimationFrame = 0;
};

if (reducedMotion.matches) {
  zoomGauge?.style.setProperty('--zoom-level', '.48');
  cameraAxes.forEach((axis) => axis.style.setProperty('--camera-angle', '0deg'));
  if (zoomValue) zoomValue.textContent = '1,5×';
  if (angleValue) angleValue.textContent = '0,0°';
} else {
  heroAnimationFrame = requestAnimationFrame(updateZoom);
  if ('IntersectionObserver' in window && heroVisual) {
    new IntersectionObserver(([entry]) => {
      heroAnimationVisible = entry.isIntersecting;
      if (!heroAnimationVisible && heroAnimationFrame) {
        cancelAnimationFrame(heroAnimationFrame);
        heroAnimationFrame = 0;
      } else if (heroAnimationVisible && !heroAnimationFrame) {
        heroAnimationFrame = requestAnimationFrame(updateZoom);
      }
    }, { threshold: .05 }).observe(heroVisual);
  }
}

const solutionSlider = document.querySelector('[data-solution-slider]');
const solutionTrack = solutionSlider?.querySelector('[data-slider-track]');
const solutionSlides = solutionTrack ? [...solutionTrack.querySelectorAll('.solution-card')] : [];
const solutionPrev = solutionSlider?.querySelector('[data-slider-prev]');
const solutionNext = solutionSlider?.querySelector('[data-slider-next]');
const solutionProgress = solutionSlider ? [...solutionSlider.querySelectorAll('[data-slider-progress] i')] : [];
let leadingSolutionClone = null;
let trailingSolutionClone = null;
let allSolutionSlides = solutionSlides;
let activeSolution = 0;
let solutionTargetIndex = null;
let solutionScrollFrame = 0;
let solutionSettleTimer = 0;
let solutionAutoplayTimer = 0;
let solutionAutoplayStartTimer = 0;
let solutionIsVisible = true;
let sliderPointerId = null;
let sliderStartX = 0;
let sliderStartY = 0;
let sliderLastX = 0;
let sliderStartScroll = 0;
let sliderStartIndex = 0;
let sliderDragDirection = null;
let sliderDidDrag = false;
let sliderDragFrame = 0;
let sliderPendingScroll = 0;
const SOLUTION_AUTOPLAY_DELAY = 4000;
const SOLUTION_INTERACTION_DELAY = 6000;

const normalizeSolutionIndex = (index) => {
  if (!solutionSlides.length) return 0;
  return ((index % solutionSlides.length) + solutionSlides.length) % solutionSlides.length;
};

if (solutionTrack && solutionSlides.length > 1) {
  leadingSolutionClone = solutionSlides.at(-1).cloneNode(true);
  trailingSolutionClone = solutionSlides[0].cloneNode(true);
  [leadingSolutionClone, trailingSolutionClone].forEach((clone) => {
    clone.classList.add('solution-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.removeAttribute('aria-label');
  });
  solutionTrack.prepend(leadingSolutionClone);
  solutionTrack.append(trailingSolutionClone);
  allSolutionSlides = [...solutionTrack.querySelectorAll('.solution-card')];
  requestAnimationFrame(() => solutionTrack.scrollTo({ left: solutionSlides[0].offsetLeft, behavior: 'auto' }));
}

const updateSolutionState = (index) => {
  activeSolution = normalizeSolutionIndex(index);
  solutionProgress.forEach((item, itemIndex) => item.classList.toggle('active', itemIndex === activeSolution));
};

const getClosestPhysicalSlide = () => allSolutionSlides.reduce((closest, slide, index) => {
  const currentDistance = Math.abs(slide.offsetLeft - solutionTrack.scrollLeft);
  const closestDistance = Math.abs(allSolutionSlides[closest].offsetLeft - solutionTrack.scrollLeft);
  return currentDistance < closestDistance ? index : closest;
}, 0);

const getLogicalIndex = (slide) => {
  if (slide === leadingSolutionClone) return solutionSlides.length - 1;
  if (slide === trailingSolutionClone) return 0;
  return Math.max(0, solutionSlides.indexOf(slide));
};

const settleInfiniteSlider = () => {
  if (!solutionTrack || !leadingSolutionClone || !trailingSolutionClone) return;
  const closestSlide = allSolutionSlides[getClosestPhysicalSlide()];
  if (closestSlide === leadingSolutionClone) {
    solutionTrack.scrollTo({ left: solutionSlides.at(-1).offsetLeft, behavior: 'auto' });
  } else if (closestSlide === trailingSolutionClone) {
    solutionTrack.scrollTo({ left: solutionSlides[0].offsetLeft, behavior: 'auto' });
  }
};

const goToSolution = (index) => {
  if (!solutionTrack || !solutionSlides.length) return;
  const nextIndex = normalizeSolutionIndex(index);
  let targetSlide = solutionSlides[nextIndex];
  if (index < 0 && leadingSolutionClone) targetSlide = leadingSolutionClone;
  if (index >= solutionSlides.length && trailingSolutionClone) targetSlide = trailingSolutionClone;
  solutionTargetIndex = nextIndex;
  solutionTrack.scrollTo({ left: targetSlide.offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  updateSolutionState(nextIndex);
};

const stopSolutionAutoplay = () => {
  clearTimeout(solutionAutoplayStartTimer);
  clearInterval(solutionAutoplayTimer);
};
const startSolutionAutoplay = (delay = SOLUTION_AUTOPLAY_DELAY) => {
  stopSolutionAutoplay();
  if (reducedMotion.matches || solutionSlides.length < 2 || document.hidden || !solutionIsVisible) return;
  solutionAutoplayStartTimer = window.setTimeout(() => {
    goToSolution(activeSolution + 1);
    solutionAutoplayTimer = window.setInterval(() => goToSolution(activeSolution + 1), SOLUTION_AUTOPLAY_DELAY);
  }, delay);
};

solutionPrev?.addEventListener('click', () => goToSolution(activeSolution - 1));
solutionNext?.addEventListener('click', () => goToSolution(activeSolution + 1));

solutionTrack?.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  goToSolution(activeSolution + (event.key === 'ArrowRight' ? 1 : -1));
});

solutionTrack?.addEventListener('scroll', () => {
  cancelAnimationFrame(solutionScrollFrame);
  solutionScrollFrame = requestAnimationFrame(() => {
    const closestSlide = allSolutionSlides[getClosestPhysicalSlide()];
    if (solutionTargetIndex === null) updateSolutionState(getLogicalIndex(closestSlide));
  });
  clearTimeout(solutionSettleTimer);
  solutionSettleTimer = window.setTimeout(() => {
    settleInfiniteSlider();
    if (solutionTargetIndex !== null) updateSolutionState(solutionTargetIndex);
    solutionTargetIndex = null;
  }, 120);
}, { passive: true });

const finishSliderDrag = (event, cancelled = false) => {
  if (!solutionTrack || event.pointerId !== sliderPointerId) return;
  const pointerId = sliderPointerId;
  solutionTrack.classList.remove('is-dragging');

  if (!cancelled && sliderDragDirection === 'horizontal') {
    if (sliderDragFrame) {
      cancelAnimationFrame(sliderDragFrame);
      sliderDragFrame = 0;
      solutionTrack.scrollLeft = sliderPendingScroll;
    }
    const travel = sliderStartX - sliderLastX;
    const threshold = Math.min(90, solutionTrack.clientWidth * .12);
    const closestSlide = allSolutionSlides[getClosestPhysicalSlide()];
    const targetIndex = Math.abs(travel) >= threshold
      ? sliderStartIndex + (travel > 0 ? 1 : -1)
      : getLogicalIndex(closestSlide);
    goToSolution(targetIndex);
  }

  sliderPointerId = null;
  sliderDragDirection = null;
  if (solutionTrack.hasPointerCapture?.(pointerId)) solutionTrack.releasePointerCapture(pointerId);
  startSolutionAutoplay(SOLUTION_INTERACTION_DELAY);
};

solutionTrack?.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  sliderPointerId = event.pointerId;
  sliderStartX = sliderLastX = event.clientX;
  sliderStartY = event.clientY;
  sliderStartScroll = solutionTrack.scrollLeft;
  sliderPendingScroll = sliderStartScroll;
  sliderStartIndex = activeSolution;
  sliderDragDirection = null;
  sliderDidDrag = false;
  stopSolutionAutoplay();
});

solutionTrack?.addEventListener('pointermove', (event) => {
  if (event.pointerId !== sliderPointerId) return;
  const deltaX = event.clientX - sliderStartX;
  const deltaY = event.clientY - sliderStartY;
  sliderLastX = event.clientX;

  if (!sliderDragDirection && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= 6) {
    sliderDragDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    if (sliderDragDirection === 'horizontal') {
      solutionTrack.setPointerCapture?.(sliderPointerId);
      solutionTrack.classList.add('is-dragging');
    }
  }

  if (sliderDragDirection !== 'horizontal') return;
  event.preventDefault();
  sliderDidDrag = true;
  sliderPendingScroll = sliderStartScroll - deltaX;
  if (!sliderDragFrame) {
    sliderDragFrame = requestAnimationFrame(() => {
      solutionTrack.scrollLeft = sliderPendingScroll;
      sliderDragFrame = 0;
    });
  }
});

solutionTrack?.addEventListener('pointerup', (event) => finishSliderDrag(event));
solutionTrack?.addEventListener('pointercancel', (event) => finishSliderDrag(event, true));
solutionTrack?.addEventListener('lostpointercapture', (event) => {
  if (event.pointerId !== sliderPointerId) return;
  solutionTrack.classList.remove('is-dragging');
  sliderPointerId = null;
  sliderDragDirection = null;
});
solutionTrack?.addEventListener('click', (event) => {
  if (!sliderDidDrag) return;
  event.preventDefault();
  event.stopPropagation();
  sliderDidDrag = false;
}, true);
solutionTrack?.addEventListener('dragstart', (event) => event.preventDefault());
solutionSlider?.addEventListener('focusin', stopSolutionAutoplay);
solutionSlider?.addEventListener('focusout', () => startSolutionAutoplay());
document.addEventListener('visibilitychange', () => document.hidden ? stopSolutionAutoplay() : startSolutionAutoplay());
if ('IntersectionObserver' in window && solutionSlider) {
  new IntersectionObserver(([entry]) => {
    solutionIsVisible = entry.isIntersecting;
    if (solutionIsVisible) startSolutionAutoplay();
    else stopSolutionAutoplay();
  }, { threshold: .1 }).observe(solutionSlider);
}
startSolutionAutoplay();
