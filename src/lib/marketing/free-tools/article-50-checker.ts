export type Article50Answer = 'yes' | 'no' | 'unsure';

export type Article50ScenarioAnswers = {
  directInteraction?: Article50Answer;
  syntheticContent?: Article50Answer;
  emotionOrBiometric?: Article50Answer;
  deepfake?: Article50Answer;
  publicInterestText?: Article50Answer;
  humanEditorialReview?: Article50Answer;
};

export type Article50ReviewArea = {
  id: string;
  title: string;
  reason: string;
  nextStep: string;
  signal: 'review' | 'clarify';
};

export type Article50Result = {
  reviewAreas: Article50ReviewArea[];
  clearNoSignals: number;
  needsQualifiedReview: boolean;
};

export function evaluateArticle50Scenarios(answers: Article50ScenarioAnswers): Article50Result {
  const reviewAreas: Article50ReviewArea[] = [];

  if (answers.directInteraction === 'yes') {
    reviewAreas.push({
      id: 'direct-interaction',
      title: 'Direct AI interaction',
      reason: 'Direct interaction with an AI system can trigger a transparency review under Article 50 depending on scope and context.',
      nextStep: 'Document the interaction, your role, the user-facing disclosure and any relevant exception before relying on the control.',
      signal: 'review',
    });
  } else if (answers.directInteraction === 'unsure') {
    reviewAreas.push({
      id: 'direct-interaction-clarify',
      title: 'Clarify whether users interact directly with AI',
      reason: 'The interaction model is not clear enough to route the transparency review.',
      nextStep: 'Map the user journey and identify where a natural person interacts directly with the AI system.',
      signal: 'clarify',
    });
  }

  if (answers.syntheticContent === 'yes') {
    reviewAreas.push({
      id: 'synthetic-content',
      title: 'AI-generated or manipulated content',
      reason: 'Synthetic content can require a review of provider-side marking and detectability duties under Article 50.',
      nextStep: 'Identify content types, your role in the value chain and how machine-readable marking or related controls are handled.',
      signal: 'review',
    });
  } else if (answers.syntheticContent === 'unsure') {
    reviewAreas.push({
      id: 'synthetic-content-clarify',
      title: 'Clarify synthetic-content output',
      reason: 'You indicated uncertainty about whether the system generates or manipulates covered content.',
      nextStep: 'Inventory output types and identify whether audio, image, video or text is generated or manipulated by the system.',
      signal: 'clarify',
    });
  }

  if (answers.emotionOrBiometric === 'yes') {
    reviewAreas.push({
      id: 'emotion-biometric',
      title: 'Emotion recognition or biometric categorisation',
      reason: 'Deployers using certain emotion-recognition or biometric-categorisation systems have specific transparency considerations.',
      nextStep: 'Escalate the use case for qualified legal review and document how affected people are informed where required.',
      signal: 'review',
    });
  } else if (answers.emotionOrBiometric === 'unsure') {
    reviewAreas.push({
      id: 'emotion-biometric-clarify',
      title: 'Clarify biometric or emotion-recognition functionality',
      reason: 'The functionality is not clear enough to determine the appropriate review path.',
      nextStep: 'Confirm the system capabilities and intended use before proceeding with transparency conclusions.',
      signal: 'clarify',
    });
  }

  if (answers.deepfake === 'yes') {
    reviewAreas.push({
      id: 'deepfake',
      title: 'Deepfake disclosure review',
      reason: 'Deployers of systems generating or manipulating deepfake content can have disclosure duties under Article 50.',
      nextStep: 'Document the content workflow, publication context, responsible deployer and the disclosure approach.',
      signal: 'review',
    });
  } else if (answers.deepfake === 'unsure') {
    reviewAreas.push({
      id: 'deepfake-clarify',
      title: 'Clarify deepfake exposure',
      reason: 'The content workflow may involve realistic generated or manipulated media but the facts are incomplete.',
      nextStep: 'Review the generated/manipulated media and intended publication context with qualified counsel if needed.',
      signal: 'clarify',
    });
  }

  if (answers.publicInterestText === 'yes' && answers.humanEditorialReview !== 'yes') {
    reviewAreas.push({
      id: 'public-interest-text',
      title: 'Public-interest text review',
      reason: 'Certain AI-generated or manipulated text published to inform the public on matters of public interest can require disclosure, subject to scope and exceptions.',
      nextStep: 'Document editorial review, publication purpose and the transparency measure before treating the workflow as resolved.',
      signal: answers.humanEditorialReview === 'unsure' ? 'clarify' : 'review',
    });
  } else if (answers.publicInterestText === 'unsure') {
    reviewAreas.push({
      id: 'public-interest-text-clarify',
      title: 'Clarify public-interest publication',
      reason: 'The publication purpose and editorial-control facts are incomplete.',
      nextStep: 'Confirm whether the text is published to inform the public on a matter of public interest and whether it receives human editorial review.',
      signal: 'clarify',
    });
  }

  const clearNoSignals = Object.values(answers).filter((answer) => answer === 'no').length;
  return {
    reviewAreas,
    clearNoSignals,
    needsQualifiedReview: reviewAreas.some((area) => area.signal === 'review'),
  };
}
