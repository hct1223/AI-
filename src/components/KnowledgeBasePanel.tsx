import React, { useState, useEffect } from "react";
import { FolderPlus, BookOpen, Link, FileText, Trash2, Plus, Calendar, Globe, Upload, ArrowLeft } from "lucide-react";
import { KnowledgeBase, Document } from "../types";

interface KnowledgeBasePanelProps {
  kbs: KnowledgeBase[];
  onCreateKB: (name: string, description: string) => Promise<void>;
  onDeleteKB: (id: string) => Promise<void>;
  selectedKBId: string | null;
  onSelectKB: (id: string) => void;
  kbDocuments: Document[];
  onImportDocument: (kbId: string, title: string, content: string) => Promise<void>;
}

export default function KnowledgeBasePanel({
  kbs,
  onCreateKB,
  onDeleteKB,
  selectedKBId,
  onSelectKB,
  kbDocuments,
  onImportDocument
}: KnowledgeBasePanelProps) {
  const [newKBName, setNewKBName] = useState("");
  const [newKBDesc, setNewKBDesc] = useState("");
  const [isCreatingKB, setIsCreatingKB] = useState(false);

  // New Document inputs
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [isImportingDoc, setIsImportingDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    setSelectedDoc(null);
  }, [selectedKBId]);

  const activeKB = kbs.find(kb => kb.id === selectedKBId);

  const handleCreateKBSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKBName.trim()) return;
    await onCreateKB(newKBName, newKBDesc);
    setNewKBName("");
    setNewKBDesc("");
    setIsCreatingKB(false);
  };

  const handleImportDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKBId || !docTitle.trim() || !docContent.trim()) return;
    await onImportDocument(selectedKBId, docTitle, docContent);
    setDocTitle("");
    setDocContent("");
    setIsImportingDoc(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full" id="kb-panel">
      {/* LEFT: Knowledge Base Lists */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col h-full overflow-hidden" id="kb-list-section">
        <div className="flex items-center justify-between mb-6 shrink-0" id="kb-list-header">
          <div>
            <h2 className="text-base font-bold text-slate-800">创作知识库</h2>
            <p className="text-xs text-slate-400">管理多个垂直领域的素材与文章</p>
          </div>
          <button
            onClick={() => setIsCreatingKB(!isCreatingKB)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
            id="kb-add-btn"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            新建知识库
          </button>
        </div>

        {/* Create KB Mini-Form */}
        {isCreatingKB && (
          <form onSubmit={handleCreateKBSubmit} className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl mb-6 space-y-3 animate-fadeIn" id="kb-create-form">
            <h3 className="text-xs font-bold text-slate-700">新建知识库容器</h3>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">知识库名称 *</label>
              <input
                type="text"
                required
                value={newKBName}
                onChange={(e) => setNewKBName(e.target.value)}
                placeholder="例如：量子力学设定集 / 科技硬件白皮书"
                className="w-full bg-white border border-slate-200 focus:border-indigo-505 focus:ring-2 focus:ring-indigo-100 rounded-lg py-1.5 px-3 text-xs outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">描述与定位</label>
              <textarea
                value={newKBDesc}
                onChange={(e) => setNewKBDesc(e.target.value)}
                placeholder="简述该知识库的内容特质，方便AI辅助创作时提取特征。"
                className="w-full bg-white border border-slate-200 focus:border-indigo-505 focus:ring-2 focus:ring-indigo-100 rounded-lg py-1.5 px-3 text-xs outline-none transition h-16 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingKB(false)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[11px] font-medium transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-medium transition"
              >
                确认创建
              </button>
            </div>
          </form>
        )}

        {/* KB Cards Grid */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1" id="kb-cards-container">
          {kbs.length === 0 ? (
            <div className="text-center py-12" id="kb-empty-prompt">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">目前没有任何知识库</p>
              <p className="text-[10px] text-slate-400">点击上方按钮，开启第一个灵感库吧</p>
            </div>
          ) : (
            kbs.map((kb) => {
              const isSelected = selectedKBId === kb.id;
              return (
                <div
                  key={kb.id}
                  onClick={() => onSelectKB(kb.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between group ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-50'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                  id={`kb-card-${kb.id}`}
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                      </span>
                      <h3 className="font-semibold text-slate-800 text-xs md:text-sm line-clamp-1">{kb.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">
                        {kb.documentsCount || 0} 篇
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed ml-1 pt-1">
                      {kb.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 ml-1 pt-1.5">
                      <Calendar className="w-3 h-3" />
                      {new Date(kb.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("删除知识库将会同时彻底删除旗下所有采集和导入的文档。确认删除吗？")) {
                        onDeleteKB(kb.id);
                      }
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0 opacity-0 group-hover:opacity-100"
                    title="删除知识库"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Selected KB Document list */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col h-full overflow-hidden" id="kb-docs-section">
        {activeKB ? (
          <>
            <div className="pb-4 border-b border-slate-100 mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4" id="kb-docs-header">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">当前知识库</span>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mt-0.5">
                  {activeKB.name}
                </h2>
              </div>
              <button
                onClick={() => setIsImportingDoc(!isImportingDoc)}
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-250 text-slate-750 rounded-lg text-xs font-medium transition shrink-0 border border-slate-200"
                id="doc-import-btn"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                导入文档记录
              </button>
            </div>

            {/* Document Import Form */}
            {isImportingDoc && (
              <form onSubmit={handleImportDocSubmit} className="bg-indigo-50/20 border border-indigo-100 p-5 rounded-xl mb-6 space-y-3 animate-fadeIn" id="doc-import-form">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    导入一篇知识文档
                  </h3>
                  <button type="button" onClick={() => setIsImportingDoc(false)} className="text-[10px] text-slate-400 hover:text-slate-600">关闭</button>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">文章标题 *</label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="写入文章标题，如：量子纠缠技术实现路线"
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 rounded-lg py-1.5 px-3 text-xs outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">文章内容/正文 *</label>
                  <textarea
                    required
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="将高价值的技术白皮书、参考文献或商业情报直接粘贴于此..."
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 rounded-lg py-1.5 px-3 text-xs outline-none transition h-32"
                  />
                </div>
                <div className="flex justify-end gap-2 text-right pt-1">
                  <button
                    type="button"
                    onClick={() => setIsImportingDoc(false)}
                    className="px-3 py-1.5 bg-slate-200/60 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                  >
                    确认导入并建库
                  </button>
                </div>
              </form>
            )}

            {/* Documents Scroll Area */}
            {selectedDoc ? (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 rounded-xl border border-slate-200/80 p-5 overflow-hidden animate-fadeIn" id="doc-detail-view">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-250 shrink-0">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-bold transition shadow-sm"
                    id="doc-detail-back"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                    返回文献列表
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">
                    录入时间: {new Date(selectedDoc.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pt-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">
                      {selectedDoc.title}
                    </h3>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {selectedDoc.source === "crawler" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-sky-50 text-sky-600 rounded-full font-bold border border-sky-100">
                          <Globe className="w-3 h-3" /> 数据采集爬虫
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full font-bold border border-amber-100">
                          <Upload className="w-3 h-3" /> 手工归纳导入
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-150 rounded-xl p-4 md:p-5 text-slate-700 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-sm select-text">
                    {selectedDoc.content || "此文档无正文内容..."}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-3.5 border-t border-slate-200">
                    <span className="truncate pr-4" title={selectedDoc.sourceDetail}>来源渠道: {selectedDoc.sourceDetail || "本地录入"}</span>
                    {selectedDoc.source === "crawler" && selectedDoc.sourceDetail.startsWith("http") && (
                      <a
                        href={selectedDoc.sourceDetail}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline shrink-0"
                      >
                        访问源链接
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" id="doc-cards-container">
                {kbDocuments.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200" id="doc-empty-prompt">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">知识库还没有被注入养分</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto px-6 leading-relaxed">
                      您可以点击“导入文档记录”来手动输入有价值的素材，或者通过侧边栏前往【数据采集】板块，用自动化爬虫全天候吸取特定网站的关键数据！
                    </p>
                  </div>
                ) : (
                  kbDocuments.map((doc) => {
                    const isCrawler = doc.source === "crawler";
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="bg-white border border-slate-200 p-4 rounded-xl hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                        id={`doc-card-${doc.id}`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isCrawler ? 'bg-sky-50 text-sky-500 group-hover:bg-sky-100' : 'bg-amber-50 text-amber-500 group-hover:bg-amber-100'} transition-all`}>
                            <FileText className="w-4 h-4 animate-pulse-slow" />
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="font-bold text-slate-700 text-xs md:text-sm truncate group-hover:text-indigo-600 transition-colors">
                              {doc.title}
                            </h3>
                            <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-medium">
                              <span className="truncate max-w-[220px] md:max-w-md" title={doc.sourceDetail}>
                                来源: {doc.sourceDetail || "手动输入"}
                              </span>
                              <span>•</span>
                              <span>{new Date(doc.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center pl-10 md:pl-0">
                          {isCrawler ? (
                            <span className="text-[9px] px-2.5 py-0.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-lg font-bold">
                              采集爬虫
                            </span>
                          ) : (
                            <span className="text-[9px] px-2.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg font-bold">
                              手工导入
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto" id="doc-unselected-prompt">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">请选择一个知识库</p>
            <p className="text-xs text-slate-400 mt-1">
              点击左侧知识库卡片即可载入它包含的所有精选文献，进行添加、删除及查看操作。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
