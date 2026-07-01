const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.textContent = open ? 'menu' : 'close';
  nav?.classList.toggle('is-open', !open);
});

nav?.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLAnchorElement)) return;
  menuButton?.setAttribute('aria-expanded', 'false');
  if (menuButton) menuButton.textContent = 'menu';
  nav.classList.remove('is-open');
});

document.querySelectorAll('.intent').forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return;

    document.querySelectorAll('.instrument-card.is-selected').forEach((card) => {
      card.classList.remove('is-selected');
    });
    target.classList.add('is-selected');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => target.classList.remove('is-selected'), 2400);
  });
});
