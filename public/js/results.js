(function () {
  const subjectId = window.Unfakeable.getSubjectIdFromPath();
  if (!subjectId) return;

  const state = {
    cards: [],
    index: 0,
    loadingCards: false,
    saved: false,
  };

  const palette = [
    { bg: '#FFF3DA', text: '#5c3b00' },
    { bg: '#E2F3FF', text: '#004466' },
    { bg: '#FCE4FF', text: '#5b0068' },
    { bg: '#E8FFE5', text: '#1d5c2d' },
    { bg: '#FFEAE3', text: '#6a1a0b' },
  ];

  const el = {
    waitingState: document.getElementById('waiting-state'),
    waitingCopy: document.getElementById('waiting-copy'),
    waitingProgress: document.getElementById('waiting-progress'),
    resultsState: document.getElementById('results-state'),
    resultsHeading: document.getElementById('results-heading'),
    resultsMeta: document.getElementById('results-meta'),
    raterCount: document.getElementById('results-rater-count'),
    threshold: document.getElementById('results-threshold'),
    shareBtn: document.getElementById('share-again'),
    refreshBtn: document.getElementById('refresh-progress'),
    startBtn: document.getElementById('start-reveal'),
    storyIntro: document.getElementById('story-intro'),
    storyExperience: document.getElementById('story-experience'),
    storyCard: document.getElementById('story-card'),
    storyEyebrow: document.getElementById('story-eyebrow'),
    storyTitle: document.getElementById('story-title'),
    storyBody: document.getElementById('story-body'),
    storyMeta: document.getElementById('story-meta'),
    storyPrev: document.getElementById('story-prev'),
    storyNext: document.getElementById('story-next'),
    storyProgress: document.getElementById('story-progress'),
    saveBtn: document.getElementById('story-save'),
    saveStatus: document.getElementById('story-save-status'),
  };

  const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Request failed.');
    }
    return response.json();
  };

  const fetchProgress = () => fetchJson(`/api/progress/${subjectId}`);
  const fetchResults = () => fetchJson(`/api/results/${subjectId}`);
  const fetchStoryCards = () => fetchJson(`/api/results/${subjectId}/story`, { method: 'GET' });
  const requestStoryCards = () => fetchJson(`/api/results/${subjectId}/story`, { method: 'POST' });
  const saveStory = (cards) =>
    fetchJson(`/api/results/${subjectId}/story/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards }),
    });

  const setButtonState = (button, isLoading, idleLabel, loadingLabel) => {
    if (!button) return;
    button.disabled = isLoading;
    button.classList.toggle('loading', isLoading);
    if (loadingLabel && isLoading) {
      button.textContent = loadingLabel;
    } else if (idleLabel) {
      button.textContent = idleLabel;
    }
  };

  const renderWaiting = (progress) => {
    el.waitingState.classList.remove('hidden');
    el.resultsState.classList.add('hidden');
    el.waitingCopy.textContent = `You’ve got ${progress.currentRatersCount} of ${progress.targetRaters} storytellers. Need at least ${progress.minRaters} to unlock your Unfakeable results.`;
    const pct = Math.min(1, progress.currentRatersCount / progress.targetRaters) * 100;
    el.waitingProgress.style.width = `${pct}%`;
    if (el.shareBtn) {
      el.shareBtn.href = `/invite/${subjectId}`;
    }
  };

  const renderResultsShell = (results) => {
    el.waitingState.classList.add('hidden');
    el.resultsState.classList.remove('hidden');
    el.resultsHeading.textContent = `${results.subject.name}, here’s your Unfakeable readout.`;
    el.resultsMeta.textContent = `${results.raterCount} people told the truth. Tap through the cards to see how they really describe you.`;
    if (el.raterCount) el.raterCount.textContent = results.raterCount;
    if (el.threshold) el.threshold.textContent = results.minRaters;
  };

  const renderStoryCard = () => {
    const story = state.cards[state.index];
    if (!story) return;

    const paletteIndex = state.index % palette.length;
    const colors = palette[paletteIndex];

    el.storyCard.style.background = colors.bg;
    el.storyCard.style.color = colors.text;
    el.storyCard.style.borderColor = `${colors.text}33`;
    el.storyCard.classList.remove('animate');
    void el.storyCard.offsetWidth;
    el.storyCard.classList.add('animate');

    el.storyEyebrow.textContent = story.eyebrow;
    el.storyTitle.innerHTML = story.title;
    el.storyBody.innerHTML = story.body;
    el.storyMeta.innerHTML = story.meta;

    el.storyPrev.disabled = state.index === 0;
    const isLast = state.index === state.cards.length - 1;
    el.storyNext.textContent = isLast ? 'Restart story' : 'Next →';
    el.storyProgress.textContent = `Card ${state.index + 1} of ${state.cards.length}`;
    el.saveBtn.classList.toggle('hidden', !isLast);
    el.saveBtn.textContent = state.saved ? 'Saved!' : 'Save these results';
    el.saveBtn.disabled = state.saved;
    el.saveStatus.textContent = state.saved ? 'Stored in your dashboard.' : '';
  };

  const startExperience = () => {
    el.storyIntro.classList.add('hidden');
    el.storyExperience.classList.remove('hidden');
    renderStoryCard();
  };

  const handleStart = async () => {
    if (state.loadingCards) return;
    state.loadingCards = true;
    setButtonState(el.startBtn, true, 'Show me the truth', 'Summoning the truth…');
    try {
      if (!state.cards.length) {
        try {
          const existing = await fetchStoryCards();
          if (existing.cards?.length) {
            state.cards = existing.cards;
            state.saved = true;
          }
        } catch {
          // ignore and fetch fresh story
        }
      }

      if (!state.cards.length) {
        const data = await requestStoryCards();
        state.cards = data.cards || [];
        state.saved = false;
      }

      if (!state.cards.length) {
        throw new Error('No story cards available yet. Try again later.');
      }

      state.index = 0;
      startExperience();
    } catch (error) {
      window.Unfakeable.setStatus(el.resultsMeta, error.message, 'error');
    } finally {
      state.loadingCards = false;
      setButtonState(el.startBtn, false, 'Show me the truth');
    }
  };

  const handleSave = async () => {
    if (state.saved || !state.cards.length) return;
    setButtonState(el.saveBtn, true, 'Save these results', 'Saving…');
    try {
      await saveStory(state.cards);
      state.saved = true;
      el.saveBtn.textContent = 'Saved!';
      el.saveStatus.textContent = 'Stored in your dashboard.';
    } catch (error) {
      window.Unfakeable.setStatus(el.saveStatus, error.message, 'error');
      setButtonState(el.saveBtn, false, 'Save these results');
    }
  };

  const refresh = async () => {
    try {
      const progress = await fetchProgress();
      if (progress.currentRatersCount >= progress.minRaters) {
        const results = await fetchResults();
        renderResultsShell(results);
      } else {
        renderWaiting(progress);
      }
    } catch (error) {
      window.Unfakeable.setStatus(el.resultsMeta, error.message, 'error');
    }
  };

  if (el.refreshBtn) {
    el.refreshBtn.addEventListener('click', (event) => {
      event.preventDefault();
      refresh();
    });
  }

  if (el.shareBtn) {
    el.shareBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = `/invite/${subjectId}`;
    });
  }

  if (el.startBtn) {
    el.startBtn.addEventListener('click', handleStart);
  }

  if (el.storyPrev) {
    el.storyPrev.addEventListener('click', () => {
      if (state.index > 0) {
        state.index -= 1;
        renderStoryCard();
      }
    });
  }

  if (el.storyNext) {
    el.storyNext.addEventListener('click', () => {
      if (!state.cards.length) return;
      if (state.index === state.cards.length - 1) {
        state.index = 0;
        el.storyExperience.classList.add('hidden');
        el.storyIntro.classList.remove('hidden');
        return;
      }
      state.index += 1;
      renderStoryCard();
    });
  }

  if (el.saveBtn) {
    el.saveBtn.addEventListener('click', handleSave);
  }

  refresh();
})();
