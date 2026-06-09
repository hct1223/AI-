import React, { useState, useEffect } from "react";
import { Play, Clipboard, Globe, Database, Terminal, CheckCircle, Loader2, AlertCircle, FileText, Calendar, StopCircle, RotateCcw, Trash2, XCircle, Plus, X } from "lucide-react";
import { CollectionTask, KnowledgeBase } from "../types";

interface ScraperPanelProps {
  tasks: CollectionTask[];
  kbs: KnowledgeBase[];
  onCreateTask: (name: string, url: string, prompt: string, kbId: string) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
  onRetryTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export default function ScraperPanel({
  tasks,
  kbs,
  onCreateTask,
  onCancelTask,
  onRetryTask,
  onDeleteTask
}: ScraperPanelProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);

  const [taskName, setTaskName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [scraperPrompt, setScraperPrompt] = useState("");
  const [selectedKBId, setSelectedKBId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const detailTask = tasks.find(t => t.id === selectedDetailTaskId) || null;

  // Auto-set selected KB on load if empty but kbs are available
  useEffect(() => {
    if (kbs.length > 0 && !selectedKBId) {
      setSelectedKBId(kbs[0].id);
    }
  }, [kbs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !targetUrl.trim() || !selectedKBId) return;

    setSubmitting(true);
    try {
      await onCreateTask(taskName, targetUrl, scraperPrompt, selectedKBId);
      // Clean up fields
      setTaskName("");
      setTargetUrl("");
      setScraperPrompt("");
      setIsCreateModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadges = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" /> 采集完成
          </span>
        );
      case 'scraping':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 正在采集
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full border border-rose-100">
            <AlertCircle className="w-3.5 h-3.5" /> 采集失败
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full border border-gray-150">
            <XCircle className="w-3.5 h-3.5 text-gray-400" /> 已取消
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-slate-100 text-slate-550 px-2.5 py-1 rounded-full border border-slate-200">
            <Calendar className="w-3.5 h-3.5" /> 排队中
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden p-6" id="scraper-panel-container">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60 shrink-0" id="scraper-header-bar">
        <div className="text-left">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Globe className="w-4.5 h-4.5 text-indigo-650" />
            数据采集任务队列
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-normal">
            在此管理空间里的数据抓取。新建抓取任务后将自动以独立沙箱运行。
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-100 shrink-0"
          id="scraper-create-trigger-btn"
        >
          <Plus className="w-4 h-4" />
          <span>新建采集任务</span>
        </button>
      </div>

      {/* Main Task List */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden p-5" id="scraper-list-box">
        <div className="text-left mb-4 shrink-0">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider">空间内采集任务清单 ({tasks.length})</h3>
          <p className="text-[10px] text-slate-400 font-normal">点击任意采集任务项，即可查看任务详情以及实时的抓取底层日志。</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="scraper-tasks-list">
          {tasks.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200 h-full flex flex-col justify-center items-center">
              <Clipboard className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-bold">目前此空间尚无任何采集任务记录</p>
              <p className="text-[10px] text-slate-400 mt-1.5 max-w-sm">
                点击右上角的 <b>“新建采集任务”</b>，指定目标要抓取的灵感网站或知识篇章，即可启动抓取流。
              </p>
            </div>
          ) : (
            tasks.map((task) => {
              const targetKBName = kbs.find(kb => kb.id === task.kbId)?.name || '未知知识库';
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedDetailTaskId(task.id)}
                  className="p-4 rounded-xl border border-slate-150/70 bg-white hover:border-indigo-200 hover:bg-slate-50/40 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-left"
                  id={`task-${task.id}`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 bg-slate-100 rounded-lg text-slate-500 shrink-0">
                         <Globe className="w-3.5 h-3.5 text-indigo-600" />
                      </span>
                      <h3 className="font-bold text-slate-800 text-xs md:text-sm truncate">{task.name}</h3>
                      <span className="shrink-0">{statusBadges(task.status)}</span>
                    </div>
                    
                    <div className="text-[10.5px] text-slate-500 space-y-1 ml-1 leading-relaxed font-normal">
                      <p className="truncate"><span className="text-slate-400">采集源链接:</span> <span className="font-mono text-indigo-600">{task.url}</span></p>
                      <p className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Database className="w-3 h-3 text-indigo-500" />
                          <span>落库目录: <span className="font-bold text-slate-700">{targetKBName}</span></span>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-400" />
                          <span>已收录文章数: <span className="font-mono font-bold text-indigo-600">{task.docsScrapedCount}</span> 篇</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions & Meta */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(task.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailTaskId(task.id);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:text-indigo-600 hover:border-indigo-400 transition font-bold shadow-xs flex items-center gap-1"
                      >
                        透视详情
                      </button>

                      {/* Cancel task */}
                      {(task.status === 'pending' || task.status === 'scraping') && onCancelTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelTask(task.id);
                          }}
                          title="中止任务"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border border-rose-200 flex items-center justify-center transition"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Rerun task */}
                      {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && onRetryTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetryTask(task.id);
                          }}
                          title="重新运行"
                          className="bg-sky-50 hover:bg-sky-100 text-sky-600 p-1.5 rounded-lg border border-sky-200 flex items-center justify-center transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Absolute delete list */}
                      {onDeleteTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("确定要彻底删除该采集任务吗？")) {
                              onDeleteTask(task.id);
                            }
                          }}
                          title="彻底删除"
                          className="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-rose-600 p-1.5 rounded-lg border border-slate-200 flex items-center justify-center transition"
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

      {/* Modal dialog: Create Task */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="create-scraper-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] text-left" id="create-scraper-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-indigo-600" />
                  新建数据采集任务
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                  对目标参考网站进行定向抓取，并进行自动化去噪与结构化净化。
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {kbs.length === 0 ? (
                <div className="p-8 text-center bg-amber-50 rounded-xl border border-dashed border-amber-200 space-y-2">
                  <Database className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-amber-800 font-bold">暂无可用知识库文件夹容器</p>
                  <p className="text-[10.5px] text-amber-700 leading-normal max-w-xs mx-auto">
                    采集到的文章数据在写入前必须分配知识库目录。请先前往<b>【知识库管理】</b>版块中创建一个专属文件夹，然后再返回添加采集流。
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" id="scraper-form-inner">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">采集任务名称 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="例如：抓取前沿物理探索 - 量子理论"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl py-2 px-3 text-xs outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">目标 URL 网页链接 <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input
                        type="url"
                        required
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://example.com/wiki/Quantum_computing"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl py-2 pl-9 pr-3 text-xs outline-none transition font-mono"
                      />
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">落库目标知识文件夹 <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={selectedKBId}
                      onChange={(e) => setSelectedKBId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:border-indigo-500 rounded-xl py-2 px-3 text-xs outline-none transition"
                    >
                      <option value="">-- 请选择要分配写入的知识库 --</option>
                      {kbs.map((kb) => (
                        <option key={kb.id} value={kb.id}>{kb.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">内容提纯与格式净化指令 Prompt (可选)</label>
                    <textarea
                      value={scraperPrompt}
                      onChange={(e) => setScraperPrompt(e.target.value)}
                      placeholder="例如：只需提取网页正文核心论据段落，去除头尾导航及无关栏目，自动将数据段解析转化为结构化要点。"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl py-2 px-3 text-xs outline-none transition h-24 resize-none leading-relaxed font-normal"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-3.5 py-1.5 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition font-medium"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-1.5 font-bold rounded-lg transition shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:bg-slate-300"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>正在配置采集管道...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>开始执行数据采集</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal dialog: Task Details with terminal logs */}
      {detailTask && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="scraper-detail-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[75vh] max-h-[90vh] text-left" id="scraper-detail-modal">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 rounded-xl text-indigo-700 shrink-0">
                  <Globe className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">采集任务详情: {detailTask.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">创建时间: {new Date(detailTask.createdAt).toLocaleString()} | 空间特征编码: {detailTask.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailTaskId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white" id="scraper-detail-body">
              {/* Basic Meta Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">采集进程状态</span>
                  <div className="mt-1.5 shrink-0">{statusBadges(detailTask.status)}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-155 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">存储到目标知识库</span>
                  <div className="mt-1.5 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{kbs.find(k => k.id === detailTask.kbId)?.name || "安全隔离仓"}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-155 rounded-xl">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">已采录提纯文献</span>
                  <div className="mt-1 text-xs font-extrabold text-indigo-600 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="font-mono text-sm">{detailTask.docsScrapedCount}</span>
                    <span className="text-[10px] text-slate-400 font-normal">篇</span>
                  </div>
                </div>
              </div>

              {/* URL & Prompts info */}
              <div className="space-y-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">网页抓取目标URL</span>
                  <a
                    href={detailTask.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-indigo-600 hover:underline inline-block mt-1 truncate max-w-full"
                  >
                    {detailTask.url}
                  </a>
                </div>

                {detailTask.prompt ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-405 font-bold block">定向净化提取指令 Prompt</span>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal whitespace-pre-wrap">{detailTask.prompt}</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-400 text-xs italic">
                    无特定的抽取 Prompt，系统已启动高智能自适应解析提取。
                  </div>
                )}
              </div>

              {/* Bot communication log container */}
              <div className="space-y-1.5 flex flex-col flex-1 min-h-[160px]" id="scraper-log-panel-details">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    底层采集机器人/大模型解析实时通信包日志
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    最新 {detailTask.logs.length} 行
                  </span>
                </div>

                <div className="flex-1 bg-slate-900 rounded-xl p-4 font-mono text-[11px] hover:text-indigo-100 text-indigo-200/90 border border-slate-800 max-h-[220px] overflow-y-auto space-y-1.5 select-text leading-relaxed">
                  {detailTask.logs.length === 0 ? (
                    <p className="text-slate-500 italic">尚未执行抓取流程，暂无控制台包数据。</p>
                  ) : (
                    detailTask.logs.map((log, index) => (
                      <p key={index} className="hover:bg-slate-800/60 px-1 rounded transition">
                        {log}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between shrink-0" id="scraper-detail-panel-footer">
              <div className="flex items-center gap-1.5">
                {/* Cancel task if running */}
                {(detailTask.status === 'pending' || detailTask.status === 'scraping') && onCancelTask && (
                  <button
                    onClick={() => onCancelTask(detailTask.id)}
                    className="bg-rose-50 hover:bg-rose-105 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-bold transition flex items-center gap-1"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>中止挂起任务</span>
                  </button>
                )}

                {/* Retry task if stopped */}
                {(detailTask.status === 'completed' || detailTask.status === 'failed' || detailTask.status === 'cancelled') && onRetryTask && (
                  <button
                    onClick={() => {
                      onRetryTask(detailTask.id);
                    }}
                    className="bg-sky-50 hover:bg-sky-100 text-sky-600 px-3 py-1.5 rounded-lg border border-sky-200 text-xs font-bold transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重新执行</span>
                  </button>
                )}
                
                {onDeleteTask && (
                  <button
                    onClick={() => {
                      if (confirm("确定要彻底删除该采集任务吗？")) {
                        onDeleteTask(detailTask.id);
                        setSelectedDetailTaskId(null);
                      }
                    }}
                    className="text-xs bg-white text-slate-500 hover:text-rose-650 border border-slate-200 py-1.5 px-3 rounded-lg hover:border-rose-450 transition"
                  >
                    删除
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedDetailTaskId(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
