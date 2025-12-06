(function () {
  const subjectId = window.Unfakeable.getSubjectIdFromPath();
  const inviteInput = document.getElementById('invite-link');
  const copyBtn = document.getElementById('copy-link');
  const shareBtn = document.getElementById('share-link');
  const feedback = document.getElementById('copy-feedback');
  const progressCount = document.getElementById('progress-count');
  const progressTarget = document.getElementById('progress-target');
  const progressFill = document.getElementById('progress-fill');
  const progressHint = document.getElementById('progress-hint');
  const resultsBtn = document.getElementById('results-btn');
  const inviteCodeEl = document.getElementById('invite-code');

  if (!subjectId) return;

  const updateProgress = async () => {
    try {
      const response = await fetch(`/api/progress/${subjectId}`);
      if (!response.ok) {
        throw new Error('Unable to load progress.');
      }

      const data = await response.json();
      progressCount.textContent = data.currentRatersCount;
      progressTarget.textContent = data.targetRaters;
      progressHint.textContent = `You need at least ${data.minRaters} responses to unlock your results.`;
      if (inviteCodeEl) {
        inviteCodeEl.textContent = data.inviteCode || subjectId;
      }

      const pct = Math.min(1, data.currentRatersCount / data.targetRaters) * 100;
      progressFill.style.width = `${pct}%`;

      if (inviteInput) {
        inviteInput.value = data.inviteUrl;
      }

      if (resultsBtn) {
        resultsBtn.href = `/results/${subjectId}`;
      }
    } catch (error) {
      window.Unfakeable.setStatus(feedback, error.message, 'error');
    }
  };

  const copyLink = async () => {
    if (!inviteInput || !inviteInput.value) return;
    try {
      await navigator.clipboard.writeText(inviteInput.value);
      window.Unfakeable.setStatus(feedback, 'Link copied to clipboard!', 'success');
    } catch (error) {
      window.Unfakeable.setStatus(feedback, 'Copy failed. Select and copy manually.', 'error');
    }
  };

  const shareLink = async () => {
    if (!navigator.share || !inviteInput.value) {
      return copyLink();
    }

    try {
      await navigator.share({
        title: 'Rate me on The Unfakeable Personality Test',
        text: 'How do you see me? Answer these quick prompts.',
        url: inviteInput.value,
      });
    } catch (error) {
      if (error && error.name !== 'AbortError') {
        copyLink();
      }
    }
  };

  if (copyBtn) {
    copyBtn.addEventListener('click', copyLink);
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', (event) => {
      event.preventDefault();
      shareLink();
    });
  }

  updateProgress();
  setInterval(updateProgress, 15000);
})();
