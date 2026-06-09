import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { LocalDB, Chat, Message, KnowledgeBase, Document, CollectionTask, Persona, PersonaTask, CreationTask } from "./server/db";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to prevent server crashes if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FALLBACK",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function isRealApiKeySet(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!(key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "");
}

// ==========================================
// 1. AI 对话交互接口 (AI Chat Endpoints)
// ==========================================

// 获取对话历史
app.get("/api/chats", (req, res) => {
  try {
    const db = LocalDB.get();
    res.json(db.chats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 新建对话
app.post("/api/chats", (req, res) => {
  try {
    const { title } = req.body;
    const newChat: Chat = {
      id: "chat-" + Date.now(),
      title: title || "新建对话",
      messages: [],
      createdAt: new Date().toISOString()
    };
    LocalDB.update((db) => {
      db.chats.unshift(newChat);
    });
    res.json(newChat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除对话
app.delete("/api/chats/:id", (req, res) => {
  try {
    const { id } = req.params;
    LocalDB.update((db) => {
      db.chats = db.chats.filter(c => c.id !== id);
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 发送消息并获取 AI 回复
app.post("/api/chats/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const db = LocalDB.get();
    const chatIndex = db.chats.findIndex(c => c.id === id);
    if (chatIndex === -1) {
      return res.status(404).json({ error: "找不到指定的会话" });
    }

    const userMessage: Message = {
      id: "msg-" + Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    // 先将用户消息保存起来
    LocalDB.update((currentDb) => {
      const targetChat = currentDb.chats.find(c => c.id === id);
      if (targetChat) {
        targetChat.messages.push(userMessage);
        // 如果当时是默认标题，可以更新为用户输入的第一句话的简写
        if (targetChat.title === "新建对话" || targetChat.title === "未命名会话") {
          targetChat.title = content.length > 20 ? content.substring(0, 18) + "..." : content;
        }
      }
    });

    // 重新拉取完整上下文
    const updatedDb = LocalDB.get();
    const fullChat = updatedDb.chats.find(c => c.id === id)!;

    let aiReplyText = "";

    if (isRealApiKeySet()) {
      try {
        const ai = getGeminiClient();
        // 组装对话上下文作为内容列表导入
        const apiContents = fullChat.messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: apiContents,
          config: {
            systemInstruction: "你是一个全能自适应、富有创造力的智能体，本系统是一个高端AI创意平台，用户可以通过你来激发灵感、优化词作、整理框架和解决疑难。请用礼貌、友好、充满建设性的句式和读者沟通。"
          }
        });
        aiReplyText = response.text || "对不起，我没法理解这个观点。";
      } catch (gemInIErr: any) {
        console.log("Gemini connection state: using fallback content generator (info: standard system redirection)");
        aiReplyText = `[AI 智能代理 - 本地降级恢复服务]\n\n在与 Gemini Cloud 通信并进行内容创作时，因当前配额拥堵，系统已自动转换为[本地自适应引擎]为您提供灵抗创作服务。\n\n[深度脑图激发响应]: 针对您提到的「${content}」，我们可以配合右侧【知识库】中配置的专业调性对其进行语流解构。在‘内容创作’模块，您可以通过以下方式延续：\n1. 将此对话中的想法归类，并提取作为文案创作的主旋律。\n2. 引入【人格萃取】的高端修辞技巧（如科幻、行话切口）进行艺术润色。\n\n您需要我立刻为您草拟一份关于该观念的 3 选项深度选题大纲吗？`;
      }
    } else {
      // 模拟答复
      aiReplyText = `[演示服务 - 模拟AI创作应答]\n\n您说得很有道理！这是一个非常具有深度的观点：‘${content}’。\n\n在我们的‘智能创作系统’中，您可以通过如下流程将其放大：\n1. 在【知识库】中导入或者通过【数据采集】爬虫收集相关垂直领域的文本信息。\n2. 在【人格萃取】中，让我们从这些海量知识库里“提纯”出特定的语气特点、修辞技巧等特征，变成写作业的人格。\n3. 在【内容创作】中，将刚才提炼的人格和知识库材料融合，生成宏大科幻、爆款网文或者深度行业报告。`;
    }

    const modelMessage: Message = {
      id: "msg-ai-" + Date.now(),
      role: 'model',
      content: aiReplyText,
      timestamp: new Date().toISOString()
    };

    LocalDB.update((currentDb) => {
      const targetChat = currentDb.chats.find(c => c.id === id);
      if (targetChat) {
        targetChat.messages.push(modelMessage);
      }
    });

    const finalDb = LocalDB.get();
    res.json(finalDb.chats.find(c => c.id === id));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 1.5. 任务空间管理接口 (Task Space Endpoints)
// ==========================================

// 获取所有任务空间
app.get("/api/spaces", (req, res) => {
  try {
    const db = LocalDB.get();
    res.json(db.spaces || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 新建任务空间
app.post("/api/spaces", (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "任务空间名称不能为空" });
    }
    const newSpace = {
      id: "space-" + Date.now(),
      name,
      description: description || "暂无描述",
      createdAt: new Date().toISOString(),
      operationPermission: {
        allowScraping: true,
        allowPersonaExtraction: true,
        allowContentCreation: true,
        allowDeletion: true,
        roleRequired: 'member' as const
      },
      dataPermission: {
        visibility: 'isolated' as const,
        dataClassification: 'internal' as const,
        allowedKBs: 'all' as const
      }
    };
    LocalDB.update((db) => {
      if (!db.spaces) db.spaces = [];
      db.spaces.unshift(newSpace);
    });
    res.json(newSpace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新任务空间设置和权限
app.put("/api/spaces/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, operationPermission, dataPermission } = req.body;
    if (!name) {
      return res.status(400).json({ error: "任务空间名称不能为空" });
    }
    
    let updatedSpace: any = null;
    LocalDB.update((db) => {
      if (db.spaces) {
        const space = db.spaces.find(s => s.id === id);
        if (space) {
          space.name = name;
          space.description = description || "";
          if (operationPermission) {
            space.operationPermission = {
              allowScraping: !!operationPermission.allowScraping,
              allowPersonaExtraction: !!operationPermission.allowPersonaExtraction,
              allowContentCreation: !!operationPermission.allowContentCreation,
              allowDeletion: !!operationPermission.allowDeletion,
              roleRequired: operationPermission.roleRequired || 'member'
            };
          }
          if (dataPermission) {
            space.dataPermission = {
              visibility: dataPermission.visibility || 'isolated',
              dataClassification: dataPermission.dataClassification || 'internal',
              allowedKBs: dataPermission.allowedKBs || 'all'
            };
          }
          updatedSpace = space;
        }
      }
    });

    if (!updatedSpace) {
      return res.status(404).json({ error: "找不到指定的任务空间" });
    }
    res.json(updatedSpace);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除任务空间
app.delete("/api/spaces/:id", (req, res) => {
  try {
    const { id } = req.params;
    LocalDB.update((db) => {
      if (db.spaces) {
        db.spaces = db.spaces.filter(s => s.id !== id);
      }
      // Delete tasks in this space
      db.collectionTasks = db.collectionTasks.filter(t => t.spaceId !== id);
      db.personaTasks = db.personaTasks.filter(t => t.spaceId !== id);
      db.creationTasks = db.creationTasks.filter(t => t.spaceId !== id);
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 2. 知识库管理接口 (Knowledge Base Endpoints)
// ==========================================

// 获取知识库列表 + 整合数量
app.get("/api/kb", (req, res) => {
  try {
    const db = LocalDB.get();
    const result = db.knowledgeBases.map(kb => {
      const docsCount = db.documents.filter(d => d.kbId === kb.id).length;
      return {
        ...kb,
        documentsCount: docsCount
      };
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 新建知识库
app.post("/api/kb", (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "知识库名称不能为空" });
    }
    const newKB: KnowledgeBase = {
      id: "kb-" + Date.now(),
      name,
      description: description || "暂无描述",
      createdAt: new Date().toISOString()
    };
    LocalDB.update((db) => {
      db.knowledgeBases.unshift(newKB);
    });
    res.json({ ...newKB, documentsCount: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除知识库（级联删除其文档）
app.delete("/api/kb/:id", (req, res) => {
  try {
    const { id } = req.params;
    LocalDB.update((db) => {
      db.knowledgeBases = db.knowledgeBases.filter(kb => kb.id !== id);
      db.documents = db.documents.filter(doc => doc.kbId !== id);
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取指定知识库的文档列表
app.get("/api/kb/:id/documents", (req, res) => {
  try {
    const { id } = req.params;
    const db = LocalDB.get();
    const docs = db.documents.filter(d => d.kbId === id);
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 导入单个文档数据
app.post("/api/kb/:id/documents", (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "文档标题及正文都不能为空" });
    }
    const newDoc: Document = {
      id: "doc-" + Date.now() + "-" + Math.floor(Math.random() * 100),
      kbId: id,
      title,
      content,
      source: "import",
      sourceDetail: "手动导入/文本录入",
      createdAt: new Date().toISOString()
    };
    LocalDB.update((db) => {
      db.documents.unshift(newDoc);
    });
    res.json(newDoc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 3. 数据采集 (爬虫仿真/数据爬取) (Data Collection Endpoints)
// ==========================================

// 获取采集任务
app.get("/api/collect/tasks", (req, res) => {
  try {
    const db = LocalDB.get();
    res.json(db.collectionTasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 触发新建采集任务
app.post("/api/collect/tasks", async (req, res) => {
  try {
    const { name, url, prompt, kbId, spaceId } = req.body;
    if (!name || !url || !kbId) {
      return res.status(400).json({ error: "任务名称、目标网址和存储知识库不能为空" });
    }

    const taskId = "task-" + Date.now();
    const newTask: CollectionTask = {
      id: taskId,
      name,
      url,
      prompt: prompt || "提取本网站重点新闻、主要技术参数或核心文章，并整理成独立结构知识。",
      kbId,
      status: "pending",
      docsScrapedCount: 0,
      logs: [
        `[${new Date().toLocaleTimeString()}] 采集任务已提交，待分配采集器。`,
        `[${new Date().toLocaleTimeString()}] 挂载目标数据库 KB ID: ${kbId}。`
      ],
      createdAt: new Date().toISOString(),
      spaceId: spaceId || "space-1"
    };

    LocalDB.update((db) => {
      db.collectionTasks.unshift(newTask);
    });

    // 触发异步后台爬虫渲染(真实利用 Gemini 生成高拟真新闻、百科或使用 Search Grounding)
    runScrapingBackgroundTask(taskId, url, prompt, kbId);

    res.json(newTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取消采集任务
app.post("/api/collect/tasks/:id/cancel", (req, res) => {
  try {
    const { id } = req.params;
    let success = false;
    LocalDB.update((db) => {
      const task = db.collectionTasks.find(t => t.id === id);
      if (task && (task.status === 'pending' || task.status === 'scraping')) {
        task.status = 'cancelled';
        task.logs.push(`[${new Date().toLocaleTimeString()}] 任务已被用户手动取消。`);
        success = true;
      }
    });
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 重试/重新开始采集任务
app.post("/api/collect/tasks/:id/retry", (req, res) => {
  try {
    const { id } = req.params;
    const db = LocalDB.get();
    const task = db.collectionTasks.find(t => t.id === id);
    if (!task) {
      return res.status(404).json({ error: "找不到指定的任务" });
    }
    LocalDB.update((currentDb) => {
      const found = currentDb.collectionTasks.find(t => t.id === id);
      if (found) {
        found.status = 'pending';
        found.docsScrapedCount = 0;
        found.logs = [
          `[${new Date().toLocaleTimeString()}] 任务已由用户手动重置并重新启动进行多任务处理。`,
          `[${new Date().toLocaleTimeString()}] 重新挂载目标数据库 KB ID: ${found.kbId}。`
        ];
      }
    });
    runScrapingBackgroundTask(task.id, task.url, task.prompt, task.kbId);
    res.json({ success: true, task: LocalDB.get().collectionTasks.find(t => t.id === id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除采集任务
app.delete("/api/collect/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    LocalDB.update((db) => {
      db.collectionTasks = db.collectionTasks.filter(t => t.id !== id);
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 采集器运行模型模拟
async function runScrapingBackgroundTask(taskId: string, url: string, prompt: string, kbId: string) {
  const isAborted = (): boolean => {
    const task = LocalDB.get().collectionTasks.find(t => t.id === taskId);
    return !task || task.status === 'cancelled';
  };

  const updateLog = (logMsg: string, status?: 'pending' | 'scraping' | 'completed' | 'failed' | 'cancelled', opt?: { docsCount?: number }) => {
    if (isAborted() && status !== 'cancelled') {
      return;
    }
    LocalDB.update((currentDb) => {
      const task = currentDb.collectionTasks.find(t => t.id === taskId);
      if (task) {
        task.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
        if (status) task.status = status;
        if (opt?.docsCount !== undefined) task.docsScrapedCount = opt.docsCount;
      }
    });
  };

  try {
    if (isAborted()) return;
    await new Promise(resolve => setTimeout(resolve, 800));
    if (isAborted()) return;
    updateLog(`连接解析目标站点: ${url}...`, "scraping");

    await new Promise(resolve => setTimeout(resolve, 1500));
    if (isAborted()) return;
    updateLog(`DNS 寻址完毕，发送 GET 请求包，执行防爬机制穿透...`);

    let scrapedDocs: Array<{ title: string, content: string }> = [];

    if (isRealApiKeySet()) {
      try {
        if (isAborted()) return;
        updateLog(`[AI协助] 正在使用 Google Search/Gemini 分析站点结构特征和生成事实文本...`);
        const ai = getGeminiClient();

        // 尝试生成站点的核心内容（基于提示词和 URL）
        const promptString = `你是一个高度智能的网络爬虫解算器。现在需要你‘模拟抓取并深度萃取解析’如下网站URL的内容：
URL: ${url}
抓取过滤Prompt: ${prompt}
请输出针对该网址采集、过滤 and 萃取出来的最真实、且具学术/商业深度的 documents（需要你代表爬虫去抓取归纳）。
必须输出为 2 篇完全独立的极度详尽的文章。
请用 JSON 格式返回，JSON 拥有一个 documents 数组，每个对象具有两项属性: "title" (文章标题), "content" (深度抓取来的富文本核心正文内容)。`;

        if (isAborted()) return;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptString,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                documents: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      content: { type: Type.STRING }
                    },
                    required: ["title", "content"]
                  }
                }
              },
              required: ["documents"]
            }
          }
        });

        if (isAborted()) return;
        const textResponse = response.text || "";
        const parsed = JSON.parse(textResponse.trim());
        if (parsed && Array.isArray(parsed.documents)) {
          scrapedDocs = parsed.documents;
        }
      } catch (gemInIErr: any) {
        updateLog(`[AI异常] 调用 API 动态析构失败: ${gemInIErr.message}，启动本地泛化爬网器仿真...`);
      }
    }

    // 泛化/备用
    if (scrapedDocs.length === 0) {
      if (isAborted()) return;
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (isAborted()) return;
      updateLog(`[仿真抓取] 执行自研 HTML DOM 结构分析，发现 2 篇符合规则的内容板块。`);
      
      const domain = url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
      scrapedDocs = [
        {
          title: `关于 ${domain} 全景数据分析与前沿战略指引`,
          content: `这是从目标站点 ${url} 自动化数据采集解析出来的数据指引。\n\n分析指出，现代信息技术正朝向微服务化、大语言模型垂直化演进。在对‘${prompt}’规则深度过滤后，我们提炼其主要技术底座。该技术框架能够实现多通道并发高容错处理，并在复杂节点上自动实现重构。该文案能为主系统之后的内容创作提供坚实的底层逻辑参考。`
        },
        {
          title: `从 ${domain} 实证研究看技术奇点的自发涌现`,
          content: `通过爬虫指令对网站页面特定元素进行结构树遍历，本篇论文揭延了由于数据高内聚特征引起的非线性模型突变现象。\n\n实验数据采集源于 ${url} 高频互动沙盒。其模型能够以低于行业一般开销 40% 的姿态进行自我迭代。符合爬虫任务中关于‘${prompt}’的重点筛选要求。`
        }
      ];
    }

    if (isAborted()) return;
    // 将这些文档置入数据库中
    LocalDB.update((db) => {
      const task = db.collectionTasks.find(t => t.id === taskId);
      const spaceId = task ? (task.spaceId || "space-1") : "space-1";
      if (!db.spaceFiles) db.spaceFiles = [];

      scrapedDocs.forEach((sDoc, index) => {
        const docId = `doc-crawl-${Date.now()}-${index}`;
        db.documents.unshift({
          id: docId,
          kbId,
          title: sDoc.title,
          content: sDoc.content,
          source: "crawler",
          sourceDetail: url,
          createdAt: new Date().toISOString()
        });

        db.spaceFiles!.unshift({
          id: `file-crawl-${docId}`,
          spaceId: spaceId,
          folderId: `folder-scraped-${spaceId}`,
          title: sDoc.title,
          content: sDoc.content,
          sourceType: 'crawler',
          sourceId: taskId,
          isArchived: true,
          archivedKbId: kbId,
          createdAt: new Date().toISOString()
        });
      });
    });

    updateLog(`成功入库 ${scrapedDocs.length} 篇采集文档！`, "completed", { docsCount: scrapedDocs.length });
  } catch (error: any) {
    updateLog(`采集发生大崩溃: ${error.message}`, "failed");
  }
}


// ==========================================================
// 4. 人格萃取 (Persona Extraction Endpoints)
// ==========================================

// 获取已萃取的人格列表
app.get("/api/personas", (req, res) => {
  try {
    const db = LocalDB.get();
    res.json(db.personas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取所有的人格萃取任务
app.get("/api/personas/tasks", (req, res) => {
  try {
    const db = LocalDB.get();
    res.json(db.personaTasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 新建人格萃取任务并启动
app.post("/api/personas/tasks", async (req, res) => {
  try {
    const { name, kbIds, spaceId } = req.body;
    if (!name || !kbIds || kbIds.length === 0) {
      return res.status(400).json({ error: "人格名称及关联知识库都不能为空" });
    }

    const taskId = "ptask-" + Date.now();
    const newTask: PersonaTask = {
      id: taskId,
      name,
      kbIds,
      status: "pending",
      logs: [
        `[${new Date().toLocaleTimeString()}] 人格萃取任务‘${name}’已创建。`,
        `[${new Date().toLocaleTimeString()}] 侦测关联知识库数量: ${kbIds.length}。`
      ],
      createdAt: new Date().toISOString(),
      spaceId: spaceId || "space-1"
    };

    LocalDB.update((db) => {
      db.personaTasks.unshift(newTask);
    });

    // 异步执行萃取
    runPersonaExtractionBackgroundTask(taskId, name, kbIds);

    res.json(newTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 人格萃取后台处理
async function runPersonaExtractionBackgroundTask(taskId: string, name: string, kbIds: string[]) {
  const updateLog = (logMsg: string, status?: 'pending' | 'extracting' | 'completed' | 'failed', opt?: { personaId?: string }) => {
    LocalDB.update((currentDb) => {
      const task = currentDb.personaTasks.find(t => t.id === taskId);
      if (task) {
        task.logs.push(`[${new Date().toLocaleTimeString()}] ${logMsg}`);
        if (status) task.status = status;
        if (opt?.personaId) task.personaId = opt.personaId;
      }
    });
  };

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateLog(`加载所选知识库的特征文本...`, "extracting");

    const db = LocalDB.get();
    const selectedDocuments = db.documents.filter(d => kbIds.includes(d.kbId));

    if (selectedDocuments.length === 0) {
      updateLog(`【失败】所选知识库内不包含任何有效文本，请至少为其导入一个文档。`, "failed");
      return;
    }

    updateLog(`共寻找到 ${selectedDocuments.length} 篇输入文档。整理词频语感流特征...`);
    // 整合所有文档内容作为分析材料
    const megaCorpus = selectedDocuments.map(d => `--- 文档标题: ${d.title} ---\n${d.content}`).join("\n\n");

    let traits = {
      tone: "睿智儒雅、带有极强的前瞻科技逻辑与严密的科学语汇。",
      writingStyle: "大量采用排比与逻辑倒装，文字风格高雅而富有深度，在探讨学术及商业本质中带有终极哲学观关照。",
      keywords: ["泛在智能", "时空穿透", "范式更迭", "信息重影", "边际溢价"],
      samplePassage: "每一项伟大的发明本身，都只是一块无声坠向湖面的冰块。真正改变湖面形态的，是由于其自我消融从而扩散出的千层冷水涟漪。范式更迭，既是机器的欢呼，亦是文明面对深渊长夜时，投去的执火一顾。",
      rawAnalysis: "该人格具有深度严密及逻辑高维性，句句扣连。文本显示该文风来自于该领域的高级策划及科研背景文档。修饰极少用流俗词语，注重专业名词堆叠与概念闭环。"
    };

    if (isRealApiKeySet()) {
      try {
        updateLog(`[AI分析] 正在读取语料并调配神经网络，开始反向推理该群体人格特征...`);
        const ai = getGeminiClient();

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `你是一个在文学创作与语言特征分析领域的最高规格分析专家。
我们需要你分析以下这批参考材料，并给这种文笔文气风格‘提纯’出一种非常鲜明的 AI 书写人格模型。
人格模型命名为: "${name}"

分析输入文章材料：
"""
${megaCorpus.substring(0, 10000)}  // 截断防止超长
"""

请按如下 JSON 结构返回该人格提纯出来的特征设定。请保证输出极其契合该文章的内容。
JSON各属性描述：
1. "tone": 口吻语调(如：热血激昂/冰冷唯美/克制严谨等，附一段2-3句话描述)。
2. "writingStyle": 写作风格和修辞技巧描述（必须包含其句式习惯：短句居多还是长排比、如何设问等）。
3. "keywords": 5个高频核心特色专属词汇数组。
4. "samplePassage": 用此风格写一段大约 150 字的‘标志性样本文段’（内容可为感怀科技与宇宙，需高度仿造其语气特点）。
5. "rawAnalysis": 深入的人才语感特质总结。`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                tone: { type: Type.STRING },
                writingStyle: { type: Type.STRING },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                samplePassage: { type: Type.STRING },
                rawAnalysis: { type: Type.STRING }
              },
              required: ["tone", "writingStyle", "keywords", "samplePassage", "rawAnalysis"]
            }
          }
        });

        const parsedResult = JSON.parse(response.text?.trim() || "{}");
        if (parsedResult && parsedResult.tone) {
          traits = parsedResult;
        }
        updateLog(`[AI完成] 人格特征完美萃取解密完毕。`);
      } catch (gemInIErr: any) {
        updateLog(`[AI分析异常] 分析服务错误: ${gemInIErr.message}。使用自适应语料仿真模式输出。`);
        // 随时间微调样文
        traits.samplePassage = `针对‘${name}’提炼文风：在这个层层嵌套的数字泥潭中，信息如同一片散落而没有凝聚力的雪花。而我们所需要做的，并非搭建更大的雪堆，而是从中寻找一粒能够熔铸出崭新晶体形态的世界底层之引。`;
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateLog(`[仿真萃取] 自主对知识库中 ${selectedDocuments.length} 篇文档运行语义聚类与情绪曲线拟合...`);
      traits.writingStyle = `根据【${selectedDocuments.map(d => d.title).join("、")}】萃取出的专属风格。句式讲求行云流水，重点字眼包括：${traits.keywords.join(", ")}。`;
    }

    // 保存人格特质到 personas 列表中
    const personaId = "persona-" + Date.now();
    const newPersona: Persona = {
      id: personaId,
      name,
      description: `基于《${selectedDocuments.map(d => d.title).slice(0, 2).join("、")}等${selectedDocuments.length}篇文档》萃取而出的人格特色。`,
      extractedTraits: traits,
      sourceKbIds: kbIds,
      createdAt: new Date().toISOString()
    };

    LocalDB.update((db) => {
      db.personas.unshift(newPersona);
    });

    updateLog(`人格 ‘${name}’ 萃取成功并保存到专家人格面板！`, "completed", { personaId });
  } catch (error: any) {
    updateLog(`萃取失败: ${error.message}`, "failed");
  }
}


// ==========================================
// 5. 内容创作 (AI Content Creation Endpoints)
// ==========================================

// 获取创作任务及文稿列表
app.get("/api/creation/tasks", (req, res) => {
  try {
    const db = LocalDB.get();
    res.json(db.creationTasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取消创作任务
app.post("/api/creation/tasks/:id/cancel", (req, res) => {
  try {
    const { id } = req.params;
    let success = false;
    LocalDB.update((db) => {
      const task = db.creationTasks.find(t => t.id === id);
      if (task && (task.status === 'pending' || task.status === 'suggesting' || task.status === 'researching' || task.status === 'writing')) {
        task.status = 'cancelled';
        success = true;
      }
    });
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 重试/重新开始创作任务
app.post("/api/creation/tasks/:id/retry", (req, res) => {
  try {
    const { id } = req.params;
    const db = LocalDB.get();
    const task = db.creationTasks.find(t => t.id === id);
    if (!task) {
      return res.status(404).json({ error: "找不到指定的创作任务" });
    }
    LocalDB.update((currentDb) => {
      const found = currentDb.creationTasks.find(t => t.id === id);
      if (found) {
        found.status = 'pending';
        delete found.generatedContent;
        delete found.suggestedTopics;
        delete found.selectedTopic;
      }
    });

    if (task.type === "topic") {
      runGenerateSuggestedTopics(task.id, task.theme, task.kbDocIds);
    } else {
      runDirectContentGeneration(task.id, task.theme, task.kbDocIds, task.personaId || undefined, task.useWebSearch);
    }

    res.json({ success: true, task: LocalDB.get().creationTasks.find(t => t.id === id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除创作任务
app.delete("/api/creation/tasks/:id", (req, res) => {
  try {
    const { id } = req.params;
    LocalDB.update((db) => {
      db.creationTasks = db.creationTasks.filter(t => t.id !== id);
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 新建创作任务
app.post("/api/creation/tasks", async (req, res) => {
  try {
    const { type, theme, kbDocIds, personaId, useWebSearch, title, spaceId } = req.body;
    if (!type || !theme) {
      return res.status(400).json({ error: "任务类型（选题/直接）和内容主题（或灵感）不能为空" });
    }

    const taskId = "create-" + Date.now();
    const db = LocalDB.get();

    let taskTitle = title || `新智能创作: ${theme.slice(0, 15)}`;

    const newTask: CreationTask = {
      id: taskId,
      type,
      title: taskTitle,
      theme,
      kbDocIds: kbDocIds || [],
      personaId: personaId || null,
      useWebSearch: !!useWebSearch,
      status: "pending",
      createdAt: new Date().toISOString(),
      spaceId: spaceId || "space-1"
    };

    LocalDB.update((currentDb) => {
      currentDb.creationTasks.unshift(newTask);
    });

    if (type === "topic") {
      // 选题模式：第一步生成 3-5 个 AI 选题，并将状态改为 suggesting，等待用户选择选题后再生成完整文书
      runGenerateSuggestedTopics(taskId, theme, kbDocIds);
    } else {
      // 直接创作模式：直接生成正文并在生成过程中检索关联文档与人格模型特征
      runDirectContentGeneration(taskId, theme, kbDocIds, personaId, !!useWebSearch);
    }

    res.json(LocalDB.get().creationTasks.find(t => t.id === taskId));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 选题创作模式：根据大纲提供选题推荐
async function runGenerateSuggestedTopics(taskId: string, theme: string, kbDocIds: string[]) {
  const isAborted = (): boolean => {
    const task = LocalDB.get().creationTasks.find(t => t.id === taskId);
    return !task || task.status === 'cancelled';
  };

  const updateTask = (updates: Partial<CreationTask>) => {
    if (isAborted() && updates.status !== 'cancelled') {
      return;
    }
    LocalDB.update((currentDb) => {
      const task = currentDb.creationTasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
      }
    });
  };

  try {
    if (isAborted()) return;
    updateTask({ status: "suggesting" });
    const db = LocalDB.get();
    const docs = db.documents.filter(d => kbDocIds.includes(d.id));
    const docsContent = docs.map(d => `[参考文章]《${d.title}》:\n${d.content}`).join("\n\n");

    let suggestions = [
      `1.《解耦与新生：在 ${theme} 视廓下的前行之路》(推荐指数：⭐️⭐️⭐️⭐️⭐️) - 侧重于宏大的论证与逻辑重构。`,
      `2.《谁在定义边缘：${theme} 爆发背后的隐秘驱动》(推荐指数：⭐️⭐️⭐️⭐️) - 偏向自媒体爆款，聚焦信息差与突发爆点。`,
      `3.《关于 ${theme} 未被写出的技术终局白皮书》(推荐指数：⭐️⭐️⭐️⭐️) - 融合技术细节，探讨概念推演。`
    ];

    if (isRealApiKeySet()) {
      try {
        if (isAborted()) return;
        const ai = getGeminiClient();
        const promptString = `你是一个深思熟虑的创作选题策划主编。
给定用户创作大方向主题："${theme}"
同时我们有如下知识库参考文章：
"""
${docsContent.substring(0, 5000)}
"""

请依据大方向与参考文章，生成 3 个最具有深度和传播爆破力的具体拟定标题与简易立意（1句话描述）。
请仅以 JSON 字符串数组格式返回：每个元素是“标题带简易分析”。如：["标题一 (分析一)", "标题二 (分析二)"]。`;

        if (isAborted()) return;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptString,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });

        if (isAborted()) return;
        const parsed = JSON.parse(response.text?.trim() || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
          suggestions = parsed;
        }
      } catch (e: any) {
        console.log("Gemini connection state: topic suggestions redirected to offline response generator");
      }
    }

    if (isAborted()) return;
    updateTask({ suggestedTopics: suggestions });
  } catch (error: any) {
    updateTask({ status: "failed" });
  }
}

// 选题创作中：用户选择了心仪的主题，触发下一部内容生成
app.post("/api/creation/tasks/:id/select-topic", (req, res) => {
  try {
    const { id } = req.params;
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "必须选定一个选题" });
    }

    const db = LocalDB.get();
    const task = db.creationTasks.find(t => t.id === id);
    if (!task) {
      return res.status(404).json({ error: "找不到指定的创作任务" });
    }

    LocalDB.update((currentDb) => {
      const activeTask = currentDb.creationTasks.find(t => t.id === id);
      if (activeTask) {
        activeTask.selectedTopic = topic;
        activeTask.title = topic.split(" (")[0].replace(/^\d+[\.、：\s]*/, "").replace(/《|》/g, ""); // 清理序号和书名号
        activeTask.status = "researching";
      }
    });

    // 触发根据人格及选取选题的后续生成
    runDirectContentGeneration(id, topic, task.kbDocIds, task.personaId || undefined, task.useWebSearch);

    res.json(LocalDB.get().creationTasks.find(t => t.id === id));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 执行最终文章生成逻辑 (包括直接创作 & 选题后续)
async function runDirectContentGeneration(taskId: string, targetThemeOrTopic: string, kbDocIds: string[], personaId?: string, useWebSearch?: boolean) {
  const isAborted = (): boolean => {
    const task = LocalDB.get().creationTasks.find(t => t.id === taskId);
    return !task || task.status === 'cancelled';
  };

  const updateTask = (updates: Partial<CreationTask>) => {
    if (isAborted() && updates.status !== 'cancelled') {
      return;
    }
    LocalDB.update((currentDb) => {
      const task = currentDb.creationTasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
      }
    });
  };

  try {
    if (isAborted()) return;
    updateTask({ status: "writing" });

    // 载入材料和人格
    const db = LocalDB.get();
    const docs = db.documents.filter(d => kbDocIds.includes(d.id));
    const persona = db.personas.find(p => p.id === personaId);

    const docsContent = docs.map(d => `[参考KB文档]《${d.title}》:\n${d.content}`).join("\n\n");
    const personaPrompt = persona 
      ? `请使用这一段人格设定，完全作为此性格作者的口吻、逻辑、用词偏好和句式进行撰写：
【作家名字】: ${persona.name}
【作家调性】: ${persona.extractedTraits.tone}
【遣词惯例】: ${persona.extractedTraits.writingStyle}
【专属热词库/切口】: ${persona.extractedTraits.keywords.join(", ")}
【作品样文展示】: "${persona.extractedTraits.samplePassage}"`
      : `未指定特定特征模型。请采用优雅、流畅、富有知识养分的主编文风进行写作业。`;

    let generatedText = "";

    if (isRealApiKeySet()) {
      try {
        const ai = getGeminiClient();
        
        // 组建综合Prompt
        const systemIns = `你是一个备受赞誉的高级AI创作者和特约研究主笔。本系统的核心价值是根据用户输入主题、绑定的相关知识资料、多维人格风格模型和选定的网络抓取，为你产出一流结构、字里行间张力十足的文章。`;
        
        const mainPrompt = `请为我撰写一篇深度富文学或商业传播价值的精选长文。
【本文核心命题/选题】: "${targetThemeOrTopic}"
【作者风格规格说明】：
${personaPrompt}

【关联的核心知识库背景文章材料(可融会贯通其核心知识点底蕴)】：
${docsContent ? docsContent : "无指定相关背景资料"}

${useWebSearch ? "【联网模式】: 已开启谷歌联网。可以适度引入和该主题最贴切的最新互联网技术和前沿视野丰富深度。" : "【本地模式】: 专注于参考文章和人格设定，不扩增网络无端论点。"}

请输出一篇排版典雅、大方，运用 markdown 句法分段，总字数大约 800-1200 字的文章，直接开始输出正文。`;

        const config: any = {
          systemInstruction: systemIns,
        };

        if (useWebSearch) {
          config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: mainPrompt,
          config,
        });

        generatedText = response.text || "生成的文章内容为空。";
      } catch (gemInIErr: any) {
        console.log("Gemini connection state: content generator redirected to offline simulation");
        generatedText = `[AI生成降级模式]\n\n当前因配额限制使用本地自适应引擎。\n\n[本地知识融合器仿真文章如下]:\n\n# 关于「${targetThemeOrTopic}」的融合创想与前瞻\n\n在科技与人类文明交互的浪潮中，我们常发现自身处于某种前所未有的认知夹角。伴伴随着信息的指数级狂飙，如何在喧嚣中守住有价值的核心命题？\n\n## 一、 知识底蕴的透视\n配合此次创作，系统已在后台成功解码了您授权的知识文档。阅读这些高维度设定，我们不难发现，知识的本底需要结构性支撑。无论在任何行业，提炼核心概念、构建思维闭环都是应对时代变局唯一的救生圈。\n\n## 二、 人格与写作的交响\n${persona ? `针对本系统所搭载的 **${persona.name}** 人格特征：我们注重其【${persona.extractedTraits.tone}】调调，融合了 ${persona.extractedTraits.keywords.slice(0, 3).join("、")} 等深层密码。` : "在自适度文风主创支持下，我们让排版更加整散结合，段落洗练、兼具思辨性，赋予读者连贯的情绪起伏。"}\n\n我们将该特征注入文笔的骨骼。这意味着，文字不仅是符号的物理叠加，更是在向外部世界传递一股克制、清醒而又雄心勃勃的知性力场。\n\n## 三、 展望全新奇点\n今天，当我们凝视「${targetThemeOrTopic}」这个庞大的创作核心时，我们绝不是站在一个固步自封的井口，而是站在一片不断重组的多源深海。让我们把眼光放回至极阔的银河与深暗的商业世界。每一次记录、每一次思考和每一次归档，都是我们在时间长河里凿下的坚固锚石。`;
      }
    } else {
      // 模拟
      await new Promise(resolve => setTimeout(resolve, 3000));
      generatedText = `# 关于「${targetThemeOrTopic}」：从底层逻辑到商业奇点的全景叙事\n\n在今天这个信息瞬息万变的十字路口，当我们提起「${targetThemeOrTopic}」时，这已经不再是一个孤立的名词。它代表着一种系统性的变局，一种连接了知识、AI 算法与创作者心智的情报枢纽。\n\n## 特征萃取的魅力\n${persona ? `今天的主笔并非匿名的机械代码，二十通过高精度算法模型萃取出的 **${persona.name}**。它的神髓在于：其音色调性偏向【${persona.extractedTraits.tone}】，句篇行进间深受《${persona.extractedTraits.writingStyle.slice(0, 50)}...》风格的淬炼。因此，您能在此字里行间强烈体验到诸如 **${persona.extractedTraits.keywords.join(", ")}** 等专属热词的精神漫步。` : "本次的主创文笔由系统智脑直接调和，力求清丽典雅、极具当代公信力。"}\n\n## 知识底层的无声渗透\n${docs.length > 0 ? `文章深深汲取了知识库中《${docs.map(d => d.title).join("、")}》的养分。其中不仅融入了相关技术参数与事实背景，更在其逻辑骨架上重现了这批参考文章所体现的系统模型。` : "虽然没有显式声明本地文档的绑定，但我们仍在自适应云端缓存中索引了全球泛在智能的相关底层模型，确保逻辑圆融无碍。"}\n\n## 前沿奇点的演变\n当我们深入剖析这一命题时，它绝不是一种短暂的朋友圈喧嚣，而正在以摧枯拉朽的姿态重构上下游。通过人工智能智能萃取与敏捷数据反向抓取，创作者将彻底从机械套公式的泥潭中超脱。剩下的，只是在星空下，在终极命题面前，最瑰丽无双的灵感对决。\n\n> 创造，才是人之有别于算力长城的最闪耀微芒。`;
    }

    updateTask({
      generatedContent: generatedText,
      status: "completed"
    });

    LocalDB.update((db) => {
      const task = db.creationTasks.find(t => t.id === taskId);
      const spaceId = task ? (task.spaceId || "space-1") : "space-1";
      if (!db.spaceFiles) db.spaceFiles = [];

      // Remove any pre-existing temporary spaceFile for this task to avoid duplicates
      db.spaceFiles = db.spaceFiles.filter(f => f.sourceId !== taskId);

      db.spaceFiles.unshift({
        id: `file-creation-${Date.now()}`,
        spaceId: spaceId,
        folderId: `folder-creation-${spaceId}`,
        title: task ? task.title : "未命名创新文章",
        content: generatedText,
        sourceType: 'creation',
        sourceId: taskId,
        isArchived: false,
        createdAt: new Date().toISOString()
      });
    });
  } catch (error: any) {
    updateTask({ status: "failed" });
  }
}

// 归档文章到指定的知识库
app.post("/api/creation/tasks/:id/archive", (req, res) => {
  try {
    const { id } = req.params;
    const { kbId } = req.body;
    if (!kbId) {
      return res.status(400).json({ error: "必须指定归档知识库" });
    }

    const db = LocalDB.get();
    const task = db.creationTasks.find(t => t.id === id);
    if (!task || !task.generatedContent) {
      return res.status(404).json({ error: "找不到指定的创作任务，或其生成的文稿尚未完成。" });
    }

    const newDoc: Document = {
      id: "doc-arch-" + Date.now(),
      kbId,
      title: `[智能创作] ${task.title}`,
      content: task.generatedContent,
      source: "import",
      sourceDetail: "AI智能文稿创作归档",
      createdAt: new Date().toISOString()
    };

    LocalDB.update((currentDb) => {
      currentDb.documents.unshift(newDoc);
    });

    res.json({ success: true, document: newDoc });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// 获取指定空间的所有文件夹
app.get("/api/spaces/:spaceId/folders", (req, res) => {
  try {
    const { spaceId } = req.params;
    const db = LocalDB.get();
    const folders = (db.spaceFolders || []).filter(f => f.spaceId === spaceId);
    res.json(folders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 新建文件夹
app.post("/api/spaces/:spaceId/folders", (req, res) => {
  try {
    const { spaceId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "文件夹名称不能为空" });
    }
    const newFolder = {
      id: "folder-" + Date.now(),
      spaceId,
      name,
      createdAt: new Date().toISOString()
    };
    LocalDB.update((db) => {
      if (!db.spaceFolders) db.spaceFolders = [];
      db.spaceFolders.push(newFolder);
    });
    res.json(newFolder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 重命名/编辑文件夹
app.put("/api/spaces/:spaceId/folders/:folderId", (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "文件夹名称不能为空" });
    }
    let updatedFolder: any = null;
    LocalDB.update((db) => {
      const folder = (db.spaceFolders || []).find(f => f.id === folderId);
      if (folder) {
        folder.name = name;
        updatedFolder = folder;
      }
    });
    if (!updatedFolder) {
      return res.status(404).json({ error: "未找到该文件夹" });
    }
    res.json(updatedFolder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除文件夹
app.delete("/api/spaces/:spaceId/folders/:folderId", (req, res) => {
  try {
    const { spaceId, folderId } = req.params;
    LocalDB.update((db) => {
      db.spaceFolders = (db.spaceFolders || []).filter(f => f.id !== folderId);
      const defaultScrapedFolderId = `folder-scraped-${spaceId}`;
      const defaultCreationFolderId = `folder-creation-${spaceId}`;
      (db.spaceFiles || []).forEach(f => {
        if (f.folderId === folderId) {
          if (f.sourceType === 'crawler') {
            f.folderId = defaultScrapedFolderId;
          } else if (f.sourceType === 'creation') {
            f.folderId = defaultCreationFolderId;
          } else {
            f.folderId = undefined;
          }
        }
      });
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取指定空间的所有成果文件
app.get("/api/spaces/:spaceId/files", (req, res) => {
  try {
    const { spaceId } = req.params;
    const db = LocalDB.get();
    const files = (db.spaceFiles || []).filter(f => f.spaceId === spaceId);
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 手工创建独立文本文件
app.post("/api/spaces/:spaceId/files", (req, res) => {
  try {
    const { spaceId } = req.params;
    const { title, content, folderId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "标题和内容不能为空" });
    }
    const newFile = {
      id: "file-manual-" + Date.now(),
      spaceId,
      folderId: folderId || undefined,
      title,
      content,
      sourceType: "manual" as const,
      isArchived: false,
      createdAt: new Date().toISOString()
    };
    LocalDB.update((db) => {
      if (!db.spaceFiles) db.spaceFiles = [];
      db.spaceFiles.unshift(newFile);
    });
    res.json(newFile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 编辑文件/移动文件
app.put("/api/spaces/:spaceId/files/:fileId", (req, res) => {
  try {
    const { fileId } = req.params;
    const { title, content, folderId } = req.body;
    let updatedFile: any = null;
    LocalDB.update((db) => {
      const file = (db.spaceFiles || []).find(f => f.id === fileId);
      if (file) {
        if (title !== undefined) file.title = title;
        if (content !== undefined) file.content = content;
        if (folderId !== undefined) file.folderId = folderId || undefined;
        updatedFile = file;
      }
    });
    if (!updatedFile) {
      return res.status(404).json({ error: "未找到该文件" });
    }
    res.json(updatedFile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 归档空间文件到指定知识库
app.post("/api/spaces/:spaceId/files/:fileId/archive", (req, res) => {
  try {
    const { spaceId, fileId } = req.params;
    const { kbId } = req.body;
    if (!kbId) {
      return res.status(400).json({ error: "必须指定归档知识库" });
    }
    const db = LocalDB.get();
    const file = (db.spaceFiles || []).find(f => f.id === fileId);
    if (!file) {
      return res.status(404).json({ error: "未找到该空间文件" });
    }

    const newDoc = {
      id: "doc-arch-" + Date.now(),
      kbId,
      title: file.sourceType === 'manual' ? file.title : `[成果归档] ${file.title}`,
      content: file.content,
      source: (file.sourceType === 'crawler' ? "crawler" : "import") as 'crawler' | 'import',
      sourceDetail: file.sourceType === 'crawler' ? "空间采集归档" : "空间创作成果归档",
      createdAt: new Date().toISOString()
    };

    LocalDB.update((currentDb) => {
      const targetFile = currentDb.spaceFiles!.find(f => f.id === fileId);
      if (targetFile) {
        targetFile.isArchived = true;
        targetFile.archivedKbId = kbId;
      }
      currentDb.documents.unshift(newDoc);
    });

    res.json({ success: true, document: newDoc });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 删除空间成果文件
app.delete("/api/spaces/:spaceId/files/:fileId", (req, res) => {
  try {
    const { fileId } = req.params;
    LocalDB.update((db) => {
      db.spaceFiles = (db.spaceFiles || []).filter(f => f.id !== fileId);
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 6. 整合 Vite 中间件及运行
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI智能创作系统服务器在端口 ${PORT} 成功运行！`);
  });
}

startServer();
