const OpenAI = require('openai');
const quizService = require('../services/quizService');
const userService = require('../services/userService');
const scoringService = require('../services/scoringService');
const storyModel = require('../models/storyModel');

const openai = (() => {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey
    ? new OpenAI({
        apiKey,
      })
    : null;
})();

const getResults = (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const subject = userService.getSubject(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const raterCount = userService.getRaterCount(subjectId);
    if (raterCount < quizService.MIN_RATERS) {
      return res.status(400).json({
        message: 'Not enough responses yet.',
        currentRatersCount: raterCount,
        minRaters: quizService.MIN_RATERS,
        targetRaters: quizService.TARGET_RATERS,
      });
    }

    const results = scoringService.buildResultsPayload(subject);
    return res.json({
      ...results,
      minRaters: quizService.MIN_RATERS,
      targetRaters: quizService.TARGET_RATERS,
    });
  } catch (error) {
    return next(error);
  }
};

const buildPrompt = (results) => {
  const axisLines = results.axisComparisons
    .map(
      (axis) =>
        `- ${axis.axisName}: self=${axis.selfAvg ?? 'n/a'} others=${axis.othersAvg ?? 'n/a'} gap=${axis.gap ?? 0} (${axis.gapPercent ?? 0}%), description=${axis.description}`,
    )
    .join('\n');

  const wordLines = results.wordMapComparisons
    .map(
      (word) =>
        `- ${word.title}: self=${word.selfWords.map((w) => w.label).join(', ') || 'none'} | topRaters=${word.topRaterWords
          .map((w) => `${w.label} (${w.count || 0})`)
          .join(', ') || 'none'} | shared=${word.sharedWords.map((w) => w.label).join(', ') || 'none'}`,
    )
    .join('\n');

  return `You are a laid-back, call-it-like-it-is narrator turning perception gaps into bold, shareable cards. 
  Your job is to analyze data from the Unfakeable Personality Quiz. Keep the tone modern, punchy, kind, and specific. 
  Say "you" instead of "they" or "the subject". 
  About the quiz: 
  - It compares how someone sees themselves versus how others see them. 
  - It highlights perception gaps, blind spots, and alignments. 
  - The goal is to give people an honest, entertaining readout of how they come across. 
  - Subjects first filled out the quiz about themselves, then shared with their inner circle, who filled out the quiz about the subject. 
  - The data below summarizes the key perception gaps and word-map insights. 
  
  Subject name: ${results.subject.name} 
  
  Axis data: ${axisLines} 
  Word map summaries: ${wordLines} 
  Instructions: 
  - Produce 10-12 cards. 
  - Use numbers or percentages when relevant, but NEVER mention vote counts. 
  - Each card must feel unique (mix hype, reality checks, surprises, affirmations). 
  - Reference word-map insights in at least two cards. 
  - Vary sentence structure and length for rhythm. Do not start every sentence the same way. Do not reference scores in the same style every sentence. 
  - Vary stats and percentages in the body when referencing data (sometimes, reference percentage differences, while other times referencing point differences). 
  - Vary the style of each title (questions, statements, puns). 
  - Keep every card anonymous, framed in second person voice. 
  - Make sure to actually match the narrative with the data—if a gap is small, don’t hype it up as a big blind spot. Generally, anything under a 15% gap is negligible and should be seen as an alignment rather than a gap. 
  - Do not suggest what to do or how to improve, just describe the truth. 
  - Balance entertainment and honesty, leaning into humor or wit where it fits. 
  - Output valid JSON EXACTLY matching this format (no additional keys, comments, or text): 
  { "cards": 
   [ 
  { 
   "eyebrow": "Short label like \\"Social Energy\\"", 
   "title": "Punchy title like \\"Life of the Party\\"", 
   "body": "1-2 lively sentences weaving in the stats or adjectives.", 
   "meta": "A short supporting line that can include self vs others averages, e.g., \\"You rated it 2.1 / 5 · They averaged 4.6 / 5\\"" 
   }, 
   { 
   "eyebrow": "...", 
   "title": "...", 
   "body": "...", 
   "meta": "..." 
   } 
   ] 
   }`;


};

const generateStoryCards = async (req, res, next) => {
  try {
    if (!openai) {
      return res.status(500).json({ message: 'Missing OpenAI API key.' });
    }

    const { subjectId } = req.params;
    const subject = userService.getSubject(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const raterCount = userService.getRaterCount(subjectId);
    if (raterCount < quizService.MIN_RATERS) {
      return res.status(400).json({ message: 'Not enough responses yet.' });
    }

    const results = scoringService.buildResultsPayload(subject);
    const prompt = buildPrompt(results);

    const response = await openai.responses.create({
      model: 'gpt-5.1',
      input: prompt,
    });

    let cards = [];
    try {
      const parsed = JSON.parse(response.output_text || '{}');
      cards = parsed.cards || [];
    } catch (error) {
      return res.status(502).json({ message: 'Invalid response format from AI.' });
    }

    if (!cards.length) {
      return res.status(502).json({ message: 'AI did not return any cards.' });
    }

    storyModel.saveStory(subjectId, cards);
    return res.json({ cards });
  } catch (error) {
    return next(error);
  }
};

const getStoryCards = (req, res) => {
  const { subjectId } = req.params;
  const story = storyModel.getStory(subjectId);
  if (!story || !story.cards.length) {
    return res.status(404).json({ message: 'No saved story yet.' });
  }

  return res.json(story);
};

const saveStoryCards = (req, res) => {
  const { subjectId } = req.params;
  const { cards } = req.body || {};
  if (!Array.isArray(cards) || !cards.length) {
    return res.status(400).json({ message: 'Cards payload required.' });
  }

  storyModel.saveStory(subjectId, cards);
  return res.json({ success: true });
};

module.exports = {
  getResults,
  generateStoryCards,
  getStoryCards,
  saveStoryCards,
};
