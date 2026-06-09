export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  documentsCount?: number;
  createdAt: string;
}

export interface Document {
  id: string;
  kbId: string;
  title: string;
  content: string;
  source: 'import' | 'crawler';
  sourceDetail: string;
  createdAt: string;
}

export interface CollectionTask {
  id: string;
  name: string;
  url: string;
  prompt: string;
  kbId: string;
  status: 'pending' | 'scraping' | 'completed' | 'failed' | 'cancelled';
  docsScrapedCount: number;
  logs: string[];
  createdAt: string;
  spaceId?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  extractedTraits: {
    tone: string;
    writingStyle: string;
    keywords: string[];
    samplePassage: string;
    rawAnalysis: string;
  };
  sourceKbIds: string[];
  createdAt: string;
}

export interface PersonaTask {
  id: string;
  name: string;
  kbIds: string[];
  status: 'pending' | 'extracting' | 'completed' | 'failed';
  personaId?: string;
  logs: string[];
  createdAt: string;
  spaceId?: string;
}

export interface CreationTask {
  id: string;
  type: 'topic' | 'direct';
  title: string;
  theme: string;
  kbDocIds: string[];
  personaId?: string;
  useWebSearch: boolean;
  status: 'pending' | 'suggesting' | 'researching' | 'writing' | 'completed' | 'failed' | 'cancelled';
  suggestedTopics?: string[];
  selectedTopic?: string;
  generatedContent?: string;
  createdAt: string;
  spaceId?: string;
}

export interface TaskSpace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  operationPermission?: {
    allowScraping: boolean;
    allowPersonaExtraction: boolean;
    allowContentCreation: boolean;
    allowDeletion: boolean;
    roleRequired: 'creator' | 'admin' | 'member';
  };
  dataPermission?: {
    visibility: 'isolated' | 'shared' | 'restricted';
    dataClassification: 'public' | 'internal' | 'confidential';
    allowedKBs: 'all' | 'associated' | 'none';
  };
}

export interface SpaceFolder {
  id: string;
  spaceId: string;
  name: string;
  createdAt: string;
}

export interface SpaceFile {
  id: string;
  spaceId: string;
  folderId?: string;
  title: string;
  content: string;
  sourceType: 'crawler' | 'creation' | 'manual';
  sourceId?: string;
  isArchived: boolean;
  archivedKbId?: string;
  createdAt: string;
}


