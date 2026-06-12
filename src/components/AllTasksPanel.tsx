import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, Globe, BrainCircuit, PenTool, Database, Layers, CheckCircle, 
  Loader2, AlertCircle, XCircle, Calendar, ArrowRight, ChevronRight, ChevronLeft,
  Terminal, Trash2, StopCircle, RotateCcw, Award, Archive, Check, Copy, 
  Info, Eye, EyeOff, LayoutGrid, FileText, Play
} from "lucide-react";
import { 
  CollectionTask, PersonaTask, CreationTask, KnowledgeBase, Persona, Document 
} from "../types";

// Extends task types with identifier
type CombinedTask = 
  | (CollectionTask & { taskType: "scraper" })
  | (PersonaTask & { taskType: "persona" })
  | (CreationTask & { taskType: "creation" });

interface AllTasksPanelProps {
  scraperTasks: CollectionTask[];
  personaTasks: PersonaTask[];
  creationTasks: CreationTask[];
  kbs: KnowledgeBase[];
  personas: Persona[];
  allDocs: Document[];
  selectedSpaceId: string;
  isCreateOpen?: boolean;
  setIsCreateOpen?: (open: boolean) => void;
  onCreateScraperTask: (name: string, url: string, prompt: string, kbId: string) => Promise<void>;
  onCancelScraperTask: (id: string) => Promise<void>;
  onRetryScraperTask: (id: string) => Promise<void>;
  onDeleteScraperTask: (id: string) => Promise<void>;
  onCreatePersonaTask: (name: string, kbIds: string[]) => Promise<void>;
  onCreateCreationTask: (params: {
    type: 'topic' | 'direct';
    theme: string;
    kbDocIds: string[];
    personaId?: string;
    useWebSearch: boolean;
  }) => Promise<void>;
  onCancelCreationTask: (id: string) => Promise<void>;
  onRetryCreationTask: (id: string) => Promise<void>;
  onDeleteCreationTask: (id: string) => Promise<void>;
  onSelectTopic: (taskId: string, topic: string) => Promise<void>;
  onArchiveDoc: (taskId: string, kbId: string) => Promise<void>;
}

export default function AllTasksPanel({
  scraperTasks,
  personaTasks,
  creationTasks,
  kbs,
  personas,
  allDocs,
  selectedSpaceId,
  isCreateOpen: externalCreateOpen,
  setIsCreateOpen: setExternalCreateOpen,
  onCreateScraperTask,
  onCancelScraperTask,
  onRetryScraperTask,
  onDeleteScraperTask,
  onCreatePersonaTask,
  onCreateCreationTask,
  onCancelCreationTask,
  onRetryCreationTask,
  onDeleteCreationTask,
  onSelectTopic,
  onArchiveDoc
}: AllTasksPanelProps) {
  // Navigation & Search Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "scraper" | "persona" | "creation">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "completed" | "failed">("all");

  // Multi-column status togglers inside task details page
  const [colInfoOpen, setColInfoOpen] = useState(true);
  const [colStatusOpen, setColStatusOpen] = useState(true);
  const [colResultOpen, setColResultOpen] = useState(true);

  // Selected existing or draft task details
  const [selectedTask, setSelectedTask] = useState<CombinedTask | null>(null);

  // Form States - Scraping Task
  const [scrapName, setScrapName] = useState("");
  const [scrapUrl, setScrapUrl] = useState("");
  const [scrapPrompt, setScrapPrompt] = useState("");
  const [scrapKbId, setScrapKbId] = useState("");

  // Form States - Persona Task
  const [persName, setPersName] = useState("");
  const [persKbIds, setPersKbIds] = useState<string[]>([]);

  // Form States - Creation Task
  const [creatType, setCreatType] = useState<'topic' | 'direct'>('direct');
  const [creatTheme, setCreatTheme] = useState("");
  const [creatDocIds, setCreatDocIds] = useState<string[]>([]);
  const [creatPersonaId, setCreatPersonaId] = useState("");
  const [creatWebSearch, setCreatWebSearch] = useState(false);

  // Copy helper states
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [archiveKbId, setArchiveKbId] = useState("");
  const [archiveSuccess, setArchiveSuccess] = useState(false);

  // Nested Document selector states
  const [isKbDocsSelectorOpen, setIsKbDocsSelectorOpen] = useState(false);
  const [tempSelectedDocIds, setTempSelectedDocIds] = useState<string[]>([]);
  const [tempSelectedKbIds, setTempSelectedKbIds] = useState<string[]>([]);
  const [activeKbId, setActiveKbId] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [awaitingNewTask, setAwaitingNewTask] = useState<"scraper" | "persona" | "creation" | null>(null);

  const logTerminalRef = useRef<HTMLDivElement | null>(null);

  // Default selection set
  useEffect(() => {
    if (kbs.length > 0) {
      if (!scrapKbId) setScrapKbId(kbs[0].id);
      if (!activeKbId) setActiveKbId(kbs[0].id);
    }
  }, [kbs]);

  // Sync background polling update on tasks list
  useEffect(() => {
    if (selectedTask && !selectedTask.id.startsWith("draft-")) {
      if (selectedTask.taskType === "scraper") {
        const matching = scraperTasks.find(t => t.id === selectedTask.id);
        if (matching) setSelectedTask({ ...matching, taskType: "scraper" });
      } else if (selectedTask.taskType === "persona") {
        const matching = personaTasks.find(t => t.id === selectedTask.id);
        if (matching) setSelectedTask({ ...matching, taskType: "persona" });
      } else if (selectedTask.taskType === "creation") {
        const matching = creationTasks.find(t => t.id === selectedTask.id);
        if (matching) setSelectedTask({ ...matching, taskType: "creation" });
      }
    }
  }, [scraperTasks, personaTasks, creationTasks]);

  // Auto scroll logs term
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [selectedTask]);

  // Listen to new tasks list for auto-transition
  useEffect(() => {
    if (awaitingNewTask) {
      if (awaitingNewTask === "scraper" && scraperTasks.length > 0) {
        const spaceScrapers = scraperTasks.filter(t => (t.spaceId || "space-default") === selectedSpaceId);
        if (spaceScrapers.length > 0) {
          const sorted = [...spaceScrapers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSelectedTask({ ...sorted[0], taskType: "scraper" });
          setAwaitingNewTask(null);
        }
      } else if (awaitingNewTask === "persona" && personaTasks.length > 0) {
        const spacePersonas = personaTasks.filter(t => (t.spaceId || "space-default") === selectedSpaceId);
        if (spacePersonas.length > 0) {
          const sorted = [...spacePersonas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSelectedTask({ ...sorted[0], taskType: "persona" });
          setAwaitingNewTask(null);
        }
      } else if (awaitingNewTask === "creation" && creationTasks.length > 0) {
        const spaceCreations = creationTasks.filter(t => (t.spaceId || "space-default") === selectedSpaceId);
        if (spaceCreations.length > 0) {
          const sorted = [...spaceCreations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSelectedTask({ ...sorted[0], taskType: "creation" });
          setAwaitingNewTask(null);
        }
      }
    }
  }, [scraperTasks, personaTasks, creationTasks, awaitingNewTask, selectedSpaceId]);

  // Launch a draft task state
  const handleInitiateDraft = (type: "scraper" | "persona" | "creation") => {
    setScrapName("");
    setScrapUrl("");
    setScrapPrompt("");
    if (kbs.length > 0) setScrapKbId(kbs[0].id);

    setPersName("");
    setPersKbIds([]);

    setCreatType("direct");
    setCreatTheme("");
    setCreatDocIds([]);
    setCreatPersonaId("");
    setCreatWebSearch(false);

    // Set column expand/collapses to default values on load
    setColInfoOpen(true);
    setColStatusOpen(true);
    setColResultOpen(true);

    if (type === "scraper") {
      setSelectedTask({
        id: "draft-scraper",
        name: "",
        url: "",
        prompt: "",
        kbId: kbs[0]?.id || "",
        status: "pending",
        docsScrapedCount: 0,
        logs: ["正在等待输入参数配置..."],
        createdAt: new Date().toISOString(),
        taskType: "scraper"
      });
    } else if (type === "persona") {
      setSelectedTask({
        id: "draft-persona",
        name: "",
        kbIds: [],
        status: "pending",
        logs: ["正在筹备语料参数..."],
        createdAt: new Date().toISOString(),
        taskType: "persona"
      });
    } else if (type === "creation") {
      setSelectedTask({
        id: "draft-creation",
        type: "direct",
        title: "",
        theme: "",
        kbDocIds: [],
        useWebSearch: false,
        status: "pending",
        logs: ["准备文稿立意大纲..."],
        createdAt: new Date().toISOString(),
        taskType: "creation"
      });
    }
  };

  // Submission
  const handleSubmitTaskDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTask) return;
    const taskType = selectedTask.taskType;
    setSubmitting(true);
    try {
      if (taskType === 'scraper') {
        if (!scrapName.trim() || !scrapUrl.trim() || !scrapKbId) return;
        await onCreateScraperTask(scrapName, scrapUrl, scrapPrompt, scrapKbId);
      } else if (taskType === 'persona') {
        if (!persName.trim() || persKbIds.length === 0) return;
        await onCreatePersonaTask(persName, persKbIds);
      } else if (taskType === 'creation') {
        if (!creatTheme.trim()) return;
        await onCreateCreationTask({
          type: creatType,
          theme: creatTheme,
          kbDocIds: creatDocIds,
          personaId: creatPersonaId || undefined,
          useWebSearch: creatWebSearch
        });
      }
      setAwaitingNewTask(taskType);
    } catch (err) {
      console.error(err);
      alert("创建任务并执行失败，请检查参数输入！");
    } finally {
      setSubmitting(false);
    }
  };

  // Action callback forwards
  const handleSelectTopicSubmit = async (taskId: string, topic: string) => {
    try {
      await onSelectTopic(taskId, topic);
      const updated = creationTasks.find(t => t.id === taskId);
      if (updated) {
        setSelectedTask({ ...updated, status: 'writing', selectedTopic: topic, taskType: 'creation' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyText = (text: string, taskId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTaskId(taskId);
      setTimeout(() => setCopiedTaskId(null), 2000);
    });
  };

  const handleArchiveSubmit = async (taskId: string) => {
    if (!archiveKbId) return;
    try {
      await onArchiveDoc(taskId, archiveKbId);
      setArchiveSuccess(true);
      setTimeout(() => {
        setArchiveSuccess(false);
        setArchiveKbId("");
      }, 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Render lists of active space tasks
  const activeScraper = scraperTasks
    .filter(t => (t.spaceId || "space-default") === selectedSpaceId)
    .map(t => ({ ...t, taskType: 'scraper' as const }));

  const activePersona = personaTasks
    .filter(t => (t.spaceId || "space-default") === selectedSpaceId)
    .map(t => ({ ...t, taskType: 'persona' as const }));

  const activeCreation = creationTasks
    .filter(t => (t.spaceId || "space-default") === selectedSpaceId)
    .map(t => ({ ...t, taskType: 'creation' as const }));

  const allFilteredTasks = [
    ...activeScraper,
    ...activePersona,
    ...activeCreation
  ].filter(t => {
    const titleText = t.taskType === 'creation' 
      ? (t.selectedTopic || t.title || t.theme || "") 
      : t.name;
    const matchesSearch = titleText.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (typeFilter !== 'all' && t.taskType !== typeFilter) return false;

    if (statusFilter !== 'all') {
      const isRunning = ['pending', 'scraping', 'extracting', 'researching', 'writing', 'suggesting'].includes(t.status);
      const isCompleted = t.status === 'completed';
      const isFailed = ['failed', 'cancelled'].includes(t.status);
      
      if (statusFilter === 'running' && !isRunning) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'failed' && !isFailed) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Badge rendering builders
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> 成功完结
          </span>
        );
      case 'scraping':
      case 'extracting':
      case 'researching':
      case 'writing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-150/60 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> 执行中...
          </span>
        );
      case 'suggesting':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-100 text-amber-850 px-2 py-0.5 rounded border border-amber-350 animate-pulse">
            ⚠️ 待人工介入
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100">
            <AlertCircle className="w-3 h-3" /> 运行失败
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
            <XCircle className="w-3 h-3" /> 已取消
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-50 text-slate-450 px-2 py-0.5 rounded border border-slate-200">
            <Calendar className="w-3 h-3" /> 排队等候
          </span>
        );
    }
  };

  const getTypeBadge = (taskType: "scraper" | "persona" | "creation") => {
    switch (taskType) {
      case "scraper":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-600 px-2 py-0.5 rounded border border-sky-100 shrink-0 select-none">
            <Globe className="w-3 h-3 text-sky-500" /> 数据采集
          </span>
        );
      case "persona":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 shrink-0 select-none">
            <BrainCircuit className="w-3 h-3 text-emerald-500" /> 人格萃取
          </span>
        );
      case "creation":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-pink-50 text-pink-600 px-2 py-0.5 rounded border border-pink-100 shrink-0 select-none">
            <PenTool className="w-3 h-3 text-pink-500" /> 智能创作
          </span>
        );
    }
  };

  // If a task (either draft or existing) is selected, render the magnificent 3-column workspaces
  if (selectedTask) {
    const isDraft = selectedTask.id.startsWith("draft-");

    return (
      <div className="flex flex-col h-full bg-slate-55 overflow-hidden text-slate-850 sm:rounded-2xl border border-slate-200" id="task-details-workspace-view">
        
        {/* Workspace Toolbar Header */}
        <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTask(null)}
              className="flex items-center gap-1 text-[11px] font-bold bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-lg px-2.5 py-1.5 transition text-slate-700"
              id="detail-back-button"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>返回列表</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200" />
            
            <div className="text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-slate-100 text-indigo-600 font-bold border border-slate-200 px-2 py-0.5 rounded">
                  {isDraft ? "新任务构建配置" : `任务详情: ${selectedTask.id}`}
                </span>
                <span className="truncate max-w-sm text-xs font-black text-slate-800">
                  {isDraft ? `筹备新 ${getTypeBadge(selectedTask.taskType).props.children[1]} 流水` : (selectedTask.taskType === 'creation' ? (selectedTask.selectedTopic || selectedTask.title) : selectedTask.name)}
                </span>
                {!isDraft && getStatusBadge(selectedTask.status)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 hidden md:inline">支持双击或者使用每个分栏右上角 [x/展开] 手动切换视窗隐藏</span>
          </div>
        </div>

        {/* 3 Columns Flex Container */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative" id="task-detail-3columns-layout">
          
          {/* ====================================================
              COLUMN 1: TASK INFORMATION (LEFT)
             ==================================================== */}
          {colInfoOpen ? (
            <div className="flex-1 min-w-0 border-r border-slate-200 bg-white flex flex-col h-full overflow-hidden transition-all duration-300">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-slate-705 font-bold text-xs select-none">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span>[01] 任务参数与信息</span>
                </div>
                <button
                  onClick={() => setColInfoOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                  title="收起此栏"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left custom-scrollbar">
                {isDraft ? (
                  /* ====================================
                     DRAFT PARAMETERS INPUT FORM
                     ==================================== */
                  <div className="space-y-4">
                    {/* A. Scraper Draft Form */}
                    {selectedTask.taskType === 'scraper' && (
                      <div className="space-y-3.5">
                        <div className="p-2.5 bg-sky-50 border border-sky-100 rounded-xl mb-1">
                          <p className="text-[10px] text-sky-700 font-normal leading-normal">
                            请配置网络爬虫与清洗指令，我们将获取去除噪声（如页眉、侧边等）后的清洁正文。
                          </p>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">任务代号名 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={scrapName}
                            onChange={(e) => setScrapName(e.target.value)}
                            placeholder="例如：硬核前沿物理文献采集..."
                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-205 outline-none text-slate-800 focus:border-indigo-500 transition shadow-3xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">网页目标 URL 链接 <span className="text-red-500">*</span></label>
                          <input
                            type="url"
                            required
                            value={scrapUrl}
                            onChange={(e) => setScrapUrl(e.target.value)}
                            placeholder="前缀完整的合法链接(https://...)"
                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-205 outline-none text-slate-800 focus:border-indigo-500 transition font-mono shadow-3xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">入库关联知识分类挂钩 <span className="text-red-500">*</span></label>
                          <select
                            value={scrapKbId}
                            onChange={(e) => setScrapKbId(e.target.value)}
                            className="w-full bg-slate-50 text-xs px-2.5 py-2.5 rounded-xl border border-slate-205 text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 hover:bg-slate-100/60 transition shadow-3xs"
                          >
                            {kbs.map(k => (
                              <option key={k.id} value={k.id}>{k.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">清洗去噪加工 Prompt 提示词 (选配)</label>
                          <textarea
                            value={scrapPrompt}
                            onChange={(e) => setScrapPrompt(e.target.value)}
                            placeholder="例如: 仅抽提核心论点 and 研究背景，去除不相关广告和声明..."
                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-205 outline-none text-slate-800 focus:border-indigo-500 transition resize-none leading-relaxed h-20 shadow-3xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* B. Persona Draft Form */}
                    {selectedTask.taskType === 'persona' && (
                      <div className="space-y-3.5">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl mb-1">
                          <p className="text-[10px] text-emerald-700 font-normal leading-normal">
                            利用反向微格高维解密，自动克隆出该库文件的特征语气、词切口以及文笔。
                          </p>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">萃取提取的人设模名 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            required
                            value={persName}
                            onChange={(e) => setPersName(e.target.value)}
                            placeholder="例如：冷峻庄严写笔风骨、科普切口特色..."
                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-205 outline-none text-slate-800 focus:border-indigo-500 transition shadow-3xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">圈选特征事实语料库目录 (至少选择一个) <span className="text-red-500">*</span></label>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-56 overflow-y-auto space-y-2 select-none">
                            {kbs.length === 0 ? (
                              <p className="text-slate-450 text-center py-6 text-[10px] italic">库中无预存目录文件夹</p>
                            ) : (
                              kbs.map(k => {
                                const isChecked = persKbIds.includes(k.id);
                                return (
                                  <label 
                                    key={k.id} 
                                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                                      isChecked 
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setPersKbIds(prev => prev.filter(id => id !== k.id));
                                        } else {
                                          setPersKbIds(prev => [...prev, k.id]);
                                        }
                                      }}
                                      className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer mt-0.5"
                                    />
                                    <div className="text-left">
                                      <span className="text-[11px] font-bold block leading-normal">{k.name}</span>
                                      <span className="text-[9px] text-slate-505 font-mono">(范文 {(allDocs.filter(d => d.kbId === k.id).length)} 篇)</span>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* C. Creation Draft Form */}
                    {selectedTask.taskType === 'creation' && (
                      <div className="space-y-3.5">
                        <div className="p-2.5 bg-pink-50 border border-pink-100 rounded-xl mb-1">
                          <p className="text-[10px] text-pink-700 font-normal leading-normal">
                            融合下方的灵感命题、特定的风骨人设体系，AI将直接撰拟大作内容。
                          </p>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">创作进程模式</label>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg">
                            {[
                              { id: 'direct', label: '命题直写全文' },
                              { id: 'topic', label: '多方案选题裂变' }
                            ].map((opt) => (
                              <button
                                type="button"
                                key={opt.id}
                                onClick={() => setCreatType(opt.id as any)}
                                className={`px-2 py-1.5 text-[10.5px] font-bold rounded-md transition ${
                                  creatType === opt.id
                                    ? 'bg-white text-slate-800 shadow-3xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">写作调性约束模版</label>
                          <select
                            value={creatPersonaId}
                            onChange={(e) => setCreatPersonaId(e.target.value)}
                            className="w-full bg-slate-50 text-xs px-2.5 py-2.5 rounded-xl border border-slate-205 text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-indigo-500 hover:bg-slate-100/60 transition shadow-3xs"
                          >
                            <option value="">使用系统自然默认语调人设</option>
                            {personas.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-1">创作立意核心主题 / 原词大纲 <span className="text-red-500">*</span></label>
                          <textarea
                            required
                            value={creatTheme}
                            onChange={(e) => setCreatTheme(e.target.value)}
                            placeholder="如：写一篇关于硬科幻视角的星纪元衰亡史诗..."
                            className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-205 outline-none text-slate-800 focus:border-indigo-500 transition resize-none leading-relaxed h-20 shadow-3xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10.5px] font-bold text-slate-500 mb-0.5">支持参考文献引经据典</label>
                          <button
                            type="button"
                            onClick={() => {
                              setTempSelectedDocIds(creatDocIds);
                              setIsKbDocsSelectorOpen(true);
                            }}
                            className="w-full flex items-center justify-between text-left text-xs text-slate-705 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-3xs"
                          >
                            <span className="truncate text-slate-600 font-bold">已选择 {creatDocIds.length} 篇参考事实文献</span>
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 shadow-3xs">
                          <div className="text-left pr-2">
                            <span className="block text-[10.5px] font-bold text-slate-700">实时 Google 探针支持</span>
                            <span className="block text-[8.5px] text-slate-450">自动实时拉取搜索引擎最前沿的事实真相</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={creatWebSearch}
                            onChange={(e) => setCreatWebSearch(e.target.checked)}
                            className="w-4 h-4 bg-white border-slate-300 text-indigo-600 rounded focus:ring-indigo-500 shrink-0 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ====================================
                     EXISTING TASK READ-ONLY PARAMETERS
                     ==================================== */
                  <div className="space-y-4">
                    {selectedTask.taskType === 'scraper' && (
                      <div className="space-y-3 font-normal text-slate-700 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-black font-mono tracking-wider">采集代号名称</span>
                          <span className="block font-bold mt-1 text-slate-800">{selectedTask.name}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-black font-mono tracking-wider">采集源 URL 目标地址</span>
                          <a href={selectedTask.url} target="_blank" rel="noreferrer" className="block text-indigo-650 hover:underline mt-1 font-mono break-all leading-normal text-[11px] font-bold">
                            {selectedTask.url}
                          </a>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-black font-mono tracking-wider">挂靠的知识文件夹</span>
                          <span className="block font-bold mt-0.5 text-slate-800">
                            {kbs.find(kb => kb.id === selectedTask.kbId)?.name || "默认知识分类目录"}
                          </span>
                        </div>
                        {selectedTask.prompt && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-3xs">
                            <span className="block text-[9px] text-slate-455 uppercase font-black font-mono tracking-wider">清洗与过滤提示词</span>
                            <p className="block mt-1 leading-relaxed text-slate-600 italic">"{selectedTask.prompt}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedTask.taskType === 'persona' && (
                      <div className="space-y-3 text-xs text-slate-700">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-155 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-mono tracking-wider">人设风骨名称</span>
                          <span className="block font-bold mt-1 text-slate-800">{selectedTask.name}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-155 shadow-3xs space-y-1.5">
                          <span className="block text-[9px] text-slate-455 uppercase font-mono tracking-wider">引入参考的特征范本集合</span>
                          <div className="flex flex-col gap-1 pt-1">
                            {safeList(selectedTask.kbIds).map(kbId => (
                              <span key={kbId} className="inline-flex items-center gap-1.5 text-[10px] text-indigo-705 font-bold bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                <Database className="w-3 h-3 text-indigo-500" />
                                {kbs.find(k => k.id === kbId)?.name || kbId}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedTask.taskType === 'creation' && (
                      <div className="space-y-3 text-xs text-slate-700">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-mono tracking-wider">命题创作模式</span>
                          <span className="block font-extrabold mt-1 text-indigo-650">
                            {selectedTask.type === 'topic' ? "🔬 选题裂变并择一生成" : "✍️ 直接按提纲生成全文成品"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-155 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-mono tracking-wider">指定的克隆调性人设</span>
                          <span className="block font-bold mt-1 text-slate-800">
                            {personas.find(p => p.id === selectedTask.personaId)?.name || "无特定风骨，使用系统自然默认"}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-155 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-mono tracking-wider">立意主题与起草大纲</span>
                          <p className="block mt-1 font-bold leading-relaxed text-slate-800 break-words">{selectedTask.theme}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-155 shadow-3xs">
                          <span className="block text-[9px] text-slate-455 uppercase font-mono tracking-wider">引用离线事实文献数量</span>
                          <span className="block font-bold mt-1 text-slate-700">
                            📁 {safeList(selectedTask.kbDocIds).length} 篇离线文献事实段落约束
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex items-center justify-between shadow-3xs">
                          <span className="text-[10px] text-slate-500">实时 Google 引擎支撑状态</span>
                          <span className={`text-[10px] font-extrabold ${selectedTask.useWebSearch ? "text-sky-600" : "text-slate-400"}`}>
                            {selectedTask.useWebSearch ? "● Google实时探针已开启" : "不联网(仅离线语料)"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Left Col Collapsed Strip */
            <div 
              onClick={() => setColInfoOpen(true)}
              className="w-12 bg-white hover:bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4 cursor-pointer gap-2 select-none group"
            >
              <Eye className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              <div className="h-6 w-[1.5px] bg-slate-200 my-1" />
              <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500" style={{ writingMode: 'vertical-rl' }}>
                [01] 任务配置信息栏
              </span>
            </div>
          )}

          {/* ====================================================
              COLUMN 2: TASK PROCESS/STATUS (MIDDLE)
             ==================================================== */}
          {colStatusOpen ? (
            <div className="flex-1 min-w-0 flex flex-col bg-slate-50 h-full overflow-hidden transition-all duration-300">
              <div className="p-3.5 bg-white border-b border-slate-205 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-slate-705 font-bold text-xs select-none">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  <span>[02] 执行状态与沙箱控制台</span>
                </div>
                <button
                  onClick={() => setColStatusOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-805 hover:bg-slate-100 rounded transition"
                  title="收起此栏"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-left custom-scrollbar">
                
                {/* A. Status Card Box */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-450 uppercase font-bold">进程状态检测</span>
                    <span>{isDraft ? <span className="text-xs text-slate-450">新草案待启动</span> : getStatusBadge(selectedTask.status)}</span>
                  </div>

                  {isDraft ? (
                    <div className="py-2 space-y-3 text-center">
                      <p className="text-[10.5px] text-slate-400 font-normal leading-relaxed text-left">
                        请确保在左侧面板中填写的参数均已准备就绪。点击下方按钮，系统将开启隔离的微格沙箱，自动初始化智能执行流。
                      </p>
                      
                      <button
                        onClick={() => handleSubmitTaskDraft()}
                        disabled={
                          submitting || 
                          (selectedTask.taskType === 'scraper' && (!scrapName.trim() || !scrapUrl.trim() || !scrapKbId)) ||
                          (selectedTask.taskType === 'persona' && (!persName.trim() || persKbIds.length === 0)) ||
                          (selectedTask.taskType === 'creation' && !creatTheme.trim())
                        }
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:zoom-95 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black transition cursor-pointer select-none"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>正在启动智慧算法沙箱...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>确认创建并开始执行任务</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Existing task workflow states and action operators */
                    <div className="space-y-3">
                      {/* Interactive control buttons */}
                      <div className="flex flex-wrap gap-2 text-xs font-semibold pt-1">
                        {/* Cancel Scraper/Creation Tasks */}
                        {selectedTask.taskType === 'scraper' && ['pending', 'scraping'].includes(selectedTask.status) && (
                          <button
                            onClick={() => onCancelScraperTask(selectedTask.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-805 text-slate-300 hover:bg-slate-800 rounded-lg transition"
                          >
                            <StopCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>取消采集</span>
                          </button>
                        )}
                        {selectedTask.taskType === 'creation' && ['pending', 'researching', 'writing', 'suggesting'].includes(selectedTask.status) && (
                          <button
                            onClick={() => onCancelCreationTask(selectedTask.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-805 text-slate-300 hover:bg-slate-800 rounded-lg transition"
                          >
                            <StopCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>取消创作进程</span>
                          </button>
                        )}

                        {/* Retry Scraper/Creation Tasks */}
                        {selectedTask.taskType === 'scraper' && ['failed', 'cancelled'].includes(selectedTask.status) && (
                          <button
                            onClick={() => onRetryScraperTask(selectedTask.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5 animate-none" />
                            <span>重新启动执行</span>
                          </button>
                        )}
                        {selectedTask.taskType === 'creation' && ['failed', 'cancelled'].includes(selectedTask.status) && (
                          <button
                            onClick={() => onRetryCreationTask(selectedTask.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5 animate-none" />
                            <span>重新起草撰写</span>
                          </button>
                        )}

                        {/* Delete tasks */}
                        {selectedTask.taskType === 'scraper' && (
                          <button
                            onClick={() => {
                              if (window.confirm("确定要删除此采集流质日志档案吗？")) {
                                onDeleteScraperTask(selectedTask.id);
                                setSelectedTask(null);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/20 border border-rose-900 text-rose-350 hover:bg-rose-950/40 rounded-lg transition ml-auto"
                            title="一键销毁"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>销毁记录</span>
                          </button>
                        )}
                        {selectedTask.taskType === 'creation' && (
                          <button
                            onClick={() => {
                              if (window.confirm("确定要删除此写作大作的轨迹及成品吗？")) {
                                onDeleteCreationTask(selectedTask.id);
                                setSelectedTask(null);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/20 border border-rose-900 text-rose-350 hover:bg-rose-950/40 rounded-lg transition ml-auto"
                            title="一键销毁"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>销毁创作</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* B. Execution Live Logs terminal console */}
                <div className="flex-1 flex flex-col min-h-[180px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-900/40 border-b border-slate-805 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none shrink-0">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-505 animate-ping"></span>
                      <span>LIVE TERMINAL CONSOLE LOGS OUTPUT</span>
                    </span>
                    <button 
                      onClick={() => {
                        if (logTerminalRef.current) {
                          logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
                        }
                      }}
                      className="text-[9px] hover:text-white"
                    >
                      [滚动置底]
                    </button>
                  </div>

                  <div 
                    ref={logTerminalRef}
                    className="flex-1 p-4 overflow-y-auto font-mono text-[10px] text-emerald-400 leading-normal space-y-1.5 text-left custom-scrollbar"
                  >
                    {isDraft ? (
                      <div className="text-slate-500 italic space-y-1">
                        <p>&gt; terminal_stdout: awaiting_parameters...</p>
                        <p>&gt; 在左侧分栏输入并点击'确认开始执行'，底层AI引擎进程将实时映射日志于此。</p>
                      </div>
                    ) : (
                      (!selectedTask.logs || selectedTask.logs.length === 0) ? (
                        <p className="text-slate-650 italic">&gt; [INFO] 已经激活高维执行沙箱。尚未收集到新的日志记录...</p>
                      ) : (
                        selectedTask.logs.map((log, index) => (
                          <div key={index} className="border-b border-slate-900/60 pb-0.5 mb-1 text-emerald-300">
                            <span className="text-slate-600 mr-2.5 font-bold">[{index + 1}]</span>
                            <span className="whitespace-pre-wrap">{log}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Middle Col Collapsed Strip */
            <div 
              onClick={() => setColStatusOpen(true)}
              className="w-12 bg-white hover:bg-slate-50 border-r border-slate-200 flex flex-col items-center py-4 cursor-pointer gap-2 select-none group"
            >
              <Eye className="w-4 h-4 text-slate-400 group-hover:text-slate-705" />
              <div className="h-6 w-[1.5px] bg-slate-200 my-1" />
              <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500" style={{ writingMode: 'vertical-rl' }}>
                [02] 进程运行控制台
              </span>
            </div>
          )}

          {/* ====================================================
              COLUMN 3: TASK RESULTS / VALUE (RIGHT)
             ==================================================== */}
          {colResultOpen ? (
            <div className="flex-1 min-w-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden transition-all duration-300">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-slate-705 font-bold text-xs select-none">
                  <Award className="w-4 h-4 text-emerald-555" />
                  <span>[03] 沙箱创造成果与归档</span>
                </div>
                <button
                  onClick={() => setColResultOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                  title="收起此栏"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left custom-scrollbar">
                {isDraft ? (
                  /* Drafting Output graphics */
                  <div className="text-center py-20 px-4 text-slate-600 flex flex-col justify-center items-center h-full">
                    <LayoutGrid className="w-10 h-10 mb-3 text-slate-700 animate-pulse" />
                    <h5 className="text-xs font-bold text-slate-400">成果产出区域</h5>
                    <p className="text-[10px] text-slate-550 mt-1.5 leading-relaxed font-normal">
                      目前该流仍处于“配置起草中”状态。完成参数设定并启动执行流后，采集清洗落库文章数、反解提取的笔触语气调性、爆款创作成品，均将集中在此区域内无缝呈现。
                    </p>
                  </div>
                ) : (
                  /* ====================================
                     EXISTING TASK VALUE RENDERS
                     ==================================== */
                  <div className="space-y-4">
                    
                    {/* A. Scraper Task values */}
                    {selectedTask.taskType === 'scraper' && (
                      <div className="space-y-4">
                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-center select-none shadow-3xs">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold">成功采集清洗段落篇数</span>
                          <span className="block text-3xl font-black text-indigo-650 mt-2">
                             ✨ {selectedTask.docsScrapedCount ?? 0} <span className="text-xs">篇</span>
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          <span className="text-[10.5px] font-bold text-slate-750 block pb-1 border-b border-slate-200">入库文章及摘要映射 :</span>
                          {allDocs.filter(d => d.kbId === selectedTask.kbId).length === 0 ? (
                            <p className="text-[10px] font-normal leading-relaxed text-slate-400 italic py-6 text-center">空空如也，尚未采集到可用范章碎片</p>
                          ) : (
                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                              {allDocs
                                .filter(d => d.kbId === selectedTask.kbId)
                                .map((doc, idx) => (
                                  <div key={doc.id} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-xs leading-relaxed text-slate-700 shadow-4xs">
                                    <span className="text-[10px] block font-bold text-indigo-700 font-mono">[{idx + 1}] {doc.title}</span>
                                    <p className="text-[9.5px] text-slate-500 line-clamp-2 mt-1 leading-normal font-normal">
                                      {doc.content}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* B. Persona Extracted traits values */}
                    {selectedTask.taskType === 'persona' && (
                      <div className="space-y-4">
                        {selectedTask.status !== 'completed' ? (
                          <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <span className="inline-block animate-spin rounded-full w-4.5 h-4.5 border-t-2 border-indigo-650 mb-1"></span>
                            <p className="text-[10px] font-medium text-slate-600">算法调性解析中。提取克隆拟合人设后将立即为您展示语气调性细节骨骼。</p>
                          </div>
                        ) : (() => {
                          const matchingPersona = personas.find(p => p.id === selectedTask.personaId);
                          if (!matchingPersona) {
                            return <p className="text-xs text-slate-500 italic text-center">克隆人设提取失败，未能形成有效调性资产模型</p>;
                          }
                          return (
                            <div className="space-y-3.5">
                              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-805 rounded-xl leading-normal text-xs text-left font-normal select-none shadow-3xs">
                                <h5 className="font-extrabold text-[12.5px] text-emerald-800 mb-1">萃成调性: {matchingPersona.name}</h5>
                                <p className="text-[9.5px] text-slate-600 leading-relaxed font-mono">{matchingPersona.description}</p>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-550 font-mono block">语气态度约束 (Tone)</span>
                                <p className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[10.5px] text-slate-700 leading-relaxed font-medium shadow-4xs">
                                  {matchingPersona.extractedTraits.tone}
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-550 font-mono block">常用修辞风骨 (Writing Style)</span>
                                <p className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-[10.5px] text-slate-705 leading-relaxed font-normal shadow-4xs">
                                  {matchingPersona.extractedTraits.writingStyle}
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black uppercase text-slate-555 font-mono block">常高频词组切口</span>
                                <div className="flex flex-wrap gap-1">
                                  {safeList(matchingPersona.extractedTraits.keywords).map((kw, i) => (
                                    <span key={i} className="text-[9.5px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded shadow-4xs">
                                      #{kw}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {matchingPersona.extractedTraits.samplePassage && (
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black uppercase text-slate-550 font-mono block">典型拟模范例小卡</span>
                                  <p className="p-2.5 bg-emerald-50/40 border-l-[3px] border-emerald-500 text-[10px] text-slate-700 italic border-y border-r border-emerald-100 rounded-r-lg whitespace-normal font-mono select-none">
                                    "{matchingPersona.extractedTraits.samplePassage}"
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* C. Creation generated values (Suggested topics selection / Resulting article) */}
                    {selectedTask.taskType === 'creation' && (
                      <div className="space-y-4">
                        
                        {/* 1. Topics Selection List mapping when still in 'suggesting' stage */}
                        {selectedTask.status === 'suggesting' && selectedTask.suggestedTopics && (
                          <div className="p-3 bg-indigo-50 border border-indigo-200/60 rounded-xl text-left space-y-2 shadow-3xs">
                            <span className="text-[10px] text-indigo-750 font-black block leading-normal uppercase">
                              💡 选题库裂变挑选 (已暂停，需人工决策介入):
                            </span>
                            <p className="text-[9.5px] text-slate-600 leading-relaxed font-medium">请在以下多维方案选题成果中选择任意一个意向，新文将即时按此选题自适应扩展直写物料:</p>
                            <div className="space-y-2 mt-2">
                              {selectedTask.suggestedTopics.map((topic, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => handleSelectTopicSubmit(selectedTask.id, topic)}
                                  className="p-2.5 bg-white hover:bg-indigo-50/40 hover:border-indigo-300 cursor-pointer rounded-lg border border-slate-205 leading-normal text-xs text-slate-800 shadow-4xs transition"
                                >
                                  <span className="text-indigo-600 mr-1.5 font-bold">[{idx + 1}]</span>
                                  <span>{topic}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. Generation Completed draft markdown block rendering */}
                        {selectedTask.status === 'completed' && selectedTask.generatedContent && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-1 leading-normal select-none">
                                <Check className="w-3.5 h-3.5" /> 创稿文案成品
                              </span>
                              
                              <button
                                onClick={() => handleCopyText(selectedTask.generatedContent || "", selectedTask.id)}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-650 bg-indigo-50 hover:bg-slate-100 border border-indigo-250 rounded px-2 py-1 shadow-4xs transition"
                              >
                                {copiedTaskId === selectedTask.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>文字已复制</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>复制全文</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Text preview box */}
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[10.5px] text-slate-800 leading-relaxed font-mono select-text whitespace-pre-wrap max-h-80 overflow-y-auto shadow-inner">
                              {selectedTask.generatedContent}
                            </div>

                            {/* Document Archive tools */}
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-left font-normal mt-3 shadow-3xs">
                              <span className="block text-[10px] font-bold text-slate-705 leading-normal">💼 快速归纳充入知识分类文件夹:</span>
                              
                              <div className="flex flex-col sm:flex-row gap-1.5">
                                <select
                                  value={archiveKbId}
                                  onChange={(e) => {
                                    setArchiveKbId(e.target.value);
                                    setArchiveSuccess(false);
                                  }}
                                  className="bg-white text-slate-805 text-[10.5px] p-2 rounded border border-slate-200 outline-none cursor-pointer flex-1 focus:border-indigo-500 transition"
                                >
                                  <option value="">选取对应目标知识库...</option>
                                  {kbs.map(k => (
                                    <option key={k.id} value={k.id}>{k.name}</option>
                                  ))}
                                </select>

                                <button
                                  onClick={() => handleArchiveSubmit(selectedTask.id)}
                                  disabled={!archiveKbId || archiveSuccess}
                                  className={`px-3 py-1.5 text-[9.5px] font-black rounded transition shrink-0 ${
                                    (!archiveKbId || archiveSuccess)
                                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-4xs"
                                  }`}
                                >
                                  {archiveSuccess ? "已成功落库文件夹" : "确认落库"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Loading stage */}
                        {['researching', 'writing', 'pending'].includes(selectedTask.status) && (
                          <div className="py-16 text-center border border-dashed border-indigo-250 bg-indigo-50/20 rounded-xl flex flex-col p-4 justify-center items-center">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-650 mb-2" />
                            <h5 className="text-xs font-bold text-indigo-850">正在按要求研拟大作草稿全文...</h5>
                            <p className="text-[9.5px] text-slate-600 leading-relaxed mt-1">大约需要 10 ~ 20 秒。后台沙箱会自动运作，研拟完毕在这里立即可视大做文稿，可稍作休息。</p>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Right Col Collapsed Strip */
            <div 
              onClick={() => setColResultOpen(true)}
              className="w-12 bg-white hover:bg-slate-50 border-l border-slate-200 flex flex-col items-center py-4 cursor-pointer gap-2 select-none group"
            >
              <Eye className="w-4 h-4 text-slate-400 group-hover:text-slate-705" />
              <div className="h-6 w-[1.5px] bg-slate-200 my-1" />
              <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500" style={{ writingMode: 'vertical-rl' }}>
                [03] 沙箱结果大作输出栏
              </span>
            </div>
          )}

        </div>

        {/* ====================================================
            NESTS SUB-SELECTOR FOR DOC PICKER (Used in Creation references)
           ==================================================== */}
        {isKbDocsSelectorOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }} id="nested-docs-selector">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden text-left" id="inner-docs-selector-modal">
              
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-4.5 h-4.5 text-indigo-500" />
                    <span>勾选事实参考文献或范章定位</span>
                  </h4>
                  <p className="text-[10px] text-slate-450 mt-1">
                    选择并锁定作为本文创制依据的经典参考信息。支持多篇章勾选。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKbDocsSelectorOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 bg-white border border-slate-200 rounded transition shrink-0"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Split layout: left folder & right doc files */}
              <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/50" id="docs-split-view">
                
                {/* LEFT FOLDER COLUMN */}
                <div className="w-1/3 border-r border-slate-150 p-3.5 space-y-2 overflow-y-auto bg-slate-50">
                  <div className="text-left pb-1 border-b border-slate-200 select-none">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      参考文件夹及目录
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {kbs.length === 0 ? (
                      <p className="text-[10px] italic text-slate-400 text-center py-6">库中无预设文件夹</p>
                    ) : (
                      kbs.map(kb => {
                        const kbDocs = allDocs.filter(d => d.kbId === kb.id);
                        const kbDocIds = kbDocs.map(d => d.id);
                        
                        const isAllDocsChecked = kbDocIds.length > 0 && kbDocIds.every(id => tempSelectedDocIds.includes(id));
                        const isSelectedKb = activeKbId === kb.id;

                        const handleKbToggle = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (isAllDocsChecked || tempSelectedKbIds.includes(kb.id)) {
                            setTempSelectedKbIds(prev => prev.filter(id => id !== kb.id));
                            setTempSelectedDocIds(prev => prev.filter(id => !kbDocIds.includes(id)));
                          } else {
                            setTempSelectedKbIds(prev => [...new Set([...prev, kb.id])]);
                            if (kbDocs.length > 0) {
                              setTempSelectedDocIds(prev => [...new Set([...prev, ...kbDocIds])]);
                            }
                          }
                        };

                        return (
                          <div
                            key={kb.id}
                            onClick={() => setActiveKbId(kb.id)}
                            className={`p-2 rounded-lg border text-left flex items-start gap-2 cursor-pointer transition ${
                              isSelectedKb 
                                ? 'bg-indigo-50 border-indigo-205 text-indigo-700 font-bold shadow-3xs'
                                : 'border-transparent text-slate-505 hover:bg-slate-100 hover:text-slate-800'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0" onClick={handleKbToggle}>
                              <input
                                type="checkbox"
                                checked={isAllDocsChecked || (kbDocs.length === 0 && tempSelectedKbIds.includes(kb.id))}
                                onChange={() => {}} // Swallowed in click
                                className="rounded border-slate-300 bg-white text-indigo-600 h-3.5 w-3.5 cursor-pointer focus:ring-indigo-500"
                              />
                            </div>
                            <span className="text-[11px] truncate flex-grow block">{kb.name}</span>
                            <span className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 rounded font-mono font-bold shrink-0">
                              {kbDocs.length}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RIGHT ARTICLES INDEX */}
                <div className="flex-1 flex flex-col h-full bg-white">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-150 text-left shrink-0">
                    <span className="text-[9px] font-black text-slate-505 uppercase tracking-widest">
                      定位文献草稿篇章
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 space-y-2 bg-white">
                    {allDocs.filter(d => d.kbId === activeKbId).length === 0 ? (
                      <div className="text-center py-12 text-slate-400 bg-white">
                        <p className="text-xs italic">该目录下尚无被引文献范本成果。</p>
                      </div>
                    ) : (
                      allDocs
                        .filter(d => d.kbId === activeKbId)
                        .map((doc) => {
                          const isChecked = tempSelectedDocIds.includes(doc.id);
                          const handleToggle = () => {
                            if (isChecked) {
                              setTempSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                            } else {
                              setTempSelectedDocIds(prev => [...prev, doc.id]);
                            }
                          };

                          return (
                            <div
                              key={doc.id}
                              onClick={handleToggle}
                              className={`p-2.5 rounded-xl border transition cursor-pointer text-left flex items-start gap-2.5 ${
                                isChecked
                                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-3xs'
                                  : 'bg-slate-50/55 border-slate-150 hover:bg-slate-100/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Swallowed in click
                                className="rounded border-slate-300 bg-white text-indigo-600 h-3.5 w-3.5 mt-0.5 shrink-0 cursor-pointer focus:ring-indigo-505"
                              />
                              <div className="min-w-0 flex-grow text-slate-700">
                                <span className="text-[11px] font-extrabold block truncate text-slate-800">{doc.title}</span>
                                <span className="text-[9px] text-slate-450 mt-0.5 block font-mono">
                                  (录入时间: {new Date(doc.createdAt).toLocaleDateString()} | {doc.content.length} 字)
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

              </div>

              {/* Actions footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-500">
                  已精选锁定 <span className="font-bold text-indigo-650">{tempSelectedDocIds.length}</span> 篇文献段落作为灵流创稿依托
                </span>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsKbDocsSelectorOpen(false)}
                    className="px-3.5 py-1.5 text-slate-500 border border-slate-205 bg-white rounded-lg hover:bg-slate-100 transition shadow-4xs font-bold"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatDocIds(tempSelectedDocIds);
                      setIsKbDocsSelectorOpen(false);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-3xs"
                  >
                    保存锁定
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // Helper safe mapper for arrays
  function safeList<T>(list: T[] | undefined): T[] {
    return list || [];
  }

  /* ====================================================
     MAIN STREAM VIEWPORT (selectedTask IS NULL)
     Two panels: persistent left create selection, and right list view.
     ==================================================== */
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-slate-50" id="all-tasks-panel">
      
      {/* 2-Column Core Split Layout */}
      <div className="flex-1 flex gap-5 p-5 min-h-0 overflow-hidden" id="workspace-main-split">
        
        {/* ====================================================
            LEFT PERSISTENT PANEL: CREATE TASK QUICK PANEL
           ==================================================== */}
        <div className="w-[310px] bg-white rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col p-4 shrink-0 h-full overflow-hidden text-left" id="sidebar-new-task-quick-selector">
          <div className="border-b border-slate-100 pb-2.5 mb-2.5 shrink-0" id="quick-panel-top">
            <h3 className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5 uppercase">
              <Plus className="w-4 h-4 text-indigo-650" />
              新建创意沙盒任务
            </h3>
            <p className="text-[10px] text-slate-400 font-normal leading-relaxed mt-1">
              免除繁杂配置，点击下方特定模块即可秒级激活详情沙盒分栏进行参数拟定与启动执行。
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 custom-scrollbar" id="quick-panel-types-list">
            
            {/* 1. Scraper Module Card */}
            <div 
              onClick={() => handleInitiateDraft("scraper")}
              className="p-3.5 bg-white border border-slate-150/90 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/5 cursor-pointer transition flex items-start gap-3 shadow-3xs group"
              title="新建文章/评论抓取清洗流水线"
            >
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0 mt-0.5 group-hover:bg-sky-100 transition">
                <Globe className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="text-[11.5px] font-black text-slate-750">数据采集与网页爬取</h4>
                <p className="text-[9.5px] text-slate-450 leading-relaxed font-normal">
                  摄纳指定灵感目标网站、范文篇章，AI自动清洗去噪，完美落归指定的分类文件夹。
                </p>
                <div className="flex items-center gap-1 mt-1 font-bold text-[9px] text-indigo-600 transition opacity-0 group-hover:opacity-100">
                  <span>直达配置页</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            {/* 2. Persona Engine Card */}
            <div 
              onClick={() => handleInitiateDraft("persona")}
              className="p-3.5 bg-white border border-slate-150/90 rounded-xl hover:border-indigo-400 hover:bg-emerald-50/5 cursor-pointer transition flex items-start gap-3 shadow-3xs group"
              title="新建人格写作态度反解克隆流水线"
            >
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5 group-hover:bg-emerald-100 transition">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="text-[11.5px] font-black text-slate-750">写作调性人设萃取</h4>
                <p className="text-[9.5px] text-slate-450 leading-relaxed font-normal">
                  引入指定的典型范文集，深度反编译萃取写手的修辞风骨、特定口头词切口。
                </p>
                <div className="flex items-center gap-1 mt-1 font-bold text-[9px] text-emerald-600 transition opacity-0 group-hover:opacity-100">
                  <span>直达配置页</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

            {/* 3. Intelligent Content Creator Card */}
            <div 
              onClick={() => handleInitiateDraft("creation")}
              className="p-3.5 bg-white border border-slate-150/90 rounded-xl hover:border-indigo-400 hover:bg-pink-50/5 cursor-pointer transition flex items-start gap-3 shadow-3xs group"
              title="新建选题或全文命题起草流水线"
            >
              <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl shrink-0 mt-0.5 group-hover:bg-pink-100 transition">
                <PenTool className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="text-[11.5px] font-black text-slate-750">智能撰写文案大作</h4>
                <p className="text-[9.5px] text-slate-450 leading-relaxed font-normal">
                  圈选刚学成的克隆笔触、结合引经据典的大纲，并联网搜索，起草全文。
                </p>
                <div className="flex items-center gap-1 mt-1 font-bold text-[9px] text-pink-650 transition opacity-0 group-hover:opacity-100">
                  <span>直达配置页</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ====================================================
            RIGHT PANEL: FILTERABLE TASK ENGINE LISTS
           ==================================================== */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-3xs flex flex-col overflow-hidden p-4" id="task-list-scaffolder">
          
          {/* Header row stats description */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 select-none shrink-0 text-left" id="list-header-row">
            <div>
              <h2 className="text-[13px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-indigo-650 animate-none" />
                创意沙盒任务全景列表 ({allFilteredTasks.length})
              </h2>
              <p className="text-[10px] text-slate-450 mt-1">融合采集清洗、解密克隆、文案大作撰笔等流水线进程。</p>
            </div>
          </div>

          {/* Type filters row & Status filters row */}
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between py-3 border-b border-dashed border-slate-100 shrink-0" id="list-filters-container">
            
            <div className="flex flex-wrap items-center gap-1.5" id="type-filter-group">
              <span className="text-[9.5px] font-bold text-slate-400 select-none uppercase tracking-wide mr-1 mt-0.5">类型过滤:</span>
              {[
                { id: 'all', label: '全部列表' },
                { id: 'scraper', label: '网页采集' },
                { id: 'persona', label: '调性萃取' },
                { id: 'creation', label: '爆款创稿' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setTypeFilter(item.id as any)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition ${
                    typeFilter === item.id 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg shrink-0" id="status-filter-group">
              {[
                { id: 'all', label: '全部状态' },
                { id: 'running', label: '进行中' },
                { id: 'completed', label: '已完成' },
                { id: 'failed', label: '已失败' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                    statusFilter === st.id 
                      ? 'bg-white text-slate-850 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search filters input */}
          <div className="py-2.5 shrink-0" id="list-search-input-wrap">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-405" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="按任务标题、内容立意、主旨大纲或者源地址搜索..."
                className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2 border border-slate-205 focus:border-indigo-500 rounded-xl pl-9 outline-none transition font-sans"
              />
            </div>
          </div>

          {/* Scroller list content */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5 mt-2 custom-scrollbar" id="list-tasks-wrapper">
            {allFilteredTasks.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/15 flex flex-col items-center justify-center h-full">
                <Layers className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">当前没有检索到任何创意任务痕迹</p>
                <p className="text-[10px] text-slate-450 mt-1 max-w-sm leading-normal">
                  您可以立刻使用<b>左侧 persistent panel</b> 选项来发起新的数据抓取、人设提纯深度解析或智能创稿任务！
                </p>
              </div>
            ) : (
              allFilteredTasks.map((t) => {
                const titleHeading = t.taskType === 'creation' 
                  ? (t.selectedTopic || t.title || t.theme) 
                  : t.name;

                const isInterventionRequired = t.status === 'suggesting';

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      // Set default column views to open
                      setColInfoOpen(true);
                      setColStatusOpen(true);
                      setColResultOpen(true);
                      setSelectedTask(t);
                    }}
                    className={`p-4 border ${
                      isInterventionRequired 
                        ? 'border-amber-300 bg-amber-50/20 hover:border-amber-450 hover:bg-amber-50/40 shadow-xs' 
                        : 'border-slate-150 bg-white hover:border-indigo-200 hover:bg-slate-50/50 shadow-3xs'
                    } rounded-xl cursor-pointer transition flex flex-col justify-between gap-3 shadow-3xs text-left group`}
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(t.taskType)}
                        <h3 className="font-extrabold text-slate-800 text-[12.5px] truncate max-w-sm sm:max-w-md">{titleHeading}</h3>
                        {getStatusBadge(t.status)}
                      </div>

                      {isInterventionRequired && (
                        <div className="bg-amber-550/10 border border-amber-250 text-amber-850 text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 leading-normal animate-pulse select-none">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping shrink-0" />
                          <span>待人工干预协同：系统流程已暂停，需人工确认/介入后方可继续执行下一步</span>
                        </div>
                      )}

                      <div className="text-[10.5px] text-slate-500 font-normal space-y-0.5 leading-relaxed pl-0.5">
                        {t.taskType === 'scraper' && (
                          <p className="truncate"><span className="text-slate-400">网页路径:</span> <span className="font-mono text-indigo-650">{t.url}</span></p>
                        )}
                        {t.taskType === 'persona' && (
                          <p className="truncate">
                            <span className="text-slate-400">参考事实语料:</span> <span className="text-slate-705 font-bold">包含 {safeList(t.kbIds).length} 个特定的特定语流分类目录</span>
                          </p>
                        )}
                        {t.taskType === 'creation' && (
                          <p className="truncate">
                            <span className="text-slate-400">主题内容大纲:</span> <span className="text-slate-705 font-bold">{t.theme}</span>
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5 font-sans font-normal">
                          <span>创建日期: {new Date(t.createdAt).toLocaleString()}</span>
                          <span>|</span>
                          <span className="font-mono select-all">流水 ID: {t.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-between sm:justify-end gap-1.5 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                      <span className="text-[11px] font-bold text-indigo-500 group-hover:underline flex items-center gap-0.5 py-1">
                        <span>配置详情页</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
