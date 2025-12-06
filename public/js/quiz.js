(function () {
  const state = {
    quiz: null,
    mode: 'self',
    subjectId: null,
    subjectName: null,
    submitting: false,
  };

  const selectors = {
    mode: document.getElementById('quiz-mode'),
    heading: document.getElementById('quiz-heading'),
    subtitle: document.getElementById('quiz-subtitle'),
    form: document.getElementById('quiz-form'),
    nameField: document.getElementById('name-field'),
    nameInput: document.getElementById('displayName'),
    wordMaps: document.getElementById('word-maps'),
    items: document.getElementById('items'),
    submitBtn: document.getElementById('submit-btn'),
    message: document.getElementById('form-message'),
    successPanel: document.getElementById('quiz-success'),
    successTitle: document.getElementById('success-title'),
    successBody: document.getElementById('success-body'),
  };

  const init = async () => {
    if (!selectors.form) return;

    state.mode = window.location.pathname.includes('/quiz/rater/') ? 'rater' : 'self';
    state.subjectId = state.mode === 'rater' ? window.Unfakeable.getSubjectIdFromPath() : null;

    try {
      await loadQuiz();

      if (state.mode === 'rater' && state.subjectId) {
        await loadSubjectMeta();
      }

      renderQuiz();
      selectors.form.addEventListener('submit', handleSubmit);
    } catch (error) {
      window.Unfakeable.setStatus(selectors.message, error.message, 'error');
    }
  };

  const loadQuiz = async () => {
    const response = await fetch('/api/quiz');
    if (!response.ok) {
      throw new Error('Unable to load quiz right now.');
    }

    const data = await response.json();
    state.quiz = data.quiz;
  };

  const loadSubjectMeta = async () => {
    const response = await fetch(`/api/progress/${state.subjectId}`);
    if (!response.ok) {
      throw new Error('We couldn\'t load this subject. Check the invite link.');
    }

    const data = await response.json();
    state.subjectName = data.subjectName;
  };

  const renderQuiz = () => {
    selectors.mode.textContent = state.mode === 'self' ? 'Subject mode' : 'Rater mode';
    selectors.heading.textContent =
      state.mode === 'self'
        ? 'How do you see yourself?'
        : state.subjectName
        ? `You’re rating ${state.subjectName}`
        : 'Rate your friend';

    selectors.subtitle.textContent =
      state.mode === 'self'
        ? 'First you answer for yourself. Then share your link to gather outside perception.'
        : 'Answer honestly based on how they usually are, not how they want to be seen.';

    selectors.nameField.classList.toggle('hidden', state.mode !== 'self');
    selectors.submitBtn.textContent = state.mode === 'self' ? 'Save & get invite link' : 'Submit rating';

    renderWordMaps();
    renderAxisSections();
  };

  const renderWordMaps = () => {
    selectors.wordMaps.innerHTML = '';
    state.quiz.word_maps.forEach((wordMap) => {
      const section = document.createElement('section');
      section.className = 'card word-map';
      section.innerHTML = `
        <div class="word-map__header">
          <h2>${wordMap.title}</h2>
          <p>${state.mode === 'self' ? wordMap.description_self : wordMap.description_rater}</p>
        </div>
        <div class="word-map__options"></div>
      `;

      const optionsHost = section.querySelector('.word-map__options');
      wordMap.options.forEach((option) => {
        const optionId = `${wordMap.id}-${option.id}`;
        const label = document.createElement('label');
        label.className = 'chip';
        label.htmlFor = optionId;
        label.textContent = option.label;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = `wordMap-${wordMap.id}`;
        input.value = option.id;
        input.id = optionId;
        input.dataset.wordMapId = wordMap.id;
        input.addEventListener('change', () => handleWordMapSelection(wordMap, optionId));

        label.prepend(input);
        optionsHost.appendChild(label);
      });

      selectors.wordMaps.appendChild(section);
    });
  };

  const handleWordMapSelection = (wordMap, optionId) => {
    const inputs = Array.from(document.querySelectorAll(`input[name="wordMap-${wordMap.id}"]`));
    const checked = inputs.filter((input) => input.checked);

    if (checked.length > wordMap.max_choices) {
      const current = document.getElementById(optionId);
      if (current) current.checked = false;
      window.Unfakeable.setStatus(
        selectors.message,
        `You can only choose ${wordMap.max_choices} words for ${wordMap.title}.`,
        'warning',
      );
    } else {
      window.Unfakeable.setStatus(selectors.message, '');
    }
  };

  const renderAxisSections = () => {
    selectors.items.innerHTML = '';
    state.quiz.axes.forEach((axis) => {
      const axisSection = document.createElement('section');
      axisSection.className = 'card axis-section';
      axisSection.innerHTML = `
        <div class="axis-section__header">
          <h3>${axis.name}</h3>
          <p>${axis.description}</p>
        </div>
      `;

      const axisItems = state.quiz.items.filter((item) => item.axis_id === axis.id);
      axisItems.forEach((item) => {
        axisSection.appendChild(renderLikertField(item));
      });

      selectors.items.appendChild(axisSection);
    });
  };

  const renderLikertField = (item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'likert-field';
    const questionId = `item-${item.id}`;
    wrapper.innerHTML = `<p>${state.mode === 'self' ? item.self_text : item.rater_text}</p>`;

    const scale = document.createElement('div');
    scale.className = 'likert-scale';

    state.quiz.scale.values.forEach((value, index) => {
      const inputId = `${questionId}-${value}`;
      const label = document.createElement('label');
      label.htmlFor = inputId;
      label.textContent = state.quiz.scale.labels[index];

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = questionId;
      input.value = value;
      input.id = inputId;

      label.prepend(input);
      scale.appendChild(label);
    });

    wrapper.appendChild(scale);
    return wrapper;
  };

  const collectWordMapAnswers = () => {
    const answers = {};
    state.quiz.word_maps.forEach((wordMap) => {
      const selected = Array.from(document.querySelectorAll(`input[name="wordMap-${wordMap.id}"]:checked`)).map(
        (input) => input.value,
      );
      answers[wordMap.id] = selected;
    });
    return answers;
  };

  const collectItemAnswers = () => {
    const answers = {};
    const missing = [];

    state.quiz.items.forEach((item) => {
      const fieldName = `item-${item.id}`;
      const selected = document.querySelector(`input[name="${fieldName}"]:checked`);
      if (!selected) {
        missing.push(item.id);
      } else {
        answers[item.id] = Number(selected.value);
      }
    });

    return { answers, missing };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (state.submitting) return;

    const payload = {
      wordMaps: collectWordMapAnswers(),
      items: {},
    };

    if (state.mode === 'self') {
      const name = selectors.nameInput.value.trim();
      if (!name) {
        return window.Unfakeable.setStatus(selectors.message, 'Please enter your display name.', 'error');
      }
      payload.name = name;
    }

    const { answers, missing } = collectItemAnswers();
    if (missing.length) {
      return window.Unfakeable.setStatus(
        selectors.message,
        'Please answer all statements before submitting.',
        'error',
      );
    }
    payload.items = answers;

    state.submitting = true;
    selectors.submitBtn.disabled = true;
    window.Unfakeable.setStatus(selectors.message, 'Submitting…', 'info');

    try {
      const endpoint = state.mode === 'self' ? '/api/self' : `/api/rater/${state.subjectId}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit right now.');
      }

      if (state.mode === 'self') {
        window.Unfakeable.saveSubjectSession({
          subjectId: data.subjectId,
          name: payload.name,
        });
        window.location.href = `/invite/${data.subjectId}`;
      } else {
        selectors.form.classList.add('hidden');
        selectors.successPanel.classList.remove('hidden');
        selectors.successTitle.textContent = 'All set';
        selectors.successBody.textContent = data.message || 'Thanks for your input!';
      }
    } catch (error) {
      window.Unfakeable.setStatus(selectors.message, error.message, 'error');
    } finally {
      state.submitting = false;
      selectors.submitBtn.disabled = false;
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
