export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  name?: string;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  path: string;
  messages: Message[];
  sharePath?: string;
}

export interface CCDResult {
  userId: string;
  chatId: string;
  createdAt: Date;
  checkedHelpless: {
    id: string;
    label: string;
  }[];
  checkedUnlovable: {
    id: string;
    label: string;
  }[];
  checkedWorthless: {
    id: string;
    label: string;
  }[];
  intermediateBelief: string;
  intermediateBeliefDepression: string;
  copingStrategies: string;
  situation: string;
  autoThought: string;
  checkedEmotion: {
    id: string;
    label: string;
  }[];
  behavior: string;
}

export interface CCDTruth {
  userId: string;
  chatId: string;
  createdAt: Date;
  relatedHistory: string;
  Helpless: string[];
  Unlovable: string[];
  Worthless: string[];
  intermediateBelief: string;
  intermediateBeliefDepression: string;
  copingStrategies: string;
  situation: string;
  autoThought: string;
  Emotion: string[];
  behavior: string;
}

export interface Session {
  user: {
    id: string;
  }
}

export interface User {
  id: string;
}
