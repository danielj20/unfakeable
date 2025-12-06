(function () {
  const STORAGE_KEY = 'unfakeableSubject_v2';

  const getSubjectIdFromPath = () => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  };

  const setStatus = (element, message, type = 'info') => {
    if (!element) return;
    element.textContent = message;
    element.dataset.status = type;
  };

  const initYear = () => {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  };

  const safeParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Unable to parse stored subject', error);
      return null;
    }
  };

  const getStoredSubject = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return safeParse(raw);
    } catch (error) {
      console.warn('Unable to read stored subject', error);
      return null;
    }
  };

  const saveSubjectSession = (payload) => {
    if (!payload || !payload.subjectId) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save subject session', error);
    }
  };

  const initRaterLinkPrompt = () => {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action="rater-link"]');
      if (!trigger) return;

      event.preventDefault();
      const subjectId = window.prompt('Enter the code from your friend’s invite:');
      if (subjectId) {
        window.location.href = `/quiz/rater/${subjectId.trim()}`;
      }
    });
  };

  const applyReturningState = () => {
    const stored = getStoredSubject();
    const ctas = document.querySelectorAll('.js-start-cta');
    const returningNote = document.getElementById('returning-note');

    ctas.forEach((cta) => {
      if (!cta.dataset.defaultLabel) {
        cta.dataset.defaultLabel = cta.textContent.trim();
      }
      if (!cta.dataset.defaultHref) {
        cta.dataset.defaultHref = cta.getAttribute('href') || '#';
      }

      if (stored?.subjectId) {
        cta.textContent = 'See my Unfakeable results';
        cta.setAttribute('href', `/results/${stored.subjectId}`);
      } else {
        cta.textContent = cta.dataset.defaultLabel;
        cta.setAttribute('href', cta.dataset.defaultHref);
      }
    });

    if (returningNote) {
      if (stored?.subjectId) {
        returningNote.classList.remove('hidden');
        const resultsLink = returningNote.querySelector('a[data-note-link="results"]');
        const inviteLink = returningNote.querySelector('a[data-note-link="invite"]');
        if (resultsLink) resultsLink.setAttribute('href', `/results/${stored.subjectId}`);
        if (inviteLink) inviteLink.setAttribute('href', `/invite/${stored.subjectId}`);
      } else {
        returningNote.classList.add('hidden');
      }
    }
  };

  window.Unfakeable = {
    getSubjectIdFromPath,
    setStatus,
    saveSubjectSession,
    getStoredSubject,
  };

  document.addEventListener('DOMContentLoaded', () => {
    initYear();
    initRaterLinkPrompt();
    applyReturningState();
  });
})();
