import React, { useState, useEffect } from "react";
import { Sparkles, Landmark, FileText, Globe, CheckCircle, BrainCircuit, Loader2, ArrowRight, Share2, Award, ChevronRight, Layers, HelpCircle, Archive, Check, StopCircle, RotateCcw, Trash2, XCircle, AlertCircle, Search, Filter, Calendar, BookOpen, PenTool, Copy, ZoomIn, Plus, X } from "lucide-react";
import { CreationTask, KnowledgeBase, Document, Persona } from "../types";

interface CreationPanelProps {
  tasks: CreationTask[];
  kbs: KnowledgeBase[];
  allDocs: Document[];
  personas: Persona[];
  onCreateTask: (params: {
    type: 'topic' | 'direct';
    theme: string;
    kbDocIds: string[];
    personaId?: string;
    useWebSearch: boolean;
  }) => Promise<void>;
  onSelectTopic: (taskId: string, topic: string) => Promise<void>;
  onArchiveDoc: (taskId: string, kbId: string) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
  onRetryTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export default function CreationPanel({
  tasks,
  kbs,
  allDocs,
  personas,
  onCreateTask,
  onSelectTopic,
  onArchiveDoc,
  onCancelTask,
  onRetryTask,
  onDeleteTask
}: CreationPanelProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDetailTask, setSelectedDetailTask] = useState<CreationTask | null>(null);

  // Form states
  const [creationType, setCreationType] = useState<'topic' | 'direct'>('direct');
  const [theme, setTheme] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // States for nested reference picking modal
  const [isKbDocsSelectorOpen, setIsKbDocsSelectorOpen] = useState(false);
  const [tempSelectedDocIds, setTempSelectedDocIds] = useState<string[]>([]);
  const [tempSelectedKbIds, setTempSelectedKbIds] = useState<string[]>([]);
  const [activeKbId, setActiveKbId] = useState<string>("");

  // Search, copy and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [archiveTargetKBIds, setArchiveTargetKBIds] = useState<Record<string, string>>({});
  const [archivedSuccessTaskIds, setArchivedSuccessTaskIds] = useState<Record<string, boolean>>({});

  const handleCopyText = (text: string, taskId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTaskId(taskId);
      setTimeout(() => {
        setCopiedTaskId(null);
      }, 2000);
    }).catch((err) => {
      console.error("Failed to copy: ", err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;

    setSubmitting(true);
    try {
      await onCreateTask({
        type: creationType,
        theme,
        kbDocIds: selectedDocIds,
        personaId: selectedPersonaId || undefined,
        useWebSearch
      });
      // Reset details
      setTheme("");
      setSelectedDocIds([]);
      setSelectedKbIds([]);
      setSelectedPersonaId("");
      setUseWebSearch(false);
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectTopicSubmit = async (taskId: string, topic: string) => {
    try {
      await onSelectTopic(taskId, topic);
      // Retrieve updated task entity to keep details modal synced
      const updated = tasks.find(t => t.id === taskId);
      if (updated) {
        setSelectedDetailTask({ ...updated, status: 'writing', selectedTopic: topic });
      } else {
        setSelectedDetailTask(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveSubmit = async (taskId: string) => {
    const targetKbId = archiveTargetKBIds[taskId];
    if (!targetKbId) return;
    try {
      await onArchiveDoc(taskId, targetKbId);
      setArchivedSuccessTaskIds(prev => ({ ...prev, [taskId]: true }));
      setArchiveTargetKBIds(prev => ({ ...prev, [taskId]: "" }));
      setTimeout(() => {
        setArchivedSuccessTaskIds(prev => ({ ...prev, [taskId]: false }));
      }, 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const titleToFilter = (t.selectedTopic || t.title || "").toLowerCase();
    const themeToFilter = (t.theme || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = titleToFilter.includes(query) || themeToFilter.includes(query);
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    if (statusFilter === 'running') {
      return ['pending', 'researching', 'writing', 'suggesting'].includes(t.status);
    }
    if (statusFilter === 'completed') {
      return t.status === 'completed';
    }
    if (statusFilter === 'failed') {
      return ['failed', 'cancelled'].includes(t.status);
    }
    return true;
  });

  // Sync active task in detail view to handle state background polling changes
  useEffect(() => {
    if (selectedDetailTask) {
      const upToDate = tasks.find(t => t.id === selectedDetailTask.id);
      if (upToDate) {
        setSelectedDetailTask(upToDate);
      }
    }
  }, [tasks]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden p-6" id="creation-panel-container">
      {/* Top Header Section */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60 shrink-0" id="creation-header-bar">
        <div className="text-left">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
            AI 智慧创意内容创作室
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-normal">
            独立而无关联的内容生成。融合特定的写作人格特质与网页或知识库参考文献，支持选题生成或是直接撰稿成品。
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-705 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-100 shrink-0"
          id="creation-create-trigger-btn"
        >
          <Plus className="w-4 h-4" />
          <span>新建创作任务</span>
        </button>
      </div>

      {/* Main Full Width Content Canvas containing the table list */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/85 shadow-sm flex flex-col overflow-hidden p-5" id="creation-read-column">
        {/* Statistics and filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0" id="creation-filter-and-stats">
          <div className="text-left">
            <h3 className="text-xs font-bold text-slate-850 tracking-wider">空间内智能创作大作历史卷轴 ({tasks.length})</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">可点击任何任务记录激活卡特镜，查看生成的文篇、复制或在库归档。</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0" id="creation-status-filters">
            {[
              { id: 'all', label: '全部' },
              { id: 'running', label: '进行中' },
              { id: 'completed', label: '已完稿' },
              { id: 'failed', label: '已终止' }
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex-1 sm:flex-none px-3.5 py-1 text-[10px] font-semibold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-850 shadow-sm'
                    : 'text-slate-500 hover:text-slate-705'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task Search Bar */}
        <div className="mb-4 shrink-0 flex items-center" id="creation-search-field">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="快速检索文稿、核心大纲、立意或特征选题..."
              className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-205 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition"
            />
          </div>
        </div>

        {/* Vertically scrollable creation tasks list */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin text-slate-800" id="creation-tasks-vertical-scroll">
          {filteredTasks.length === 0 ? (
            <div className="bg-slate-50/20 rounded-2xl border border-dashed border-slate-200 p-20 text-center" id="empty-tasks-placeholder">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-3 animate-none">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">未检索到任何符合条件的创作历史</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                {searchQuery ? "请更换关键词检索。" : "该空间尚未配置执行过智能撰写，马上点击右上角创建一个吧！"}
              </p>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const persona = personas.find(p => p.id === t.personaId);

              return (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedDetailTask(t)}
                  className="bg-white rounded-xl border border-slate-150 p-4 transition-all hover:border-indigo-305 hover:shadow-xs cursor-pointer text-left flex flex-col md:flex-row gap-4 items-start justify-between shadow-xs"
                  id={`creation-task-card-${t.id}`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        t.type === 'topic' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {t.type === 'topic' ? '🔬 选题生成型' : '✍️ 直接撰稿型'}
                      </span>

                      {/* Status Badges */}
                      {t.status === "completed" && (
                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 py-0.5 px-2 rounded-full border border-emerald-100 font-sans">
                          <CheckCircle className="w-3 h-3" /> 创作完毕
                        </span>
                      )}
                      {t.status === "suggesting" && (
                        <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 py-0.5 px-2 rounded-full animate-pulse border border-indigo-100 font-sans">
                          <Layers className="w-3 h-3" /> 选题备选就绪
                        </span>
                      )}
                      {['writing', 'researching', 'pending'].includes(t.status) && (
                        <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 py-0.5 px-2 rounded-full animate-pulse border border-indigo-100">
                          <Loader2 className="w-3 h-3 animate-spin" /> {t.status === "pending" ? "等待调度" : "底语言生成中..."}
                        </span>
                      )}
                      {t.status === "cancelled" && (
                        <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 bg-slate-50 py-0.5 px-2 rounded-full border border-slate-200">
                          <XCircle className="w-3 h-3 text-slate-400" /> 创作取消
                        </span>
                      )}
                      {t.status === "failed" && (
                        <span className="text-[9px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 py-0.5 px-2 rounded-full border border-rose-150">
                          <AlertCircle className="w-3 h-3 text-rose-500" /> 撰写失败
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs md:text-sm font-bold text-slate-805 leading-snug">
                      {t.selectedTopic || t.title}
                    </h4>

                    {t.selectedTopic && t.selectedTopic !== t.title && (
                      <p className="text-[9.5px] text-slate-400 truncate">
                        创意激发核心原词 Theme: {t.title}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[9px] text-slate-450 leading-relaxed">
                      {persona && (
                        <span className="bg-indigo-50/50 text-indigo-650 px-1.5 py-0.3 rounded border border-indigo-100 flex items-center gap-0.5 font-sans font-medium">
                          <BrainCircuit className="w-2.5 h-2.5" />
                          人格: {persona.name}
                        </span>
                      )}
                      {t.kbDocIds && t.kbDocIds.length > 0 && (
                        <span className="bg-amber-50/50 text-amber-600 px-1.5 py-0.3 rounded border border-amber-100 flex items-center gap-0.5 font-sans font-medium">
                          <BookOpen className="w-2.5 h-2.5" />
                          参考文献: {t.kbDocIds.length} 篇
                        </span>
                      )}
                      <span className={`px-1.5 py-0.3 rounded border flex items-center gap-0.5 font-sans font-medium ${
                        t.useWebSearch ? 'text-sky-600 bg-sky-50/50 border-sky-100' : 'text-slate-400 bg-slate-50 border-slate-200'
                      }`}>
                        <Globe className="w-2.5 h-2.5 text-sky-500" />
                        联网拓源: {t.useWebSearch ? '开启' : '关闭'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 w-full md:w-auto">
                    <span className="text-[10px] text-slate-450 font-mono">
                      {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 select-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailTask(t);
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-[10px] rounded-lg font-bold flex items-center gap-0.5"
                      >
                        查看进程与详情
                      </button>

                      {/* Delete action */}
                      {onDeleteTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("确定要彻底清除此大作记录吗？")) {
                              onDeleteTask(t.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded border border-slate-200 transition"
                          title="彻底删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Create Creation Task */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="create-creation-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] text-left" id="create-creation-modal font-normal">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-slate-805 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                  新建智慧大纲创作撰写任务
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5 font-normal">
                  指派文体修辞风格与参考文献，通过多维向量融合出长文本成品。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-450 hover:text-slate-650 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Tab configuration selection */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl mb-1 shrink-0" id="creation-mode-tabs">
                <button
                  type="button"
                  onClick={() => setCreationType('direct')}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    creationType === 'direct'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  直接撰写文稿
                </button>
                <button
                  type="button"
                  onClick={() => setCreationType('topic')}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    creationType === 'topic'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  创意选题生成
                </button>
              </div>

              {/* Form entries */}
              <form onSubmit={handleSubmit} className="space-y-4" id="creation-setup-form">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {creationType === 'direct' ? "指定要撰稿的大纲主题 *" : "指定内容创意核心大纲主题 *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder={creationType === 'direct' ? "" : ""}
                    className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:border-indigo-500 rounded-xl py-2 px-3 text-xs outline-none transition"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-1">例如：{creationType === 'direct' ? "元宇宙高维演进的最终极宇宙图谱" : "提出5个零基础的新能源汽车核心技术科普推广立意选项"}</p>
                </div>

                {/* Persona picker selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">指派特定的写作人格文风</label>
                  {personas.length === 0 ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-dashed border-amber-200 text-[10px] leading-relaxed text-amber-700">
                      💡 目前在此空间中并无已经保存永久固化的人格模板。若不提供，大模型将自动采用优雅高知的中级主编风格执笔，亦可随时前往【人格特征萃取】启动特征提纯。
                    </div>
                  ) : (
                    <select
                      value={selectedPersonaId}
                      onChange={(e) => setSelectedPersonaId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:border-indigo-500 rounded-xl py-2 px-3 text-xs outline-none transition font-sans"
                    >
                      <option value="">-- z自适应经典学术风 (未指派固定人格) --</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.extractedTraits.tone})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Docs picker trigger launcher */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>
                      选择作为大纲辅助的参考文献资料
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono">
                      已选中 {selectedDocIds.length} 篇参考
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setTempSelectedDocIds(selectedDocIds);
                      setTempSelectedKbIds(selectedKbIds);
                      if (kbs.length > 0) {
                        setActiveKbId(kbs[0].id);
                      }
                      setIsKbDocsSelectorOpen(true);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-305 hover:bg-slate-100/25 rounded-xl p-3 text-left transition flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1 leading-normal">
                      {selectedDocIds.length === 0 ? (
                        <div>
                          <p className="text-xs text-slate-400 font-normal">点击配置大纲支撑参考文献...</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">融合特定文献的段落事实与观点深度细节</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-indigo-700">已载入 {selectedDocIds.length} 篇事实证明文本</p>
                          <p className="text-[10px] text-slate-400 truncate pr-5 font-mono">
                            {allDocs.filter(d => selectedDocIds.includes(d.id)).map(d => d.title).join("、")}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-indigo-650 font-bold group-hover:translate-x-0.5 transition shrink-0 pl-2">
                      <span>挑选</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>

                {/* Google web search search toggle */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWebSearch}
                      onChange={(e) => setUseWebSearch(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-0.5 cursor-pointer"
                    />
                    <div className="text-left font-normal leading-normal">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-sky-500" />
                        开启联接 Google Search Web 网络研判探针
                      </span>
                      <p className="text-[10px] text-slate-405 mt-0.5">实时合并互联网最前沿的大事件数据，扩充文稿前瞻论据细节。</p>
                    </div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-105 flex items-center justify-end gap-2 text-xs shrink-0 font-medium">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 hover:bg-slate-100 text-slate-500 border border-slate-205 rounded-lg transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-705 text-white font-bold rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:bg-slate-300"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>大语言引擎灌浆融合中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                        <span>{creationType === 'direct' ? "直接智能撰写全文" : "生成AI智能选题策划"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Nested Modal: Knowledge reference selector */}
      {isKbDocsSelectorOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-left" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }} id="kb-picker-nested">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl h-[480px] flex flex-col overflow-hidden max-h-[85vh]" id="kb-selector-modal animate-slideUp">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-xs font-bold text-slate-805 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  配置参考文献与大纲知识
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5">
                  点击左侧的主目录过滤，于右侧精准勾选作为本次全景文稿写作支撑的基础文献事实。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsKbDocsSelectorOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content Panels */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
              
              {/* LEFT COLUMN: Databases */}
              <div className="w-2/5 border-r border-slate-100 flex flex-col h-full bg-slate-50/30">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-left shrink-0">
                  <span className="text-[10px] font-bold text-slate-400">
                    知识目录文件夹 ({kbs.length})
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {kbs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <p className="text-xs">暂无知识库</p>
                    </div>
                  ) : (
                    kbs.map((kb) => {
                      const kbDocs = allDocs.filter(d => d.kbId === kb.id);
                      const isSelectedKb = activeKbId === kb.id;
                      const kbDocIds = kbDocs.map(d => d.id);
                      
                      const selectedDocsInKb = kbDocs.filter(d => tempSelectedDocIds.includes(d.id));
                      const isAllDocsChecked = kbDocs.length > 0 && selectedDocsInKb.length === kbDocs.length;
                      const isSomeDocsChecked = selectedDocsInKb.length > 0 && selectedDocsInKb.length < kbDocs.length;

                      const handleKbToggle = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (isAllDocsChecked || tempSelectedKbIds.includes(kb.id)) {
                          // Uncheck entire KB
                          setTempSelectedKbIds(prev => prev.filter(id => id !== kb.id));
                          setTempSelectedDocIds(prev => prev.filter(id => !kbDocIds.includes(id)));
                        } else {
                          // Check entire KB
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
                              : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="pt-0.5 shrink-0" onClick={handleKbToggle}>
                            <input
                              type="checkbox"
                              checked={isAllDocsChecked || (kbDocs.length === 0 && tempSelectedKbIds.includes(kb.id))}
                              ref={el => {
                                if (el) { el.indeterminate = isSomeDocsChecked; }
                              }}
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

              {/* RIGHT COLUMN: Specific Articles inside the folder */}
              <div className="flex-1 flex flex-col h-full bg-white select-none">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-left shrink-0">
                  <span className="text-[10px] font-bold text-slate-400">
                    可支配的论点文献文件
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {allDocs.filter(d => d.kbId === activeKbId).length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p className="text-xs italic">该目录下没有文献，可通过采集或上传新增。</p>
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
                            className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-left flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-indigo-50/15 border-indigo-200'
                                : 'border-slate-100 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-205'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Swallowed in container click
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-slate-700">
                              <span className="text-[11.5px] font-bold block truncate">{doc.title}</span>
                              <span className="text-[9.5px] text-slate-400 mt-0.5 block font-mono">
                                (录入于: {new Date(doc.createdAt).toLocaleDateString()} | 文章大体: {doc.content.length} 字)
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 font-medium">
              <span className="text-[10px] text-slate-450 leading-relaxed font-normal">
                已在剪贴板圈定 <span className="font-bold text-indigo-650">{tempSelectedDocIds.length}</span> 篇文献
              </span>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsKbDocsSelectorOpen(false)}
                  className="px-3.5 py-1.5 hover:bg-slate-100 text-slate-500 border border-slate-205 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocIds(tempSelectedDocIds);
                    setSelectedKbIds(tempSelectedKbIds);
                    setIsKbDocsSelectorOpen(false);
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition"
                >
                  确认关联并保存
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Big detail translucent layout view */}
      {selectedDetailTask && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-905/65 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="creation-detail-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden max-h-[90vh] text-left" id="creation-detail-modal">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-805">创作进程大作考镜详情: {selectedDetailTask.title}</h3>
                  <p className="text-[10px] text-slate-450 mt-0.5">创建于: {new Date(selectedDetailTask.createdAt).toLocaleString()} | 特征流水号: {selectedDetailTask.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content canvas */}
            <div className="flex-1 overflow-y-auto p-5 bg-white space-y-5" id="creation-detail-canvas">
              {/* Settings configuration parameters and status badge */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-3 border-b border-slate-100 shrink-0 select-none">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">执行模式</span>
                  <span className="block text-xs font-bold text-slate-800 mt-1 leading-normal">
                    {selectedDetailTask.type === 'topic' ? '🔬 选题生成裂变' : '✍️ 主旨直接撰稿'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">写作专特人格 (Persona)</span>
                  <span className="block text-xs font-bold text-slate-800 mt-1 leading-normal truncate">
                    {personas.find(p => p.id === selectedDetailTask.personaId)?.name || '经典学术文风 (未关联)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">事实参考文献支撑</span>
                  <span className="block text-xs font-bold text-slate-800 mt-1 leading-normal">
                    {selectedDetailTask.kbDocIds ? `${selectedDetailTask.kbDocIds.length} 篇参考范本` : '无离线语料约束'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Google Web 网络扩展</span>
                  <span className={`block text-xs font-bold mt-1 leading-normal ${selectedDetailTask.useWebSearch ? 'text-sky-600' : 'text-slate-400'}`}>
                    {selectedDetailTask.useWebSearch ? '● 联网探针已开启' : '离线本地融合'}
                  </span>
                </div>
              </div>

              {/* Core Execution Views Case 1: Suggesting state topics table picker */}
              {selectedDetailTask.status === "suggesting" && selectedDetailTask.suggestedTopics && (
                <div className="bg-slate-50 border border-slate-205 p-5 rounded-2xl text-slate-805">
                  <div className="mb-4 text-left">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-[11px] font-bold text-slate-700">AI 底语言已根据灵感原词策划生成如下候选选题，请任择其一以驱使全文自动撰写进程：</h5>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {selectedDetailTask.suggestedTopics.map((topic, index) => (
                      <div
                        key={index}
                        className="bg-white border border-slate-200 p-3.5 rounded-xl hover:border-indigo-350 hover:shadow-xs transition flex items-center justify-between gap-3"
                      >
                        <div className="text-left space-y-1">
                          <span className="text-[8px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-600 py-0.5 px-2 rounded-full font-bold">推荐候选 {index+1}</span>
                          <p className="text-xs font-bold text-slate-800 pr-2 pt-0.5">{topic}</p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleSelectTopicSubmit(selectedDetailTask.id, topic)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg transition shrink-0 shadow-3xs flex items-center gap-1 text-[11.5px] font-bold"
                        >
                          采纳立意
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Case 2: In pipeline loading queue page */}
              {['writing', 'researching', 'pending'].includes(selectedDetailTask.status) && (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <div className="w-12 h-12 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin absolute"></div>
                    <BrainCircuit className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                  </div>
                  <div className="space-y-1 text-slate-700">
                    <p className="text-xs font-bold">正在针对所设的多维修辞与大纲参考文献重组文字序列...</p>
                    <p className="text-[10px] text-slate-405 leading-normal max-w-sm mx-auto">
                      本沙盒系统目前正在调配底层神经网络融合写作。如果您指派了 “Google Search Web” 联接，大语言模型还将启动网络爬虫抓包整合，通常在 2-4 秒内可完全产出文豪大作。
                    </p>
                  </div>
                </div>
              )}

              {/* Case 3: Completed richness formatted document reader with sidebar archiving utilities */}
              {selectedDetailTask.status === "completed" && selectedDetailTask.generatedContent && (
                <div className="space-y-4" id="article-output-full-reader">
                  {/* Copy button and toolbar details */}
                  <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-205">
                    <h5 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      大作预览篇幅 (约 {selectedDetailTask.generatedContent.length} 字)：
                    </h5>
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedDetailTask.generatedContent || "", selectedDetailTask.id)}
                      className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-700 text-[11px] rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95"
                    >
                      {copiedTaskId === selectedDetailTask.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                          <span>已成功拷至剪贴板</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-emerald-600" />
                          <span>一键复制全文数据</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Prewrap block */}
                  <div className="text-slate-800 text-xs md:text-sm font-normal leading-relaxed whitespace-pre-wrap select-text bg-slate-50 hover:bg-slate-50/70 p-5 rounded-xl border border-slate-205 shadow-inner" style={{ minHeight: '160px', maxHeight: '280px', overflowY: 'auto' }}>
                    {selectedDetailTask.generatedContent}
                  </div>

                  {/* Archive drawer board */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150" id={`archive-detail-card-${selectedDetailTask.id}`}>
                    <div className="text-left space-y-0.5">
                      <h5 className="font-bold text-slate-820 text-[11px] flex items-center gap-1.5">
                        <Archive className="w-3.5 h-3.5 text-indigo-600" />
                        将此次产出的智慧大作一键归档至特定知识目录
                      </h5>
                      <p className="text-[10px] text-slate-450 mt-1">归档后本篇文章会自动以纯文本实体保存进所选的项目知识夹中，充实后续文笔反编素材储备。</p>
                    </div>

                    {archivedSuccessTaskIds[selectedDetailTask.id] ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 py-1.5 px-3.5 rounded-lg border border-emerald-200">
                        <Check className="w-3.5 h-3.5" /> 成功归档落库！
                      </span>
                    ) : (
                      <div className="flex items-center gap-2" id={`archive-action-group-${selectedDetailTask.id}`}>
                        <select
                          value={archiveTargetKBIds[selectedDetailTask.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setArchiveTargetKBIds(prev => ({ ...prev, [selectedDetailTask.id]: val }));
                          }}
                          className="bg-white border border-slate-200 text-[11px] px-2.5 py-1.5 rounded-lg outline-none focus:border-indigo-400 font-sans"
                        >
                          <option value="">-- 请选择要归档的存放知识文件夹 --</option>
                          {kbs.map(kb => (
                            <option key={kb.id} value={kb.id}>{kb.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleArchiveSubmit(selectedDetailTask.id)}
                          disabled={!archiveTargetKBIds[selectedDetailTask.id]}
                          className={`text-xs px-4 py-1.5 rounded-lg font-bold transition ${
                            archiveTargetKBIds[selectedDetailTask.id]
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-3xs'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-205'
                          }`}
                        >
                          确认一键归档
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0" id="creation-detail-footer">
              <div className="flex items-center gap-2">
                {/* Cancel pending */}
                {['pending', 'suggesting', 'researching', 'writing'].includes(selectedDetailTask.status) && onCancelTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onCancelTask(selectedDetailTask.id);
                    }}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold rounded-lg"
                  >
                    中断撰文调度
                  </button>
                )}

                {/* Rerun task */}
                {['completed', 'failed', 'cancelled'].includes(selectedDetailTask.status) && onRetryTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onRetryTask(selectedDetailTask.id);
                    }}
                    className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-600 text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重新调制神经网络生成</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailTask(null)}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                我知道了，关闭
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
