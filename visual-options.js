const output = document.querySelector('#choice-output');
const buttons = [...document.querySelectorAll('[data-choice]')];
const labels = {
  catalogue: '01 · Catalogue selected',
  rack: '02 · Patch bay selected',
  terminal: '03 · Terminal selected',
};

function setChoice(choice) {
  if (!labels[choice]) return;
  localStorage.setItem('m-suite-visual-choice', choice);
  if (output) output.textContent = labels[choice];
  buttons.forEach((button) => {
    const active = button.dataset.choice === choice;
    button.classList.toggle('is-chosen', active);
    button.setAttribute('aria-pressed', String(active));
    if (active && button.textContent.includes('Choose this')) button.textContent = 'Chosen ✓';
  });
}

buttons.forEach((button) => button.addEventListener('click', () => setChoice(button.dataset.choice)));
const saved = localStorage.getItem('m-suite-visual-choice');
if (saved) setChoice(saved);
