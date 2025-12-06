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
  let subjectName = '';

  if (!subjectId) return;

  const updateProgress = async () => {
    try {
      const response = await fetch(`/api/progress/${subjectId}`);
      if (!response.ok) {
        throw new Error('Unable to load progress.');
      }

      const data = await response.json();
      subjectName = data.subjectName || '';
      const titleName = subjectName || 'this';
      document.title = `Fill out ${titleName}'s Form | UPT`;
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
        title: subjectName ? `Fill out ${subjectName}'s Form | UPT` : 'Fill out this form | UPT',
        text: 'Tell the truth—how do they really show up?',
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
