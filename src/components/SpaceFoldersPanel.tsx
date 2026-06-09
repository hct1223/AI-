import React, { useState, useEffect } from "react";
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Archive, 
  Check, 
  Edit3, 
  Save, 
  Move, 
  Loader2, 
  X, 
  Globe, 
  PenTool, 
  BookOpen,
  ArrowRight,
  Filter
} from "lucide-react";
import { SpaceFolder, SpaceFile, KnowledgeBase } from "../types";

interface SpaceFoldersPanelProps {
  selectedSpaceId: string;
  kbs: KnowledgeBase[];
  onDocArchived?: () => void;
}

export default function SpaceFoldersPanel({
  selectedSpaceId,
  kbs,
  onDocArchived
}: SpaceFoldersPanelProps) {
  // State variables
  const [folders, setFolders] = useState<SpaceFolder[]>([]);
  const [files, setFiles] = useState<SpaceFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all" | "root">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<SpaceFile | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);
  
  // Creation Modals
  const [isFolderModelOpen, setIsFolderModelOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [newFileFolderId, setNewFileFolderId] = useState<string>("");

  // Archive States
  const [targetKbId, setTargetKbId] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Load Folder and Files data
  const loadFolders = async () => {
    setFoldersLoading(true);
    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/folders`);
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } catch (e) {
      console.error("Load folders error", e);
    } finally {
      setFoldersLoading(false);
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        
        // Relink selected file if it's open to represent fresh variables
        if (selectedFile) {
          const fresh = data.find((f: SpaceFile) => f.id === selectedFile.id);
          if (fresh) {
            setSelectedFile(fresh);
          } else {
            setSelectedFile(null);
          }
        }
      }
    } catch (e) {
      console.error("Load files error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
    loadFiles();
    setSelectedFolderId("all");
    setSelectedFile(null);
  }, [selectedSpaceId]);

  useEffect(() => {
    if (kbs.length > 0 && !targetKbId) {
      setTargetKbId(kbs[0].id);
    }
  }, [kbs]);

  // Actions
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName })
      });
      if (res.ok) {
        setNewFolderName("");
        setIsFolderModelOpen(false);
        await loadFolders();
      }
    } catch (e) {
      console.error("Create folder error", e);
    }
  };

  const handleDeleteFolder = async (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm("是否确定删除此文件夹？文件夹内的文件将被自动移动到各自的任务默认文件夹中。")) return;

    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/folders/${folderId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (selectedFolderId === folderId) {
          setSelectedFolderId("all");
        }
        await loadFolders();
        await loadFiles();
      }
    } catch (e) {
      console.error("Delete folder error", e);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim() || !newFileContent.trim()) return;

    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newFileTitle,
          content: newFileContent,
          folderId: newFileFolderId || undefined
        })
      });
      if (res.ok) {
        setNewFileTitle("");
        setNewFileContent("");
        setNewFileFolderId("");
        setIsFileModalOpen(false);
        await loadFiles();
      }
    } catch (e) {
      console.error("Create file error", e);
    }
  };

  const handleUpdateFile = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/files/${selectedFile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent
        })
      });
      if (res.ok) {
        setIsReadOnly(true);
        await loadFiles();
      }
    } catch (e) {
      console.error("Update file error", e);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("确定删除此文件素材吗？这一动作不可逆。")) return;
    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/files/${fileId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSelectedFile(null);
        await loadFiles();
      }
    } catch (e) {
      console.error("Delete file error", e);
    }
  };

  const handleMoveFile = async (fileId: string, folderId: string) => {
    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: folderId === "root" ? null : folderId })
      });
      if (res.ok) {
        await loadFiles();
      }
    } catch (e) {
      console.error("Move file error", e);
    }
  };

  const handleArchiveFile = async (fileId: string) => {
    if (!targetKbId) {
      alert("请先创建或选择一个目标知识库");
      return;
    }
    setArchivingId(fileId);
    try {
      const res = await fetch(`/api/spaces/${selectedSpaceId}/files/${fileId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kbId: targetKbId })
      });
      if (res.ok) {
        alert("成果文章已成功同步并写入您的知识库！");
        await loadFiles();
        if (onDocArchived) {
          onDocArchived();
        }
      } else {
        const err = await res.json();
        alert(`归档失败: ${err.error || "未知原因"}`);
      }
    } catch (e: any) {
      alert(`归档报错: ${e.message}`);
    } finally {
      setArchivingId(null);
    }
  };

  const startEditFile = (file: SpaceFile) => {
    setEditTitle(file.title);
    setEditContent(file.content);
    setIsReadOnly(false);
  };

  // Filters and Computes
  const filteredFiles = files.filter(f => {
    // Math category folder filtering
    if (selectedFolderId !== "all") {
      if (selectedFolderId === "root") {
        if (f.folderId) return false;
      } else {
        if (f.folderId !== selectedFolderId) return false;
      }
    }
    
    // Search matching
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return f.title.toLowerCase().includes(query) || f.content.toLowerCase().includes(query);
  });

  return (
    <div className="flex h-full min-h-0 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden" id="space-folders-panel">
      {/* 1. LEFT SIDE PANEL: FOLDER TREE LIST */}
      <div className="w-64 border-r border-slate-100 flex flex-col shrink-0 bg-slate-50/50" id="folders-sidebar">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-2">
            <Folder className="w-4 h-4 text-slate-500" />
            成果文件夹
          </h3>
          <button 
            onClick={() => setIsFolderModelOpen(true)}
            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition active:scale-90"
            title="新建自定义文件夹"
            id="btn-new-folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5" id="folders-scrollable">
          {/* Default Root Category */}
          <button
            onClick={() => setSelectedFolderId("all")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold ring-0 transition ${
              selectedFolderId === "all" 
                ? "bg-slate-900 text-white shadow-sm" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <Folder className={`w-4 h-4 ${selectedFolderId === "all" ? "text-indigo-400" : "text-slate-400"}`} />
              全部文件资料
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${selectedFolderId === "all" ? "bg-slate-800 text-slate-200" : "bg-slate-200/60 text-slate-500"}`}>
              {files.length}
            </span>
          </button>

          {/* Scrapers and Creations Automatic Separators */}
          {foldersLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-1.5 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              正在载入空间档案...
            </div>
          ) : (
            <>
              {folders.map(folder => {
                const isDefault = folder.id.startsWith("folder-scraped") || folder.id.startsWith("folder-creation");
                const folderFileCount = files.filter(f => f.folderId === folder.id).length;

                return (
                  <div key={folder.id} className="group relative flex items-center">
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition ${
                        selectedFolderId === folder.id 
                          ? "bg-slate-900 text-white shadow-sm" 
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate pr-4">
                        <Folder className={`w-4 h-4 shrink-0 ${
                          selectedFolderId === folder.id 
                            ? "text-indigo-400" 
                            : isDefault 
                              ? folder.id.startsWith("folder-scraped") ? "text-sky-400" : "text-pink-400"
                              : "text-amber-500"
                        }`} />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${selectedFolderId === folder.id ? "bg-slate-800 text-slate-200" : "bg-slate-200/60 text-slate-500"}`}>
                        {folderFileCount}
                      </span>
                    </button>

                    {/* Delete action for custom folders */}
                    {!isDefault && (
                      <button
                        onClick={(e) => handleDeleteFolder(folder.id, e)}
                        className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
                        title="删除文件夹"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Quick manuals button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => {
              setNewFileFolderId(selectedFolderId !== "all" && selectedFolderId !== "root" ? selectedFolderId : "");
              setIsFileModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 hover:text-indigo-700 bg-indigo-50/20 hover:bg-indigo-50 text-xs font-bold rounded-xl transition"
            id="btn-new-file"
          >
            <Plus className="w-3.5 h-3.5 animate-pulse" />
            新建手动文本文档
          </button>
        </div>
      </div>

      {/* 2. MIDDLE FILTERS & FILE GRID PANELS */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedFile ? "md:w-[45%]" : "w-full"}`} id="files-list-viewport">
        {/* Top filter elements */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="在当前文件夹搜索标题或关键字..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              id="search-files-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="text-[11px] font-bold text-slate-500 uppercase font-mono tracking-wider bg-slate-100 px-3 py-1.5 rounded-lg select-none flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            已筛选: {filteredFiles.length} 篇
          </div>
        </div>

        {/* Files Grid scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" id="files-grid-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs font-bold gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>正在汇聚空间文件资料...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
              <Folder className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-xs font-bold text-slate-500">此文件夹下空空如也</p>
              <p className="text-[11px] text-slate-400/80 mt-1 max-w-[200px] leading-relaxed">
                快去触发数据采集或智能写作任务吧，生成出的文本资料将自动汇聚在此。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
              {filteredFiles.map(file => {
                const folderName = folders.find(fd => fd.id === file.folderId)?.name || "/";
                const isSelected = selectedFile?.id === file.id;

                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile(file);
                      setIsReadOnly(true);
                    }}
                    className={`p-4 border rounded-xl text-left cursor-pointer transition relative group flex flex-col justify-between h-40 ${
                      isSelected 
                        ? "border-indigo-600 bg-indigo-50/10 shadow-sm" 
                        : "border-slate-150 hover:border-slate-300 hover:bg-slate-50/30 bg-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Badge source type */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 ${
                          file.sourceType === "crawler" 
                            ? "bg-sky-50 text-sky-600" 
                            : file.sourceType === "creation" 
                              ? "bg-pink-50 text-pink-600" 
                              : "bg-amber-50 text-amber-600"
                        }`}>
                          {file.sourceType === "crawler" && <Globe className="w-2.5 h-2.5" />}
                          {file.sourceType === "creation" && <PenTool className="w-2.5 h-2.5" />}
                          {file.sourceType === "manual" && <FileText className="w-2.5 h-2.5" />}
                          {file.sourceType === "crawler" && "采集稿"}
                          {file.sourceType === "creation" && "智创文"}
                          {file.sourceType === "manual" && "手写稿"}
                        </span>
                        
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title & Preview Content */}
                      <h4 className="font-bold text-slate-800 text-xs md:text-sm line-clamp-1 group-hover:text-indigo-600 transition tracking-tight">
                        {file.title || "未命名文档"}
                      </h4>
                      
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {file.content ? file.content.replace(/[#*`>_\-]/g, "") : "暂无摘要内容..."}
                      </p>
                    </div>

                    {/* Footer icons / actions on card bottom */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold shrink-0">
                      <span className="truncate font-mono mr-2" title={`所属文件夹: ${folderName}`}>
                        📁 {folderName}
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded-md text-[9px] shrink-0 font-bold ${
                        file.isArchived 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {file.isArchived ? "已归档KB" : "未归档"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT PREVIEW SHEET: FILE VIEWER, EDITOR, AND ARCHIVER */}
      {selectedFile && (
        <div className="w-full md:w-[50%] border-l border-slate-150 flex flex-col bg-slate-50/70" id="file-editor-viewer">
          {/* Viewer Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                selectedFile.sourceType === "crawler" 
                  ? "bg-sky-100 text-sky-700" 
                  : selectedFile.sourceType === "creation" 
                    ? "bg-pink-100 text-pink-700" 
                    : "bg-amber-100 text-amber-700"
              }`}>
                {selectedFile.sourceType === "crawler" && "采集稿"}
                {selectedFile.sourceType === "creation" && "智能创作成文"}
                {selectedFile.sourceType === "manual" && "独立创作手记"}
              </span>
              <span className="text-[10px] text-slate-400">
                创建于 {new Date(selectedFile.createdAt).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {isReadOnly ? (
                <button
                  onClick={() => startEditFile(selectedFile)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                  title="编辑文章标题与正文"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleUpdateFile}
                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                  title="保存正文修改"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleDeleteFile(selectedFile.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="删除此档案"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                title="关闭预览面板"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick folder move, KB archiver tools */}
          <div className="p-3 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0 text-xs">
            {/* Quick Move Folder */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">归属文件夹:</span>
              <select
                value={selectedFile.folderId || "root"}
                onChange={(e) => handleMoveFile(selectedFile.id, e.target.value)}
                className="flex-1 py-1 px-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-600 bg-slate-50/50"
              >
                <option value="root">/ 根目录(无)</option>
                {folders.map(fd => (
                  <option key={fd.id} value={fd.id}>📁 {fd.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Link/Archive Knowledge Base */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">知识库归档:</span>
              <div className="flex-1 flex gap-1 items-center">
                <select
                  value={targetKbId}
                  onChange={(e) => setTargetKbId(e.target.value)}
                  className="flex-1 py-1 px-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-600 bg-slate-50/50 text-[11px]"
                >
                  {kbs.map(k => (
                    <option key={k.id} value={k.id}>📚 {k.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleArchiveFile(selectedFile.id)}
                  disabled={archivingId === selectedFile.id || kbs.length === 0}
                  className="px-2 py-1 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold gap-1 cursor-pointer hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed transition text-[11px] shrink-0"
                  title="将此成果材料直接存储写入指定知识库"
                >
                  {archivingId === selectedFile.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Archive className="w-3 h-3" />
                  )}
                  <span>归档</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reader Panel Viewport */}
          <div className="flex-1 overflow-y-auto p-5 bg-white md:p-6" id="selected-file-body">
            {isReadOnly ? (
              <article className="prose prose-slate max-w-none text-slate-800">
                <h1 className="text-sm md:text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 mb-4 tracking-tight leading-snug">
                  {selectedFile.title || "未命名文档"}
                </h1>
                
                {/* Meta details if available */}
                {selectedFile.sourceId && (
                  <div className="bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono space-y-1 mb-5">
                    <p className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-400 uppercase">源任务ID:</span>
                      <span className="truncate">{selectedFile.sourceId}</span>
                    </p>
                    {selectedFile.isArchived && selectedFile.archivedKbId && (
                        <p className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-400 uppercase">靶知识库:</span>
                          <span className="text-emerald-600 font-bold">
                            KB ID: {selectedFile.archivedKbId} (已成功入库保护库)
                          </span>
                        </p>
                    )}
                  </div>
                )}

                <div className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedFile.content || "内容正在初始化中..."}
                </div>
              </article>
            ) : (
              <div className="space-y-4 h-full flex flex-col min-h-0">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    文档主题
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    正文文稿内容
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none font-mono leading-relaxed"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateFile}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    保存修改
                  </button>
                  <button
                    onClick={() => setIsReadOnly(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODALS */}
      {/* Creation folder modal */}
      {isFolderModelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-100 shadow-xl" id="modal-folder-create">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-500" />
                新建自定义文件夹
              </h3>
              <button 
                onClick={() => setIsFolderModelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5">
                  文件夹名称
                </label>
                <input
                  type="text"
                  placeholder="例如: 硬科幻设定篇 / 产品参考"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModelOpen(false)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-bold transition"
                >
                  关闭
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation file manual modal */}
      {isFileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 border border-slate-100 shadow-xl flex flex-col max-h-[85vh]" id="modal-file-create">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 shrink-0">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                新建空间文本资料
              </h3>
              <button 
                onClick={() => setIsFileModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="shrink-0">
                <label className="block text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5">
                  目标文件夹
                </label>
                <select
                  value={newFileFolderId}
                  onChange={(e) => setNewFileFolderId(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-600 bg-slate-50/50 text-xs"
                >
                  <option value="">/ 空间根目录(无)</option>
                  {folders.map(fd => (
                    <option key={fd.id} value={fd.id}>📁 {fd.name}</option>
                  ))}
                </select>
              </div>

              <div className="shrink-0">
                <label className="block text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5">
                  文档标题名称
                </label>
                <input
                  type="text"
                  placeholder="例如: 智能系统安全协议 v2.0"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5">
                  正文资料内容 (支持 Markdown)
                </label>
                <textarea
                  placeholder="在此写入、粘贴或总结空间内生成的临时信息..."
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  className="flex-1 w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFileModalOpen(false)}
                  className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-bold transition"
                >
                  关闭
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  一键创建入档
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
