import React, { useState, useEffect } from "react";
import { Sparkles, Library, FileText, CheckCircle, BrainCircuit, Loader2, RefreshCw, ZoomIn, Quote, ChevronRight, BookOpen, XCircle, Plus, X, Trash2, StopCircle, Terminal, Info, HeartHandshake } from "lucide-react";
import { Persona, PersonaTask, KnowledgeBase, Document } from "../types";

interface PersonaPanelProps {
  personas: Persona[];
  tasks: PersonaTask[];
  kbs: KnowledgeBase[];
  allDocs: Document[];
  onCreateTask: (name: string, kbIds: string[]) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export default function PersonaPanel({
  personas,
  tasks,
  kbs,
  allDocs,
  onCreateTask,
  onCancelTask,
  onDeleteTask
}: PersonaPanelProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const [personaName, setPersonaName] = useState("");
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // States for the child popup selection dialog
  const [isKbSelectorOpen, setIsKbSelectorOpen] = useState(false);
  const [tempSelectedDocIds, setTempSelectedDocIds] = useState<string[]>([]);
  const [tempSelectedKbIds, setTempSelectedKbIds] = useState<string[]>([]);
  const [activeKbId, setActiveKbId] = useState<string>("");

  const detailTask = tasks.find(t => t.id === selectedTaskId) || null;
  const detailPersona = personas.find(p => p.id === selectedPersonaId) || null;

  // Sync activeKbId on load
  useEffect(() => {
    if (kbs.length > 0 && !activeKbId) {
      setActiveKbId(kbs[0].id);
    }
  }, [kbs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const docKbIds = allDocs
      .filter(d => selectedDocIds.includes(d.id))
      .map(d => d.kbId);
    const finalKbIds = Array.from(new Set([...selectedKbIds, ...docKbIds]));

    if (!personaName.trim() || finalKbIds.length === 0) return;

    setSubmitting(true);
    try {
      await onCreateTask(personaName, finalKbIds);
      // Reset state
      setPersonaName("");
      setSelectedDocIds([]);
      setSelectedKbIds([]);
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKbToggle = (kbId: string, kbDocs: Document[], isChecked: boolean) => {
    const kbDocIds = kbDocs.map(d => d.id);
    if (isChecked) {
      setTempSelectedKbIds(prev => prev.filter(id => id !== kbId));
      setTempSelectedDocIds(prev => prev.filter(id => !kbDocIds.includes(id)));
    } else {
      setTempSelectedKbIds(prev => [...new Set([...prev, kbId])]);
      if (kbDocs.length > 0) {
        setTempSelectedDocIds(prev => [...new Set([...prev, ...kbDocIds])]);
      }
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-100">
            <CheckCircle className="w-3 h-3" /> 萃取成功
          </span>
        );
      case "extracting":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> 分析萃取中
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-100">
            X 萃取失败
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full border border-gray-150">
            排队等待
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden p-6" id="persona-panel-container">
      {/* Top Banner and Navigation Actions */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60 shrink-0" id="persona-header-bar">
        <div className="text-left">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <BrainCircuit className="w-4.5 h-4.5 text-indigo-650" />
            人格特征萃取控制台
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-normal">
            提供由 AI 驱动的核心模型反向修辞风格解密，输入特定的文章语料，自动对其语气调性、词汇习惯、常用句式及修辞技巧建模。
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-100 shrink-0"
          id="persona-create-trigger-btn"
        >
          <Plus className="w-4 h-4" />
          <span>提炼新创作人格</span>
        </button>
      </div>

      {/* Main split dashboard view */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden" id="persona-split-canvas">
        {/* LEFT COMPONENT: Task queue history (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col overflow-hidden p-5">
          <div className="text-left mb-4 shrink-0">
            <h3 className="text-xs font-bold text-slate-850 tracking-wider">人格特征萃取执行历史 ({tasks.length})</h3>
            <p className="text-[10px] text-slate-400">点击萃取历史任务，查看 AI 在高维语义空间的词频、情绪及叙事风格提炼进度。</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="persona-tasks-list">
            {tasks.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-150 h-full flex flex-col justify-center items-center">
                <BrainCircuit className="w-10 h-10 text-slate-350 mb-2 animate-pulse" />
                <p className="text-xs text-slate-500 font-bold">暂无启动过的萃取记录</p>
                <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs">
                  点击右上角 <b>“提炼新创作人格”</b> 绑定知识库，体验大模型句法结构去噪反编译。
                </p>
              </div>
            ) : (
              tasks.map((task) => {
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="p-4 rounded-xl border border-slate-150 bg-white hover:border-indigo-300 hover:bg-slate-50/30 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs text-left"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1 px-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-mono font-bold shrink-0">
                          TASK
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm truncate">{task.name}</h4>
                        <span className="shrink-0">{statusBadge(task.status)}</span>
                      </div>

                      {/* Log snippet */}
                      <p className="text-[10px] font-mono text-slate-450 bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                        🤖 最新执行步骤: <span className="text-indigo-650">{task.logs[task.logs.length - 1] || "等待分片加载..."}</span>
                      </p>
                    </div>

                    <div className="flex items-center md:flex-col items-start md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 shrink-0">
                      <span className="text-[10px] text-slate-450 font-mono">
                        {new Date(task.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(task.id);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 text-indigo-600 bg-indigo-50/50 rounded hover:bg-indigo-100/50 transition shrink-0"
                      >
                        透视状态
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: Extracted stable personas library (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-150 shadow-sm flex flex-col overflow-hidden p-5">
          <div className="text-left mb-4 shrink-0">
            <h3 className="text-xs font-bold text-slate-850 tracking-wider">已存储的专家级创作表达人格 ({personas.length})</h3>
            <p className="text-[10px] text-slate-500">建模完成的稳定人格将永久驻留在此沙盒中，您可在内容大纲创作时任意指派调用。</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1" id="personas-resource-pool">
            {personas.length === 0 ? (
              <div className="text-center py-24 bg-slate-50/30 rounded-xl h-full flex flex-col justify-center items-center text-slate-400">
                <Library className="w-10 h-10 text-slate-300 mb-1" />
                <p className="text-[11px]">暂无已铸造的人格成品</p>
              </div>
            ) : (
              personas.map((persona) => {
                return (
                  <div
                    key={persona.id}
                    onClick={() => setSelectedPersonaId(persona.id)}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/20 hover:border-indigo-400 hover:bg-indigo-50/5 cursor-pointer transition text-left space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-1.5 select-all">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        {persona.name}
                      </h4>
                      <span className="text-[9px] bg-slate-100 border border-slate-150 text-slate-500 px-1.5 py-0.2 rounded-full font-bold select-none shrink-0">
                        可用
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-450 leading-relaxed font-normal line-clamp-2">
                      {persona.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 font-mono text-[9.5px] text-slate-400 shrink-0">
                      <span>文风: <span className="font-sans font-bold text-slate-700">{persona.extractedTraits.tone}</span></span>
                      <span className="text-indigo-650 font-bold hover:underline flex items-center gap-0.5">
                        <ZoomIn className="w-3 h-3" />
                        深入报告
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Persona Task Flow */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="create-persona-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] text-left" id="create-persona-form-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BrainCircuit className="w-4.5 h-4.5 text-indigo-600" />
                  提炼新创作表达人格
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                  绑定特定的代表作品或高词法特征知识库，由 AI 解构其语气、情绪极性与经典段落特质。
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition animate-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4" id="persona-active-form">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">赋予人格的名称 <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    placeholder="如：极简科普通俗风 / 行业智库资深主笔"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-505 focus:ring-1 focus:ring-indigo-100 rounded-xl py-2 px-3 text-xs outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      绑定参考建模语料 (知识库) <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold font-mono">
                      已载入 {selectedDocIds.length} 篇文章
                    </span>
                  </label>

                  {kbs.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-red-200 bg-red-50 rounded-xl space-y-1">
                      <p className="text-xs text-red-800 font-bold">没有可供提纯的知识语料库</p>
                      <p className="text-[10px] text-red-405 leading-normal max-w-xs mx-auto">
                        反向建模必须提取文字特征。请先在【知识库文献】版块里添加一个文件夹并存入2-3篇富文本经典范例，再开启特征萃取！
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempSelectedDocIds(selectedDocIds);
                        setTempSelectedKbIds(selectedKbIds);
                        if (kbs.length > 0) {
                          setActiveKbId(kbs[0].id);
                        }
                        setIsKbSelectorOpen(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-slate-100/30 rounded-xl p-3 text-left transition flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1">
                        {selectedDocIds.length === 0 && selectedKbIds.length === 0 ? (
                          <div>
                            <p className="text-xs text-slate-400 font-normal">点击配置参考文献与知识库...</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-normal">挑选特定代表作或整库文档进行特征建模</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-indigo-600">
                              已选中 {selectedDocIds.length} 篇参考范本文件
                            </p>
                            <p className="text-[10px] text-slate-400 truncate pr-4">
                              {(() => {
                                const titles = allDocs
                                  .filter(d => selectedDocIds.includes(d.id))
                                  .map(d => d.title);
                                if (titles.length === 0 && selectedKbIds.length > 0) {
                                  const kbNames = kbs.filter(k => selectedKbIds.includes(k.id)).map(k => k.name);
                                  return `全库目录：${kbNames.join("、")}`;
                                }
                                return titles.join("、");
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-indigo-600 font-bold group-hover:translate-x-0.5 transition" style={{ transitionDuration: '200ms' }}>
                        <span>挑选</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs shrink-0 font-medium">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 hover:bg-slate-100 text-slate-505 border border-slate-200 rounded-lg transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (selectedDocIds.length === 0 && selectedKbIds.length === 0)}
                    className="px-4 py-1.5 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:bg-slate-300"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>流语言提取建模中...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>开始AI人格特征提炼</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Child Modal: Knowledge / Doc picker selection dialog */}
      {isKbSelectorOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }} id="doc-picker-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl h-[480px] flex flex-col overflow-hidden max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/55 shrink-0">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  指派作为文体建模的知识语料
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">勾选具有强烈文字偏好口癖的前期代表文稿作为萃取原液。</p>
              </div>
              <button
                onClick={() => setIsKbSelectorOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden bg-white">
              {/* Left sidebar database menu */}
              <div className="w-2/5 border-r border-slate-150 bg-slate-50/30 overflow-y-auto p-2 space-y-1">
                <span className="block text-[9.5px] font-bold text-slate-400 px-2 py-1 select-none">知识库目录</span>
                {kbs.map(kb => {
                  const kbDocs = allDocs.filter(d => d.kbId === kb.id);
                  const isSelected = activeKbId === kb.id;
                  const isAllDocsChecked = kbDocs.length > 0 && kbDocs.every(d => tempSelectedDocIds.includes(d.id));
                  const isSomeDocsChecked = kbDocs.some(d => tempSelectedDocIds.includes(d.id)) && !isAllDocsChecked;

                  return (
                    <div
                      key={kb.id}
                      onClick={() => setActiveKbId(kb.id)}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        isSelected ? 'bg-white shadow-xs border border-indigo-100 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0" onClick={(e) => {
                        e.stopPropagation();
                        handleKbToggle(kb.id, kbDocs, isAllDocsChecked);
                      }}>
                        <input
                          type="checkbox"
                          checked={isAllDocsChecked}
                          ref={el => { if (el) el.indeterminate = isSomeDocsChecked; }}
                          onChange={() => {}}
                          className="rounded text-indigo-650 h-3 w-3"
                        />
                        <span className="truncate">{kb.name}</span>
                      </div>
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                        {kbDocs.length}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right document rows list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <span className="block text-[9.5px] font-bold text-slate-400 select-none pb-1 border-b border-dashed border-slate-100">
                  可绑定文章集合
                </span>
                {allDocs.filter(d => d.kbId === activeKbId).length === 0 ? (
                  <p className="text-xs text-slate-403 italic py-6 text-center">该目录下目前没有任何参考文献。</p>
                ) : (
                  allDocs
                    .filter(d => d.kbId === activeKbId)
                    .map(doc => {
                      const isChecked = tempSelectedDocIds.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50/50 border border-transparent hover:border-slate-100 cursor-pointer text-xs"
                          onClick={() => {
                            if (isChecked) {
                              setTempSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                            } else {
                              setTempSelectedDocIds(prev => [...prev, doc.id]);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-indigo-650 h-3 w-3 mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1 leading-normal">
                            <span className="font-bold text-slate-755 block truncate">{doc.title}</span>
                            <span className="text-[9.5px] text-slate-400 font-mono">
                              (字数: {doc.content.length} 字 | 录入于: {new Date(doc.createdAt).toLocaleDateString()})
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-450 leading-relaxed font-normal">已暂时锁选 <span className="font-bold text-indigo-600">{tempSelectedDocIds.length}</span> 篇文献</span>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setIsKbSelectorOpen(false)}
                  className="px-3.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 font-medium"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setSelectedDocIds(tempSelectedDocIds);
                    setSelectedKbIds(tempSelectedKbIds);
                    setIsKbSelectorOpen(false);
                  }}
                  className="px-4 py-1 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  确认选配
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Task details report showing logs */}
      {detailTask && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="task-detail-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[650px] max-h-[85vh] text-left" id="task-detail-modal-card">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">萃取任务步骤透视: {detailTask.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">任务流水编号: {detailTask.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-slate-450 hover:text-slate-650 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider">萃取工作树进度</span>
                <span className="shrink-0">{statusBadge(detailTask.status)}</span>
              </div>

              {/* Status information and tips */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-150 space-y-1.5 text-xs text-indigo-900">
                <h4 className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  人格特征提纯的工作机制：
                </h4>
                <p className="leading-relaxed font-normal text-slate-600">
                  系统在此任务流中获取了知识库文献的全部原义向量，首先会由大语言模型多维度分析<b>「修辞倾向 (标点、疑问句密、关联词句频)」</b>和<b>「情感起伏流向」</b>。去噪去芜后，最终生成可用于后续生成创作的描述实体并自动固化入库。
                </p>
              </div>

              {/* Console log prints */}
              <div className="space-y-1.5 flex flex-col">
                <span className="text-[10.5px] font-bold text-slate-400 block uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  句式分析器与大模型通信日志：
                </span>
                <div className="bg-slate-900 text-indigo-200/90 font-mono text-xs p-4 rounded-xl border border-slate-800 space-y-2 max-h-56 overflow-y-auto select-text leading-relaxed">
                  {detailTask.logs.map((log, lidx) => (
                    <p key={lidx} className="hover:bg-slate-800 px-1 rounded transition whitespace-nowrap">
                      &gt; {log}
                    </p>
                  ))}
                </div>
              </div>

              {/* Result summary lookup if completed */}
              {detailTask.status === "completed" && (
                <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" /> 
                    特征萃取铸模成功！
                  </p>
                  <p className="text-[11px] leading-normal text-slate-600">
                    大语言模型已分析出该风格的典型修辞与写作模板，并已永久固化写入此空间的<b>【专家型创作人格资源池】</b>，即可在创意内容撰写中立刻调用！
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-end shrink-0 gap-1.5">
              {onCancelTask && (detailTask.status === 'extracting') && (
                <button
                  onClick={() => {
                    onCancelTask(detailTask.id);
                  }}
                  className="px-3.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-220 rounded-lg text-xs"
                >
                  中止萃取任务
                </button>
              )}
              {onDeleteTask && (
                <button
                  onClick={() => {
                    if (confirm("确认要彻底清除该萃取监控记录吗？")) {
                      onDeleteTask(detailTask.id);
                      setSelectedTaskId(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-205 text-slate-500 text-xs hover:text-rose-500 transition"
                >
                  删除记录
                </button>
              )}
              <button
                onClick={() => setSelectedTaskId(null)}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                确认关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selected Persona Details Deep Report */}
      {detailPersona && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="persona-trait-deep-modal">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[650px] max-h-[85vh] text-left" id="persona-deep-card">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="text-xs font-bold text-slate-800">深度文风设定报告: {detailPersona.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">已与神经网络大语流完成映射固化</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPersonaId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white font-normal" id="persona-trait-deep-body">
              {/* Profile Card */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">人格特质简述</span>
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">{detailPersona.description}</p>
              </div>

              {/* Extracted Traits Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div className="bg-indigo-50/20 p-3.5 border border-indigo-150 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">语气态度风格</span>
                  <p className="text-xs font-bold text-slate-800 leading-normal">{detailPersona.extractedTraits.tone}</p>
                </div>
                <div className="bg-amber-50/20 p-3.5 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block">典型句法结构特征</span>
                  <p className="text-xs font-bold text-slate-800 leading-normal">{detailPersona.extractedTraits.writingStyle}</p>
                </div>
              </div>

              {/* Signature Terms / Keywords */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">核心表达偏好词频 (Keywords)</span>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {detailPersona.extractedTraits.keywords.map((kw, idx) => (
                    <span key={idx} className="bg-slate-100 border border-slate-200 font-bold px-2 py-0.5 rounded text-slate-700 text-xs shadow-3xs font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample excerpt citation quote */}
              {detailPersona.extractedTraits.samplePassage && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">口吻特征示范段落 (Citations)</span>
                  <div className="p-3.5 bg-slate-50 border-l-4 border-indigo-500 rounded-r-xl relative italic text-xs text-slate-650 leading-relaxed font-serif">
                    <Quote className="w-6 h-6 text-indigo-100 absolute -top-1 -left-1 transform scale-75 select-none -z-1" />
                    <span className="relative z-1">{detailPersona.extractedTraits.samplePassage}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0 font-medium">
              <span className="text-[10px] text-slate-450 leading-relaxed font-normal flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-500" />
                可在智能创作撰文时作为写作大纲的文风参考。
              </span>
              <button
                onClick={() => setSelectedPersonaId(null)}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                关闭报告
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
