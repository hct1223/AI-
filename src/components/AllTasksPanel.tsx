import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, Globe, BrainCircuit, PenTool, Database, Layers, CheckCircle, 
  Loader2, AlertCircle, XCircle, Calendar, ArrowRight, Clipboard, ChevronRight, 
  Terminal, Play, Trash2, StopCircle, RotateCcw, Lock, ShieldAlert, Award, 
  Archive, Check, Copy, FileText, Info, HelpCircle
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
  // Navigation & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "scraper" | "persona" | "creation">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "completed" | "failed">("all");

  // Selection/Detail States
  const [selectedTask, setSelectedTask] = useState<CombinedTask | null>(null);
  
  // Unified Creation Dialog States
  const [localCreateOpen, setLocalCreateOpen] = useState(false);
  const isCreateOpen = externalCreateOpen !== undefined ? externalCreateOpen : localCreateOpen;
  const setIsCreateOpen = setExternalCreateOpen !== undefined ? setExternalCreateOpen : setLocalCreateOpen;

  const [creationStep, setCreationStep] = useState<1 | 2>(1);
  const [chosenTaskType, setChosenTaskType] = useState<"scraper" | "persona" | "creation" | null>(null);

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

  // Form states - Submitting indicator
  const [submitting, setSubmitting] = useState(false);

  // Selector Nested Popups
  const [isKbDocsSelectorOpen, setIsKbDocsSelectorOpen] = useState(false);
  const [tempSelectedDocIds, setTempSelectedDocIds] = useState<string[]>([]);
  const [tempSelectedKbIds, setTempSelectedKbIds] = useState<string[]>([]);
  const [activeKbId, setActiveKbId] = useState<string>("");

  // Detail Modal Interaction States
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [archiveKbId, setArchiveKbId] = useState("");
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  
  // Log Terminal Auto-scroll ref
  const logTerminalRef = useRef<HTMLDivElement | null>(null);

  // Auto-set selected default collection KB for scraper
  useEffect(() => {
    if (kbs.length > 0) {
      if (!scrapKbId) setScrapKbId(kbs[0].id);
      if (!activeKbId) setActiveKbId(kbs[0].id);
    }
  }, [kbs]);

  // Sync active task details to pick up background polling updates
  useEffect(() => {
    if (selectedTask) {
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

  // Handle auto-scroll of logs when logs extend
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [selectedTask]);

  // Map tasks together
  const activeScraper = scraperTasks
    .filter(t => (t.spaceId || "space-1") === selectedSpaceId)
    .map(t => ({ ...t, taskType: 'scraper' as const }));

  const activePersona = personaTasks
    .filter(t => (t.spaceId || "space-1") === selectedSpaceId)
    .map(t => ({ ...t, taskType: 'persona' as const }));

  const activeCreation = creationTasks
    .filter(t => (t.spaceId || "space-1") === selectedSpaceId)
    .map(t => ({ ...t, taskType: 'creation' as const }));

  const allFilteredTasks = [
    ...activeScraper,
    ...activePersona,
    ...activeCreation
  ].filter(t => {
    // 1. Search filter
    const titleText = t.taskType === 'creation' 
      ? (t.selectedTopic || t.title || t.theme || "") 
      : t.name;
    const matchesSearch = titleText.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Type filter
    if (typeFilter !== 'all' && t.taskType !== typeFilter) return false;

    // 3. Status filter
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

  // Task Status Badges helper method
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
            <Loader2 className="w-3 h-3 animate-spin" /> 运行中...
          </span>
        );
      case 'suggesting':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-205 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> 各方选题中
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100">
            <AlertCircle className="w-3 h-3" /> 执行失败
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-205">
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

  // Type Badges helper method
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

  // Copy helper
  const handleCopyText = (text: string, taskId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTaskId(taskId);
      setTimeout(() => setCopiedTaskId(null), 2000);
    });
  };

  // Archive helper
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

  // Creation Submits
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenTaskType) return;
    setSubmitting(true);
    try {
      if (chosenTaskType === 'scraper') {
        if (!scrapName.trim() || !scrapUrl.trim() || !scrapKbId) return;
        await onCreateScraperTask(scrapName, scrapUrl, scrapPrompt, scrapKbId);
        // Reset
        setScrapName("");
        setScrapUrl("");
        setScrapPrompt("");
      } else if (chosenTaskType === 'persona') {
        if (!persName.trim() || persKbIds.length === 0) return;
        await onCreatePersonaTask(persName, persKbIds);
        // Reset
        setPersName("");
        setPersKbIds([]);
      } else if (chosenTaskType === 'creation') {
        if (!creatTheme.trim()) return;
        await onCreateCreationTask({
          type: creatType,
          theme: creatTheme,
          kbDocIds: creatDocIds,
          personaId: creatPersonaId || undefined,
          useWebSearch: creatWebSearch
        });
        // Reset
        setCreatTheme("");
        setCreatDocIds([]);
        setCreatPersonaId("");
        setCreatWebSearch(false);
      }
      setIsCreateOpen(false);
      setCreationStep(1);
      setChosenTaskType(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectTopicSubmit = async (taskId: string, topic: string) => {
    try {
      await onSelectTopic(taskId, topic);
      // Toggle details overlay sync
      const updated = creationTasks.find(t => t.id === taskId);
      if (updated) {
        setSelectedTask({ ...updated, status: 'writing', selectedTopic: topic, taskType: 'creation' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden p-6 text-slate-800" id="all-tasks-panel">
      
      {/* 1. Header with Stats & Actions */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60 shrink-0" id="all-tasks-header">
        <div className="text-left">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4.5 h-4.5 text-indigo-650" />
            统一创意工作空间总揽
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-normal">
            融合该空间内【数据采集】、【语调语格萃取】与【智能AI创稿】所有类型流水线进程，查看全貌状态及完成的创作。
          </p>
        </div>

        <button
          onClick={() => {
            setCreationStep(1);
            setChosenTaskType(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-100 shrink-0"
          id="global-create-task-btn"
        >
          <Plus className="w-4 h-4" />
          <span>新建空间任务</span>
        </button>
      </div>

      {/* 2. Unified List Card container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden p-5" id="all-tasks-content">
        
        {/* Filters bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0" id="all-tasks-filters">
          <div className="flex flex-wrap gap-2 items-center" id="filter-type-toggles">
            <span className="text-[10px] font-bold text-slate-400 uppercase select-none">任务类型:</span>
            {[
              { id: 'all', label: '全部列表' },
              { id: 'scraper', label: '数据采集' },
              { id: 'persona', label: '人格特征' },
              { id: 'creation', label: '智能创作' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition ${
                  typeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0" id="filter-status-toggles">
            {[
              { id: 'all', label: '全部状态' },
              { id: 'running', label: '进行中' },
              { id: 'completed', label: '已完结' },
              { id: 'failed', label: '已失败' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition ${
                  statusFilter === st.id
                    ? 'bg-white text-slate-800 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-705'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input bar */}
        <div className="mb-4 shrink-0" id="all-tasks-search-bar">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="按任务标题、内容立意、主旨或者语流线检索任务名称..."
              className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition"
            />
          </div>
        </div>

        {/* List of Tasks Scroll View */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1" id="all-tasks-results-list">
          {allFilteredTasks.length === 0 ? (
            <div className="bg-slate-50/20 rounded-2xl border border-dashed border-slate-200 py-24 text-center flex flex-col justify-center items-center h-full" id="all-tasks-empty">
              <Layers className="w-10 h-10 text-slate-350 mb-2.5" />
              <p className="text-xs font-bold text-slate-650">在这个维度里尚无匹配的智能任务迹象</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                建议消除筛选偏好、搜索词，或者立刻在右上角触发 <b>“新建空间任务”</b> 自如开天辟地。
              </p>
            </div>
          ) : (
            allFilteredTasks.map((t) => {
              const nameText = t.taskType === 'creation'
                ? (t.selectedTopic || t.title || t.theme || "智慧AI内容创作室")
                : t.name;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="p-4 rounded-xl border border-slate-150/70 bg-white hover:border-indigo-200 hover:bg-slate-50/40 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-left"
                  id={`all-task-item-${t.id}`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(t.taskType)}
                      <h3 className="font-bold text-slate-800 text-xs md:text-sm truncate max-w-lg">{nameText}</h3>
                      <span className="shrink-0">{getStatusBadge(t.status)}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-normal space-y-0.5 pl-1 leading-relaxed">
                      {t.taskType === 'scraper' && (
                        <p className="truncate"><span className="text-slate-450">抓取地址:</span> <span className="font-mono text-indigo-650">{t.url}</span></p>
                      )}
                      {t.taskType === 'persona' && (
                        <p className="truncate">
                          <span className="text-slate-450">语料知识范围:</span> <span className="text-slate-700 font-medium">包含 {(t.kbIds || []).length} 个特定的语流知识库和多篇文章语料</span>
                        </p>
                      )}
                      {t.taskType === 'creation' && (
                        <p className="truncate">
                          <span className="text-slate-450">创作原词大纲:</span> <span className="text-indigo-605">{t.theme}</span>
                          {t.personaId && (
                            <span className="ml-2 font-semibold text-slate-600 bg-slate-100 px-1 py-0.5 rounded text-[9.5px]">
                              使用调性 - {personas.find(p => p.id === t.personaId)?.name || '未名人格'}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-normal">
                        触发于: {new Date(t.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 md:justify-end">
                    <span className="text-[11px] text-indigo-500 font-bold hover:underline py-1 px-1.5 flex items-center gap-1">
                      <span>详情</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Detailed Modal Drawer depending on Task Type */}
      {selectedTask && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="task-detail-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden max-h-[90vh] text-left" id="task-detail-modal">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  {selectedTask.taskType === 'scraper' && <Globe className="w-5 h-5 text-indigo-600" />}
                  {selectedTask.taskType === 'persona' && <BrainCircuit className="w-5 h-5 text-indigo-600" />}
                  {selectedTask.taskType === 'creation' && <PenTool className="w-5 h-5 text-indigo-600" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-850 flex items-center gap-2">
                    {getTypeBadge(selectedTask.taskType)} 
                    <span>
                      {selectedTask.taskType === 'creation' 
                        ? (selectedTask.selectedTopic || selectedTask.title || "创作大作考镜详情") 
                        : selectedTask.name
                      }
                    </span>
                  </h3>
                  <p className="text-[9.5px] text-slate-450 mt-1">
                    创建于: {new Date(selectedTask.createdAt).toLocaleString()} | 流水标签: <span className="font-mono">{selectedTask.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition"
              >
                <XCircle className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6" id="task-detail-content-frame">
              
              {/* ==================== A. SCRAPER TASK DETAIL ==================== */}
              {selectedTask.taskType === 'scraper' && (
                <div className="space-y-4" id="scraper-task-detail">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl select-none">
                      <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">采集数据源链接</span>
                      <a href={selectedTask.url} target="_blank" rel="noreferrer" className="block text-[11px] font-bold text-indigo-600 hover:underline mt-1 truncate">
                        {selectedTask.url}
                      </a>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl select-none">
                      <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">导入定位知识库</span>
                      <span className="block text-xs font-bold text-slate-800 mt-1 truncate">
                        {kbs.find(kb => kb.id === selectedTask.kbId)?.name || "默认知识库"}
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl select-none">
                      <span className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">成功落库文献篇章</span>
                      <span className="block text-xs font-bold text-slate-800 mt-1">
                        ✨ {selectedTask.docsScrapedCount ?? 0} 篇
                      </span>
                    </div>
                  </div>

                  {selectedTask.prompt && (
                    <div className="p-3.5 bg-amber-50/10 border border-amber-200/40 rounded-xl text-left">
                      <h4 className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-505" />
                        <span>抓取文献加工清洗指令:</span>
                      </h4>
                      <p className="text-[10.5px] text-slate-700 font-normal mt-1 leading-relaxed">
                        {selectedTask.prompt}
                      </p>
                    </div>
                  )}

                  {/* Logs Terminal */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-indigo-500" />
                      <span>沙箱引擎采集底层执行日志 :</span>
                    </label>
                    <div 
                      ref={logTerminalRef}
                      className="bg-slate-950 rounded-xl p-4 font-mono text-[10.5px] text-indigo-100 border border-slate-900 h-56 overflow-y-auto leading-normal text-left"
                    >
                      {(!selectedTask.logs || selectedTask.logs.length === 0) ? (
                        <p className="text-slate-500 italic">正在筹备虚拟抓取终端，静候日志输出...</p>
                      ) : (
                        selectedTask.logs.map((log, index) => (
                          <div key={index} className="border-b border-slate-900 pb-0.5 mb-0.5">
                            <span className="text-slate-550 mr-2">[{index + 1}]</span>
                            <span>{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== B. PERSONA TASK DETAIL ==================== */}
              {selectedTask.taskType === 'persona' && (
                <div className="space-y-5" id="persona-task-detail">
                  <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl">
                    <h4 className="text-[11px] font-bold text-slate-650 mb-2">反向调性深度解析语料来源</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.kbIds && selectedTask.kbIds.map(kbId => {
                        const kbName = kbs.find(k => k.id === kbId)?.name || '未知知识库';
                        return (
                          <span key={kbId} className="inline-flex items-center gap-1 bg-white border border-slate-205 text-[10px] pointer-events-none px-2 py-1 rounded shadow-3xs font-semibold text-slate-700">
                            <Database className="w-3 h-3 text-emerald-500" /> {kbName}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* If training has successfully completed, optionally display the resulting persona details! */}
                  {selectedTask.status === 'completed' && selectedTask.personaId && (() => {
                    const resultingPersona = personas.find(p => p.id === selectedTask.personaId);
                    if (resultingPersona) {
                      return (
                        <div className="border border-emerald-150/80 rounded-2xl p-5 bg-emerald-50/5/5 text-slate-800 space-y-4" id="trained-persona-showcase">
                          <div className="flex justify-between items-start border-b border-emerald-100 pb-2">
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                                <Award className="w-4 h-4 text-emerald-600" />
                                萃成调性人设: {resultingPersona.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 mt-1 font-normal">
                                {resultingPersona.description}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">语气态度 (Tone)</span>
                              <p className="text-[11px] bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-slate-700 leading-relaxed font-semibold">
                                {resultingPersona.extractedTraits.tone}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">修辞与文字笔触 (Style)</span>
                              <p className="text-[11px] bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-slate-700 leading-relaxed font-semibold">
                                {resultingPersona.extractedTraits.writingStyle}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">核心词汇/切口频率标签</span>
                            <div className="flex flex-wrap gap-1.5">
                              {resultingPersona.extractedTraits.keywords.map((kw, idx) => (
                                <span key={idx} className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-150/50 px-2 py-0.5 rounded">
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          </div>

                          {resultingPersona.extractedTraits.samplePassage && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">典型模拟拟作片断展示</span>
                              <div className="p-3 bg-slate-80 text-[10.5px] italic text-slate-650 leading-relaxed font-normal border-l-4 border-slate-400 rounded-r-lg max-h-32 overflow-y-auto bg-slate-50/50">
                                "{resultingPersona.extractedTraits.samplePassage}"
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Logs Terminal */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-500" />
                      <span>多维语感反向解密引擎日志 :</span>
                    </label>
                    <div 
                      ref={logTerminalRef}
                      className="bg-slate-950 rounded-xl p-4 font-mono text-[10.5px] text-emerald-200 border border-slate-900 h-44 overflow-y-auto leading-normal text-left"
                    >
                      {(!selectedTask.logs || selectedTask.logs.length === 0) ? (
                        <p className="text-slate-500 italic">反向语核正在加载语料特征，静候日志分析...</p>
                      ) : (
                        selectedTask.logs.map((log, index) => (
                          <div key={index} className="border-b border-slate-900 pb-0.5 mb-0.5">
                            <span className="text-slate-550 mr-2">[{index + 1}]</span>
                            <span>{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== C. CREATION TASK DETAIL ==================== */}
              {selectedTask.taskType === 'creation' && (
                <div className="space-y-6" id="creation-task-detail">
                  
                  {/* Parameter summary bar */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 select-none">
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">执行创制模式</span>
                      <span className="block text-xs font-bold text-slate-800 mt-1">
                        {selectedTask.type === 'topic' ? '🔬 选题裂变撰作' : '✍️ 主旨直接撰集'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">调性人设约束</span>
                      <span className="block text-xs font-bold text-slate-800 mt-1 truncate">
                        {personas.find(p => p.id === selectedTask.personaId)?.name || '默认自然人设'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">文献事实约束</span>
                      <span className="block text-xs font-bold text-slate-800 mt-1">
                        {selectedTask.kbDocIds ? `${selectedTask.kbDocIds.length} 篇事实文献` : '无约束论点'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">实时联网扩展</span>
                      <span className={`block text-xs font-bold mt-1 ${selectedTask.useWebSearch ? 'text-sky-600' : 'text-slate-450'}`}>
                        {selectedTask.useWebSearch ? '● Google探针已开启' : '离线智能推衍'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400">大作灵感原语大纲 / 创作要求</span>
                    <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{selectedTask.theme}</p>
                  </div>

                  {/* 1. Pick Suggestion Topic Panel */}
                  {selectedTask.status === 'suggesting' && selectedTask.suggestedTopics && (
                    <div className="bg-slate-50 border border-indigo-150 p-5 rounded-2xl">
                      <div className="mb-4 text-left">
                        <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                          <Award className="w-4.5 h-4.5 text-indigo-650" />
                          <span>AI 各派已根据灵流推演生成如下特征选题，请任择其一即可启动新文自动撰写 :</span>
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {selectedTask.suggestedTopics.map((topic, i) => (
                          <div 
                            key={i}
                            onClick={() => handleSelectTopicSubmit(selectedTask.id, topic)}
                            className="bg-white p-3 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer transition leading-relaxed text-left text-xs font-medium text-slate-800"
                          >
                            <span className="text-slate-350 mr-2 font-mono">[{i + 1}]</span>
                            <span>{topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Content Display Reader */}
                  {selectedTask.status === 'completed' && selectedTask.generatedContent && (
                    <div className="space-y-3" id="creation-article-container">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-650 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500 animate-none" />
                          <span>文章大作成品生成结果:</span>
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyText(selectedTask.generatedContent || "", selectedTask.id)}
                            className="flex items-center gap-1 text-[10.5px] font-bold text-indigo-650 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-2.5 py-1.5 transition"
                          >
                            {copiedTaskId === selectedTask.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>已复制到剪切板</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>复制全文</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Display Markdown read box */}
                      <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 text-[11px] md:text-xs leading-relaxed max-h-96 overflow-y-auto text-left font-mono whitespace-pre-wrap">
                        {selectedTask.generatedContent}
                      </div>

                      {/* Doc Archive options */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4 text-left space-y-3">
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-750 flex items-center gap-1.5">
                            <Archive className="w-4 h-4 text-amber-500" />
                            <span>想要直接归档此内容成果至我的受托知识库中吗?</span>
                          </h5>
                          <p className="text-[10px] text-slate-400 mt-0.5">选择后台的关联知识文献目录，即可把此文章存储并充实作为未来其他主题的参考论据资料。</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <select
                            value={archiveKbId}
                            onChange={(e) => {
                              setArchiveKbId(e.target.value);
                              setArchiveSuccess(false);
                            }}
                            className="bg-white px-2.5 py-1.5 text-xs rounded-lg border border-slate-205 outline-none cursor-pointer flex-1"
                          >
                            <option value="">选取要归档落库的知识目录文件夹...</option>
                            {kbs.map(k => (
                              <option key={k.id} value={k.id}>{k.name} (已有 {k.documentsCount ?? 0} 篇)</option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleArchiveSubmit(selectedTask.id)}
                            disabled={!archiveKbId || archiveSuccess}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-3xs shrink-0 ${
                              (!archiveKbId || archiveSuccess)
                                ? "bg-slate-200 text-slate-405 border border-slate-300 cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            }`}
                          >
                            {archiveSuccess ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> 已成功归档保存
                              </span>
                            ) : (
                              <span>确认归档此篇</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Task in creating states */}
                  {['researching', 'writing', 'pending'].includes(selectedTask.status) && (
                    <div className="py-12 bg-indigo-50/20 border border-dashed border-indigo-200 rounded-2xl flex flex-col justify-center items-center text-center">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                      <h5 className="text-xs font-bold text-slate-700">正在利用您的拟作人设调性以及事实语料进行精细创作推演...</h5>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-sm">系统包含联网和反向微格风格推拟，大概耗时 10~25 秒。该进程会自动进行，成功后立刻在这里以及内容列表看到大篇成作，请稍等一会。</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0 select-none">
              <span className="text-[10px] text-slate-400 font-normal leading-relaxed">
                * 该任务隶属于独立创意沙箱，所有参数和结果已在此隔离运行，避免外界侵扰打扰。
              </span>

              {/* Action operations buttons */}
              <div className="flex gap-2 text-xs font-bold shrink-0">
                {/* 1. Cancellation */}
                {selectedTask.taskType === 'scraper' && ['pending', 'scraping'].includes(selectedTask.status) && (
                  <button
                    onClick={() => {
                      onCancelScraperTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-250 text-slate-650 rounded-lg transition"
                  >
                    <StopCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>取消采集</span>
                  </button>
                )}
                {selectedTask.taskType === 'creation' && ['pending', 'researching', 'writing', 'suggesting'].includes(selectedTask.status) && (
                  <button
                    onClick={() => {
                      onCancelCreationTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-250 text-slate-650 rounded-lg transition"
                  >
                    <StopCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>取消创作</span>
                  </button>
                )}

                {/* 2. Retrying */}
                {selectedTask.taskType === 'scraper' && ['failed', 'cancelled'].includes(selectedTask.status) && (
                  <button
                    onClick={() => {
                      onRetryScraperTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重新执行</span>
                  </button>
                )}
                {selectedTask.taskType === 'creation' && ['failed', 'cancelled'].includes(selectedTask.status) && (
                  <button
                    onClick={() => {
                      onRetryCreationTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重新撰写</span>
                  </button>
                )}

                {/* 3. Deletion */}
                {selectedTask.taskType === 'scraper' && (
                  <button
                    onClick={() => {
                      if (window.confirm("确定要删除此采集任务流水记录吗？")) {
                        onDeleteScraperTask(selectedTask.id);
                        setSelectedTask(null);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-650 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>删除任务</span>
                  </button>
                )}
                {selectedTask.taskType === 'creation' && (
                  <button
                    onClick={() => {
                      if (window.confirm("确定要删除此精细创作记录吗？")) {
                        onDeleteCreationTask(selectedTask.id);
                        setSelectedTask(null);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-650 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>删除任务</span>
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-1.5 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                >
                  关闭
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== 4. UNIFIED CREATION WIZARD MODAL ==================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="unified-create-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden text-left" id="unified-create-modal">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
                  <Layers className="w-4.5 h-4.5 text-indigo-605" />
                  新建灵感或智能任务流水线
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5">
                  选择该创作空间需要激活的平行创意通道，整合您的事实、人格和内容撰稿。
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <XCircle className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Main Form Area */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col">
              
              {/* STEP 1: CHOOSE TASK TYPE */}
              {creationStep === 1 && (
                <div className="p-6 space-y-4" id="wizard-step-1">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 select-none">
                    请选择您要构建执行的特定创意任务类型:
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
                    
                    {/* Option A: Scraper */}
                    <div 
                      onClick={() => {
                        setChosenTaskType("scraper");
                        setCreationStep(2);
                      }}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/5 cursor-pointer transition flex items-start gap-3.5 shadow-3xs"
                    >
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0 mt-0.5">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-left flex-1">
                        <h5 className="text-xs font-bold text-slate-800">数据采集与网页爬取 (Data Crawling)</h5>
                        <p className="text-[10.5px] text-slate-450 leading-relaxed font-normal">
                          指定需要摄纳的特定灵感网站或学术大篇章，AI将自动清洗、去噪声并落库到您的专属知识数据库文件夹，为后续拟作打底。
                        </p>
                      </div>
                      <div className="self-center pl-2 shrink-0">
                        <ChevronRight className="w-4 h-4 text-slate-350" />
                      </div>
                    </div>

                    {/* Option B: Persona Extraction */}
                    <div 
                      onClick={() => {
                        setChosenTaskType("persona");
                        setCreationStep(2);
                      }}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/5 cursor-pointer transition flex items-start gap-3.5 shadow-3xs"
                    >
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 mt-0.5">
                        <BrainCircuit className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-left flex-1">
                        <h5 className="text-xs font-bold text-slate-800">修辞调性/智能人格萃提 (Persona reverse-engineering)</h5>
                        <p className="text-[10.5px] text-slate-450 leading-relaxed font-normal">
                          引入特定的语料，利用高维语义反向解析写手的核心写作风骨、常切口词、文笔态度等，最终虚拟克隆提纯出可用笔触模板。
                        </p>
                      </div>
                      <div className="self-center pl-2 shrink-0">
                        <ChevronRight className="w-4 h-4 text-slate-350" />
                      </div>
                    </div>

                    {/* Option C: Creation Task */}
                    <div 
                      onClick={() => {
                        setChosenTaskType("creation");
                        setCreationStep(2);
                      }}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/5 cursor-pointer transition flex items-start gap-3.5 shadow-3xs"
                    >
                      <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl shrink-0 mt-0.5">
                        <PenTool className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 text-left flex-1">
                        <h5 className="text-xs font-bold text-slate-800">智慧AI撰笔文稿创作 (Intelligent Creative Writing)</h5>
                        <p className="text-[10.5px] text-slate-450 leading-relaxed font-normal">
                          融合特定的克隆写手人设调性、特定参考文献（离线文献）和选配Google探针实时搜索，自如进行多方案选题生成或命题直写全文。
                        </p>
                      </div>
                      <div className="self-center pl-2 shrink-0">
                        <ChevronRight className="w-4 h-4 text-slate-350" />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2: DETAILS INPUT DEPENDING ON CHOSEN TYPE */}
              {creationStep === 2 && chosenTaskType && (
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto" id="wizard-step-2">
                  
                  {/* Task label indicator */}
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between select-none">
                    <span className="text-[10.5px] font-bold text-slate-500">
                      正在搭建平行创意通道 :
                    </span>
                    {getTypeBadge(chosenTaskType)}
                  </div>

                  {/* FORM TYPE 1: SCRAPER CONFIG */}
                  {chosenTaskType === 'scraper' && (
                    <div className="space-y-3.5 text-left" id="scraper-form-wizard">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">采集任务代号名 <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={scrapName}
                          onChange={(e) => setScrapName(e.target.value)}
                          placeholder="例如：量子物理科学前沿第一期采集、旅行攻略爆款评论..."
                          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">采集源网页目标 URL 链接 <span className="text-rose-500">*</span></label>
                        <input
                          type="url"
                          required
                          value={scrapUrl}
                          onChange={(e) => setScrapUrl(e.target.value)}
                          placeholder="目标抓取的完整地址：https://example.com/topic..."
                          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            入库挂钩知识分类目录 <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={scrapKbId}
                            onChange={(e) => setScrapKbId(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-2.5 py-2.5 rounded-xl border border-slate-200 outline-none cursor-pointer"
                          >
                            {kbs.map(k => (
                              <option key={k.id} value={k.id}>{k.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            过滤去噪及重点提纯 prompt (可选)
                          </label>
                          <input
                            type="text"
                            value={scrapPrompt}
                            onChange={(e) => setScrapPrompt(e.target.value)}
                            placeholder="如：仅保留核心观点，去除导航和页脚广告板..."
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORM TYPE 2: PERSONA TRAITS CONFIG */}
                  {chosenTaskType === 'persona' && (
                    <div className="space-y-4 text-left" id="persona-form-wizard">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">提纯萃取的新人设定名 <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={persName}
                          onChange={(e) => setPersName(e.target.value)}
                          placeholder="例如：冷峻硬核科普写手、高逼格小奢旅行推文风格..."
                          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          勾选用于调性分析的输入事实语料库 (可多选) <span className="text-rose-500">*</span>
                        </label>
                        <div className="p-3 bg-slate-55 rounded-xl border border-slate-200/80 max-h-44 overflow-y-auto space-y-2 select-none">
                          {kbs.length === 0 ? (
                            <p className="text-slate-405 text-center py-6 text-[10.5px] italic">库里目前没有可拉入的语料库目录，请先采集或建立一个知识目录</p>
                          ) : (
                            kbs.map(k => {
                              const isChecked = persKbIds.includes(k.id);
                              return (
                                <label 
                                  key={k.id} 
                                  className={`flex items-center gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                                    isChecked 
                                      ? 'bg-emerald-50/10 border-emerald-250 text-emerald-800' 
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
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
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                                  />
                                  <div className="text-left">
                                    <span className="text-[11px] font-bold block leading-normal">{k.name}</span>
                                    <span className="text-[9px] text-slate-400 font-mono">(包含 {(allDocs.filter(d => d.kbId === k.id).length)} 篇特定范文语篇)</span>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORM TYPE 3: CREATION CONFIG */}
                  {chosenTaskType === 'creation' && (
                    <div className="space-y-4 text-left font-normal" id="creation-form-wizard">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">创作进程模式</label>
                          <div className="flex bg-slate-100 p-1 rounded-xl" id="creat-type-selection">
                            {[
                              { id: 'direct', label: '命题直接撰全文' },
                              { id: 'topic', label: 'AI 多方案选题裂变' }
                            ].map((opt) => (
                              <button
                                type="button"
                                key={opt.id}
                                onClick={() => setCreatType(opt.id as any)}
                                className={`flex-1 px-3 py-1.5 text-[10.5px] font-bold rounded-lg transition-all ${
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
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">文笔调性人设约束</label>
                          <select
                            value={creatPersonaId}
                            onChange={(e) => setCreatPersonaId(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-2.5 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer"
                          >
                            <option value="">选取我提纯萃取的人事风格模范...</option>
                            {personas.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          指定创作核心大纲 / 内容原质灵感 <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          value={creatTheme}
                          onChange={(e) => setCreatTheme(e.target.value)}
                          placeholder="描述您要创作的主题：如「利用量子力学中微子的特性进行深空通信的构想，字数一千五百字，带科幻色彩」..."
                          rows={3}
                          className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition resize-none leading-relaxed"
                        />
                      </div>

                      {/* Reference document selectors */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2 border-t border-slate-100">
                        {/* Selected Docs list trigger button */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">参考文献支撑</label>
                          <button
                            type="button"
                            onClick={() => {
                              setTempSelectedDocIds(creatDocIds);
                              setIsKbDocsSelectorOpen(true);
                            }}
                            className="w-full flex items-center justify-between text-left text-xs text-slate-700 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 px-3.5 py-2.5 rounded-xl transition"
                          >
                            <span>已择定 {creatDocIds.length} 篇参考事实文献</span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>

                        {/* Web search toggle checkbox */}
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 self-end">
                          <div className="text-left pr-2">
                            <span className="block text-[11px] font-bold text-slate-700">Google 搜索引擎实时支撑</span>
                            <span className="block text-[9px] text-slate-450 mt-0.5">当涉及最尖端时事，允许AI临时探针扩充事实。</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={creatWebSearch}
                            onChange={(e) => setCreatWebSearch(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Modal Step Actions Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs font-bold">
                {creationStep === 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCreationStep(1);
                    }}
                    className="px-4 py-2 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition"
                  >
                    上一步
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition"
                >
                  取消
                </button>

                {creationStep === 1 ? (
                  <button
                    type="button"
                    disabled={!chosenTaskType}
                    onClick={() => setCreationStep(2)}
                    className={`px-5 py-2 text-white rounded-lg transition shadow-3xs ${
                      chosenTaskType
                        ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                        : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                    }`}
                  >
                    继续配置参数
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      submitting || 
                      (chosenTaskType === 'scraper' && (!scrapName.trim() || !scrapUrl.trim() || !scrapKbId)) ||
                      (chosenTaskType === 'persona' && (!persName.trim() || persKbIds.length === 0)) ||
                      (chosenTaskType === 'creation' && !creatTheme.trim())
                    }
                    className={`px-5 py-2 text-white rounded-lg transition shadow-3xs ${
                      (submitting || 
                       (chosenTaskType === 'scraper' && (!scrapName.trim() || !scrapUrl.trim() || !scrapKbId)) ||
                       (chosenTaskType === 'persona' && (!persName.trim() || persKbIds.length === 0)) ||
                       (chosenTaskType === 'creation' && !creatTheme.trim()))
                        ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>正在创建启动中...</span>
                      </span>
                    ) : (
                      <span>确认创建并执行</span>
                    )}
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== 5. SUB-SELECTOR FOR DOC PICKER MODAL (From Creation nested popup) ==================== */}
      {isKbDocsSelectorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-905/65 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="nested-docs-selector">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden max-h-[80vh] text-left" id="inner-docs-selector-modal">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-805 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-indigo-550" />
                  <span>圈选参考文献和定位目录范围</span>
                </h4>
                <p className="text-[10px] text-slate-450 mt-1">
                  选择作为生成内容依据的事实支撑文献，支持多选或对整个文件夹目录进行打包勾选限制。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsKbDocsSelectorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 border rounded hover:bg-slate-200/50 transition shrink-0"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Split layout: folder list (left 4) & doc list (right 8) */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50 bg-opacity-40" id="docs-split-view">
              
              {/* LEFT FOLDER COLUMN */}
              <div className="w-1/3 border-r border-slate-150 p-4 space-y-2 overflow-y-auto">
                <div className="text-left pb-1 border-b border-slate-100 select-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    可引入的语篇分类目录
                  </span>
                </div>

                <div className="space-y-1.5">
                  {kbs.length === 0 ? (
                    <p className="text-[10px] italic text-slate-400 text-center py-6">尚无知识库目录</p>
                  ) : (
                    kbs.map(kb => {
                      const isSelectedKb = activeKbId === kb.id;
                      const kbDocs = allDocs.filter(d => d.kbId === kb.id);
                      const kbDocIds = kbDocs.map(d => d.id);
                      
                      const isSomeDocsChecked = kbDocIds.some(id => tempSelectedDocIds.includes(id)) && !kbDocIds.every(id => tempSelectedDocIds.includes(id));
                      const isAllDocsChecked = kbDocIds.length > 0 && kbDocIds.every(id => tempSelectedDocIds.includes(id));

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
                          className={`p-2 rounded-xl border transition cursor-pointer text-left flex items-start gap-2 ${
                            isSelectedKb
                              ? 'bg-white border-indigo-200 shadow-3xs text-indigo-700 font-bold'
                              : 'bg-transparent border-transparent text-slate-655 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0" onClick={handleKbToggle}>
                            <input
                              type="checkbox"
                              checked={isAllDocsChecked || (kbDocs.length === 0 && tempSelectedKbIds.includes(kb.id))}
                              onChange={() => {}} // Swallowed in click
                              className="rounded border-slate-300 text-indigo-650 h-3 w-3 cursor-pointer"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-[11.5px] truncate block">{kb.name}</span>
                          </div>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-mono font-bold shrink-0">
                            {kbDocs.length}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT ARTICLE COLUMN */}
              <div className="flex-1 flex flex-col h-full bg-white select-none">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-left shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    可引用的文献段落、参考源文件
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {allDocs.filter(d => d.kbId === activeKbId).length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs italic">该分类目录文件夹里没有论据，可先采集增加。</p>
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
                            className={`p-2.5 rounded-xl border transition-all duration-155 cursor-pointer text-left flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-indigo-50/15 border-indigo-200'
                                : 'border-slate-100 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-205'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Swallowed in click
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-slate-705">
                              <span className="text-[11.5px] font-bold block truncate">{doc.title}</span>
                              <span className="text-[9.5px] text-slate-400 mt-0.5 block font-mono">
                                (录入时间: {new Date(doc.createdAt).toLocaleDateString()} | 全文: {doc.content.length} 字)
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </div>

            {/* Modal actions footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0 font-medium">
              <span className="text-[10px] text-slate-450 leading-normal font-normal">
                已在缓存中圈选了 <span className="font-bold text-indigo-655">{tempSelectedDocIds.length}</span> 篇事实文献
              </span>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsKbDocsSelectorOpen(false)}
                  className="px-3.5 py-1.5 hover:bg-slate-100 text-slate-550 border border-slate-205 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatDocIds(tempSelectedDocIds);
                    setIsKbDocsSelectorOpen(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-705 text-white font-bold rounded-lg transition"
                >
                  保存关联圈选
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
