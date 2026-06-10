import fs from "fs";
import path from "path";

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
  createdAt: string;
}

export interface Document {
  id: string;
  kbId: string;
  title: string;
  content: string;
  source: 'import' | 'crawler';
  sourceDetail: string; // File name or Website URL
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
  spaceId?: string; // Associated task space
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
  spaceId?: string; // Associated task space
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
  spaceId?: string; // Associated task space
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

export interface DB {
  chats: Chat[];
  knowledgeBases: KnowledgeBase[];
  documents: Document[];
  collectionTasks: CollectionTask[];
  personas: Persona[];
  personaTasks: PersonaTask[];
  creationTasks: CreationTask[];
  spaces?: TaskSpace[];
  spaceFolders?: SpaceFolder[];
  spaceFiles?: SpaceFile[];
}


const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Helper to seed initial data
const getInitialData = (): DB => {
  const kbs: KnowledgeBase[] = [
    {
      id: "kb-1",
      name: "科幻小说创作素材库",
      description: "包含硬科幻设定、高维空间概念、宇宙社会学法则以及前沿物理假说等高端科幻素材。",
      createdAt: new Date("2026-05-01T08:00:00Z").toISOString()
    },
    {
      id: "kb-2",
      name: "深思科技前沿产品白皮书",
      description: "关于深思科技新一代人工智能、智能硬件与具身流系统的官方规划、参数指标及设计愿景。",
      createdAt: new Date("2026-05-15T12:00:00Z").toISOString()
    }
  ];

  const docs: Document[] = [
    {
      id: "doc-1-1",
      kbId: "kb-1",
      title: "高维空间泡沫假说",
      content: "高维空间泡沫理论认为我们的三维宇宙是漂浮在十一维超空间中的一个各向同性的薄膜。当高维能量涟漪扫过该薄膜时，物理常量会在局部产生微小漂移。在此漂移带中，光速可能会略高于或低于常态值，造成时空曲率突变。可以作为飞船超限航行的引擎原理假说。",
      source: "import",
      sourceDetail: "11_Dimensional_Space_Hypothesis.txt",
      createdAt: new Date("2026-05-01T08:30:00Z").toISOString()
    },
    {
      id: "doc-1-2",
      kbId: "kb-1",
      title: "宇宙黑暗森林社会学底论",
      content: "宇宙黑暗森林模型核心前提：第一，生存是文明的第一需要；第二，文明不断增长和扩张，但宇宙中的物质总量保持不变。当两方相遇时，猜疑链和技术爆炸使得安全沟通绝无可能。每一个未暴露的文明都是带枪的猎人，一旦发现其他生命迹象，最理性的自保策略便是毫不犹豫地实行歼灭性打击。",
      source: "crawler",
      sourceDetail: "https://zh.wikipedia.org/wiki/黑暗森林法则",
      createdAt: new Date("2026-05-02T10:15:00Z").toISOString()
    },
    {
      id: "doc-2-1",
      kbId: "kb-2",
      title: "深思 AI-Agent 认知引擎 v3 说明书",
      content: "深思认知引擎 v3 拥有百亿级轻量化推理网络，支持全端侧多模态流式交互。创新引入了‘情境反馈网’，确保在低网络或零网络状态下实现流畅的主动感知服务。相较于传统微调，其对上下文检索时效性提升了 130%，多轮长文本对话记忆完整度高达 95%。",
      source: "import",
      sourceDetail: "DeepThought_v3_UserGuide.pdf",
      createdAt: new Date("2026-05-15T14:20:00Z").toISOString()
    }
  ];

  const personas: Persona[] = [
    {
      id: "persona-1",
      name: "刘慈欣冷峻科幻风",
      description: "擅长使用宏大叙事、冷峻克制、富有诗意的科学物理词汇，关注宇宙尺度和文明宿命。",
      extractedTraits: {
        tone: "理智、庄严、冷峻、充满宇宙级别的孤独和宏伟感。",
        writingStyle: "大量使用前沿物理学、天文学、宇宙学名词，句式厚重结实，情感极其克制。擅长在极冷酷的技术规则中流露出对人类命运的浩渺诗意。",
        keywords: ["坍缩", "时空曲率", "光速限制", "文明宿命", "纪元", "冷酷", "尺度"],
        samplePassage: "警报在万分之一微秒内传遍了整艘飞船，但这毫无意义。在这个绝对零度的维度废墟里，恒星的余晖犹如干枯的脉络，在宇宙冰冷的裹尸布上涂抹出最后的枯黄色。文明，这个自诩高贵的词汇，在光速坍缩的铁律面前，仅仅是深渊边缘滑落的一粒沙尘。",
        rawAnalysis: "该人格特征来自于大范围科幻文本。句式多为长句或转折关联词，常将极其渺小的个体置于极庞大、冰冷、超脱的宇宙自然规律之下，形成戏剧性反差。极少使用现代网络流俗用语，对名词要求精确，修辞具有高度的工业和学术美感。"
      },
      sourceKbIds: ["kb-1"],
      createdAt: new Date("2026-05-03T09:00:00Z").toISOString()
    },
    {
      id: "persona-2",
      name: "互联网自媒体爆款写手",
      description: "擅长撰写直击痛点、情绪价值饱满、段落短小精炼、具有极强互动和号召力的朋友圈及公众号文案。",
      extractedTraits: {
        tone: "热情、充满活力、具有煽动性、口语化但洞察精准、略带侵略性。",
        writingStyle: "多短句、高频使用情绪助词与动词、强调用双重否定或排比强调核心观点。结尾带有极强的社交互动与‘催促感’。",
        keywords: ["颠覆", "底层逻辑", "信息差", "痛点", "核心资产", "焦虑", "闭环"],
        samplePassage: "听懂了吗？这才是真正的认知红利！99%的人都在拼体力，而极少数人早就靠‘信息差’赚到了核心资产。深思科技这次的新产品，直接打破了以往所有的局限，这就是属于你的低门槛红利期，错过了就是一辈子！赶紧留言聊聊你的行业！",
        rawAnalysis: "高频运用心理暗示，迎合焦虑与成长欲望。排版上使用极多换行、感叹号，文风追求快速、高密度地向读者灌输观点，制造‘闭环’和‘认同’。"
      },
      sourceKbIds: ["kb-2"],
      createdAt: new Date("2026-05-16T15:00:00Z").toISOString()
    }
  ];

  return {
    chats: [
      {
        id: "chat-1",
        title: "关于高维飞船引擎的技术讨论",
        messages: [
          {
            id: "m-1",
            role: "user",
            content: "我们的飞船如果驶入高维空间漂移带，需要做哪些预备防护？",
            timestamp: new Date("2026-05-04T12:00:00Z").toISOString()
          },
          {
            id: "m-2",
            role: "model",
            content: "在刘慈欣冷峻科幻风格下：\n\n驶入高维时空漂移带的瞬间，最致命的敌人并非高维物质本身，而是低维物理常数在局部的失稳。\n\n飞船必须作好以下预备防护：\n\n1. **曲率谐振器完全离线**：时空强度的波动会让处于曲率驱动中的超空胞发生热寂崩溃。必须将驱动核退回至普通核聚变简并态以作物理隔离。\n2. **原子核强相互作用锁定**：漂移带内的强相互作用常数会有 0.04% 的瞬时偏差。如果没有超材料的磁场稳固，强相互作用材料（如水滴外壳）将在数毫秒内解体为纯粹的质子星云。\n3. **降维感知防护**：乘员需进入脑神经深低温休眠状态。三维意识直面高维空间投影将产生过载性脑神经元坏死，他们会在惊骇的外显全维视觉中彻底丧失逻辑理智。",
            timestamp: new Date("2026-05-04T12:01:00Z").toISOString()
          }
        ],
        createdAt: new Date("2026-05-04T12:00:00Z").toISOString()
      }
    ],
    knowledgeBases: kbs,
    documents: docs,
    collectionTasks: [],
    personas: personas,
    personaTasks: [],
    creationTasks: [],
    spaces: [
      {
        id: "space-default",
        name: "默认工作空间",
        description: "这是一个为您自动创建的默认工作空间，用于快速开始您的智能写作与资料管理。",
        createdAt: new Date("2026-05-01T00:00:00Z").toISOString(),
        operationPermission: {
          allowScraping: true,
          allowPersonaExtraction: true,
          allowContentCreation: true,
          allowDeletion: false,
          roleRequired: 'member'
        },
        dataPermission: {
          visibility: 'isolated',
          dataClassification: 'internal',
          allowedKBs: 'all'
        }
      },
      {
        id: "space-1",
        name: "科幻世界宇宙观构建",
        description: "本空间致力于萃取庄严冷峻的硬科幻文风，采集前沿物理与社会学基础，撰写宏大的星系纪元史诗。",
        createdAt: new Date("2026-05-01T08:00:00Z").toISOString(),
        operationPermission: {
          allowScraping: true,
          allowPersonaExtraction: true,
          allowContentCreation: true,
          allowDeletion: true,
          roleRequired: 'member'
        },
        dataPermission: {
          visibility: 'isolated',
          dataClassification: 'internal',
          allowedKBs: 'all'
        }
      },
      {
        id: "space-2",
        name: "前沿科技自媒体产品推介",
        description: "本空间用于采集深思科技等硬核参数，提炼爆款自媒体写作语气，进行痛点痛苦呈现和颠覆性营销文案创作。",
        createdAt: new Date("2026-05-15T12:00:00Z").toISOString(),
        operationPermission: {
          allowScraping: true,
          allowPersonaExtraction: true,
          allowContentCreation: true,
          allowDeletion: true,
          roleRequired: 'member'
        },
        dataPermission: {
          visibility: 'isolated',
          dataClassification: 'internal',
          allowedKBs: 'all'
        }
      }
    ],
    spaceFolders: [],
    spaceFiles: []
  };
};

export class LocalDB {
  static get(): DB {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }

    try {
      const data = fs.readFileSync(DB_FILE, "utf8");
      const db = JSON.parse(data) as DB;
      
      // Auto-migrate if spaces array is missing or empty
      if (!db.spaces || db.spaces.length === 0) {
        db.spaces = [
          {
            id: "space-1",
            name: "科幻世界宇宙观构建",
            description: "本空间致力于萃取庄严冷峻的硬科幻文风，采集前沿物理与社会学基础，撰写宏大的星系纪元史诗。",
            createdAt: new Date("2026-05-01T08:00:00Z").toISOString(),
            operationPermission: {
              allowScraping: true,
              allowPersonaExtraction: true,
              allowContentCreation: true,
              allowDeletion: true,
              roleRequired: 'member'
            },
            dataPermission: {
              visibility: 'isolated',
              dataClassification: 'internal',
              allowedKBs: 'all'
            }
          },
          {
            id: "space-2",
            name: "前沿科技自媒体产品推介",
            description: "本空间用于采集深思科技等硬核参数，提炼爆款自媒体写作语气，进行痛点痛苦呈现和颠覆性营销文案创作。",
            createdAt: new Date("2026-05-15T12:00:00Z").toISOString(),
            operationPermission: {
              allowScraping: true,
              allowPersonaExtraction: true,
              allowContentCreation: true,
              allowDeletion: true,
              roleRequired: 'member'
            },
            dataPermission: {
              visibility: 'isolated',
              dataClassification: 'internal',
              allowedKBs: 'all'
            }
          }
        ];
        
        // Ensure any pre-existing tasks without spaceId are defaulted to space-1 so they don't get lost
        if (db.collectionTasks) {
          db.collectionTasks.forEach(t => { if (!t.spaceId) t.spaceId = "space-1"; });
        }
        if (db.personaTasks) {
          db.personaTasks.forEach(t => { if (!t.spaceId) t.spaceId = "space-1"; });
        }
        if (db.creationTasks) {
          db.creationTasks.forEach(t => { if (!t.spaceId) t.spaceId = "space-1"; });
        }
        
        this.save(db);
      }

      // Make sure all individual spaces have operationPermission and dataPermission fields populated
      if (db.spaces && db.spaces.length > 0) {
        let changed = false;
        db.spaces.forEach(s => {
          if (!s.operationPermission) {
            s.operationPermission = {
              allowScraping: true,
              allowPersonaExtraction: true,
              allowContentCreation: true,
              allowDeletion: true,
              roleRequired: 'member'
            };
            changed = true;
          }
          if (!s.dataPermission) {
            s.dataPermission = {
              visibility: 'isolated',
              dataClassification: 'internal',
              allowedKBs: 'all'
            };
            changed = true;
          }
        });
        if (changed) {
          this.save(db);
        }
      }

      // Maintain database arrays and migrate data to SpaceFolders & SpaceFiles
      let dbChanged = false;
      if (!db.spaceFolders) {
        db.spaceFolders = [];
        dbChanged = true;
      }
      if (!db.spaceFiles) {
        db.spaceFiles = [];
        dbChanged = true;
      }

      // Seed default directories for pre-existing spaces if spaceFolders is empty
      if (db.spaces && db.spaces.length > 0 && db.spaceFolders.length === 0) {
        db.spaces.forEach(s => {
          db.spaceFolders!.push({
            id: `folder-scraped-${s.id}`,
            spaceId: s.id,
            name: "数据采集成果",
            createdAt: new Date().toISOString()
          });
          db.spaceFolders!.push({
            id: `folder-creation-${s.id}`,
            spaceId: s.id,
            name: "智能创作成文",
            createdAt: new Date().toISOString()
          });
        });
        dbChanged = true;
      }

      // Ensure existing completed creation tasks have a file
      if (db.creationTasks && db.creationTasks.length > 0) {
        db.creationTasks.forEach(t => {
          if (t.status === 'completed' && t.generatedContent) {
            const hasFile = db.spaceFiles!.some(f => f.sourceId === t.id && f.sourceType === 'creation');
            if (!hasFile) {
              db.spaceFiles!.push({
                id: `file-creation-${t.id}`,
                spaceId: t.spaceId || "space-1",
                folderId: `folder-creation-${t.spaceId || "space-1"}`,
                title: t.title,
                content: t.generatedContent,
                sourceType: 'creation',
                sourceId: t.id,
                isArchived: false,
                createdAt: t.createdAt || new Date().toISOString()
              });
              dbChanged = true;
            }
          }
        });
      }

      // Ensure existing completed scraper/crawler tasks have matching files in the space file list
      if (db.collectionTasks && db.collectionTasks.length > 0) {
        db.collectionTasks.forEach(t => {
          if (t.status === 'completed') {
            const hasFilesForTask = db.spaceFiles!.some(f => f.sourceId === t.id && f.sourceType === 'crawler');
            if (!hasFilesForTask) {
              const matchingDocs = db.documents.filter(doc => doc.kbId === t.kbId && doc.source === 'crawler' && doc.sourceDetail === t.url);
              matchingDocs.forEach((doc, idx) => {
                db.spaceFiles!.push({
                  id: `file-crawl-${doc.id}`,
                  spaceId: t.spaceId || "space-1",
                  folderId: `folder-scraped-${t.spaceId || "space-1"}`,
                  title: doc.title,
                  content: doc.content,
                  sourceType: 'crawler',
                  sourceId: t.id,
                  isArchived: true,
                  archivedKbId: t.kbId,
                  createdAt: doc.createdAt || t.createdAt || new Date().toISOString()
                });
                dbChanged = true;
              });
            }
          }
        });
      }

      if (dbChanged) {
        this.save(db);
      }
      
      return db;
    } catch (e) {
      console.error("Failed to parse DB file, returning empty seed", e);
      return getInitialData();
    }
  }

  static save(data: DB): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  }

  // Generic helpers
  static update(callback: (db: DB) => void): DB {
    const db = this.get();
    callback(db);
    this.save(db);
    return db;
  }
}
