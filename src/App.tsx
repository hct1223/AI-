import React, { useState, useEffect } from "react";
import { MessageSquare, BookOpen, Globe, BrainCircuit, PenTool, Trash2, Plus, Sparkles, Terminal, LogOut, CheckCircle, Database, LayoutGrid, Layers, X, Settings, ShieldAlert, Lock, Sliders, Folder } from "lucide-react";
import { Chat, KnowledgeBase, Document, CollectionTask, Persona, PersonaTask, CreationTask, TaskSpace } from "./types";
import ChatPanel from "./components/ChatPanel";
import KnowledgeBasePanel from "./components/KnowledgeBasePanel";
import ScraperPanel from "./components/ScraperPanel";
import PersonaPanel from "./components/PersonaPanel";
import CreationPanel from "./components/CreationPanel";
import AllTasksPanel from "./components/AllTasksPanel";
import SpaceFoldersPanel from "./components/SpaceFoldersPanel";

type Tab = 'chat' | 'knowledge_base' | 'task_space';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isChatTyping, setIsChatTyping] = useState(false);

  // KB States
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [kbDocuments, setKbDocuments] = useState<Document[]>([]);

  // Task Space States
  const [spaces, setSpaces] = useState<TaskSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("space-1");
  const [isNewSpaceModalOpen, setIsNewSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDesc, setNewSpaceDesc] = useState("");
  const [spaceSubTab, setSpaceSubTab] = useState<'all' | 'folders'>('all');
  const [isUnifiedCreateOpen, setIsUnifiedCreateOpen] = useState(false);

  // Space Settings States
  const [isSpaceSettingsModalOpen, setIsSpaceSettingsModalOpen] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsAllowScraping, setSettingsAllowScraping] = useState(true);
  const [settingsAllowPersona, setSettingsAllowPersona] = useState(true);
  const [settingsAllowCreation, setSettingsAllowCreation] = useState(true);
  const [settingsAllowDeletion, setSettingsAllowDeletion] = useState(true);
  const [settingsRoleRequired, setSettingsRoleRequired] = useState<'creator' | 'admin' | 'member'>('member');
  const [settingsVisibility, setSettingsVisibility] = useState<'isolated' | 'shared' | 'restricted'>('isolated');
  const [settingsClassification, setSettingsClassification] = useState<'public' | 'internal' | 'confidential'>('internal');
  const [settingsAllowedKBs, setSettingsAllowedKBs] = useState<'all' | 'associated' | 'none'>('all');

  // Task & Creation State
  const [scraperTasks, setScraperTasks] = useState<CollectionTask[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaTasks, setPersonaTasks] = useState<PersonaTask[]>([]);
  const [creationTasks, setCreationTasks] = useState<CreationTask[]>([]);


  // Fetch initial data
  useEffect(() => {
    fetchChats();
    fetchKBs();
    fetchSpaces();
    fetchScraperTasks();
    fetchPersonas();
    fetchPersonaTasks();
    fetchCreationTasks();
  }, []);

  // Set up polling for background task updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchScraperTasks();
      fetchPersonaTasks();
      fetchCreationTasks();
      fetchPersonas(); // Persona list might populate when a task finishes
      fetchKBs();      // Document counts can update when scraper finishes
      fetchSpaces();   // Space list sync (e.g. if updated elsewhere or counts change)
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Dynamically load KB documents when active KB switches
  useEffect(() => {
    if (selectedKBId) {
      fetchKBDocuments(selectedKBId);
    } else {
      setKbDocuments([]);
    }
  }, [selectedKBId]);

  // ==========================================
  // Data Fetching Functions
  // ==========================================

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Expected JSON response, but received "${contentType || 'unknown'}"`);
    }
    return res.json();
  };

  const fetchChats = async () => {
    try {
      const data = await safeFetchJson("/api/chats");
      if (Array.isArray(data)) {
        setChats(data);
        if (data.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching chats", e);
    }
  };

  const fetchKBs = async () => {
    try {
      const data = await safeFetchJson("/api/kb");
      if (Array.isArray(data)) {
        setKbs(data);
        if (data.length > 0 && !selectedKBId) {
          setSelectedKBId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching KBs", e);
    }
  };

  const fetchKBDocuments = async (kbId: string) => {
    try {
      const data = await safeFetchJson(`/api/kb/${kbId}/documents`);
      if (Array.isArray(data)) {
        setKbDocuments(data);
      }
    } catch (e) {
      console.error("Error fetching documents for KB", kbId, e);
    }
  };

  const fetchScraperTasks = async () => {
    try {
      const data = await safeFetchJson("/api/collect/tasks");
      if (Array.isArray(data)) {
        setScraperTasks(data);
      }
    } catch (e) {
      console.error("Error fetching scraper tasks", e);
    }
  };

  const fetchPersonas = async () => {
    try {
      const data = await safeFetchJson("/api/personas");
      if (Array.isArray(data)) {
        setPersonas(data);
      }
    } catch (e) {
      console.error("Error fetching personas", e);
    }
  };

  const fetchPersonaTasks = async () => {
    try {
      const data = await safeFetchJson("/api/personas/tasks");
      if (Array.isArray(data)) {
        setPersonaTasks(data);
      }
    } catch (e) {
      console.error("Error fetching persona tasks", e);
    }
  };

  const fetchCreationTasks = async () => {
    try {
      const data = await safeFetchJson("/api/creation/tasks");
      if (Array.isArray(data)) {
        setCreationTasks(data);
      }
    } catch (e) {
      console.error("Error fetching creation tasks", e);
    }
  };

  const fetchSpaces = async () => {
    try {
      const data = await safeFetchJson("/api/spaces");
      if (Array.isArray(data)) {
        setSpaces(data);
      }
    } catch (e) {
      console.error("Error fetching spaces", e);
    }
  };

  const handleCreateSpace = async (name: string, description: string) => {
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      });
      const newSpace = await res.json();
      setSpaces((prev) => [newSpace, ...prev]);
      setSelectedSpaceId(newSpace.id);
      setIsNewSpaceModalOpen(false);
      setNewSpaceName("");
      setNewSpaceDesc("");
    } catch (e) {
      console.error("Error creating space", e);
    }
  };

  const handleDeleteSpace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除该工作空间吗？删除后空间内所有的采集、萃取及创作任务也将一同清空。")) {
      return;
    }
    try {
      await fetch(`/api/spaces/${id}`, { method: "DELETE" });
      setSpaces((prev) => prev.filter(s => s.id !== id));
      if (selectedSpaceId === id) {
        setSelectedSpaceId("space-1");
      }
      // Re-fetch tasks since they were cascade deleted
      fetchScraperTasks();
      fetchPersonaTasks();
      fetchCreationTasks();
    } catch (e) {
      console.error("Error deleting space", e);
    }
  };

  const handleUpdateSpace = async (id: string, updatedParams: Partial<TaskSpace>) => {
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedParams)
      });
      if (res.ok) {
        const updatedSpace = await res.json();
        setSpaces((prev) => prev.map(s => s.id === id ? { ...s, ...updatedSpace } : s));
      } else {
        const err = await res.json();
        alert(err.error || "更新工作空间失败");
      }
    } catch (e) {
      console.error("Error updating space", e);
    }
  };

  const openSpaceSettings = (space: TaskSpace) => {
    setSettingsName(space.name);
    setSettingsDesc(space.description);
    setSettingsAllowScraping(space.operationPermission?.allowScraping ?? true);
    setSettingsAllowPersona(space.operationPermission?.allowPersonaExtraction ?? true);
    setSettingsAllowCreation(space.operationPermission?.allowContentCreation ?? true);
    setSettingsAllowDeletion(space.operationPermission?.allowDeletion ?? true);
    setSettingsRoleRequired(space.operationPermission?.roleRequired ?? 'member');
    setSettingsVisibility(space.dataPermission?.visibility ?? 'isolated');
    setSettingsClassification(space.dataPermission?.dataClassification ?? 'internal');
    setSettingsAllowedKBs(space.dataPermission?.allowedKBs ?? 'all');
    setIsSpaceSettingsModalOpen(true);
  };

  const handleSaveSpaceSettings = async () => {
    const updatedParams: Partial<TaskSpace> = {
      name: settingsName,
      description: settingsDesc,
      operationPermission: {
        allowScraping: settingsAllowScraping,
        allowPersonaExtraction: settingsAllowPersona,
        allowContentCreation: settingsAllowCreation,
        allowDeletion: settingsAllowDeletion,
        roleRequired: settingsRoleRequired
      },
      dataPermission: {
        visibility: settingsVisibility,
        dataClassification: settingsClassification,
        allowedKBs: settingsAllowedKBs
      }
    };
    
    await handleUpdateSpace(selectedSpaceId, updatedParams);
    setIsSpaceSettingsModalOpen(false);
  };

  // ==========================================
  // Action Handlers
  // ==========================================

  // Chat Actions
  const handleStartNewChat = async () => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "新建对话" })
      });
      const newChat = await res.json();
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setActiveTab('chat');
    } catch (e) {
      console.error("Error starting new chat", e);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${id}`, { method: "DELETE" });
      setChats((prev) => prev.filter(c => c.id !== id));
      if (activeChatId === id) {
        setActiveChatId(null);
      }
    } catch (e) {
      console.error("Error deleting chat", e);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChatId) return;
    setIsChatTyping(true);

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const updatedChat = await res.json();
      setChats((prev) => prev.map(c => c.id === updatedChat.id ? updatedChat : c));
    } catch (e) {
      console.error("Error sending message", e);
    } finally {
      setIsChatTyping(false);
    }
  };

  // KB Actions
  const handleCreateKB = async (name: string, description: string) => {
    try {
      const res = await fetch("/api/kb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
      });
      const newKB = await res.json();
      setKbs((prev) => [newKB, ...prev]);
      setSelectedKBId(newKB.id);
    } catch (e) {
      console.error("Error creating KB", e);
    }
  };

  const handleDeleteKB = async (id: string) => {
    try {
      await fetch(`/api/kb/${id}`, { method: "DELETE" });
      setKbs((prev) => prev.filter(kb => kb.id !== id));
      setSelectedKBId(null);
    } catch (e) {
      console.error("Error deleting KB", e);
    }
  };

  const handleImportDocument = async (kbId: string, title: string, content: string) => {
    try {
      const res = await fetch(`/api/kb/${kbId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      const newDoc = await res.json();
      setKbDocuments((prev) => [newDoc, ...prev]);
      // Update local doc counts
      setKbs((prev) => prev.map(kb => kb.id === kbId ? { ...kb, documentsCount: (kb.documentsCount || 0) + 1 } : kb));
    } catch (e) {
      console.error("Error importing document", e);
    }
  };

  // Scraper Actions
  const handleCreateScraperTask = async (name: string, url: string, prompt: string, kbId: string) => {
    const activeSpace = spaces.find(s => s.id === selectedSpaceId);
    if (activeSpace && activeSpace.operationPermission && !activeSpace.operationPermission.allowScraping) {
      alert("当前工作空间禁用了【数据采集及爬取】功能。请先通过空间右上角[空间设置]进行开启！");
      return;
    }
    try {
      const res = await fetch("/api/collect/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, prompt, kbId, spaceId: selectedSpaceId })
      });
      const newTask = await res.json();
      setScraperTasks((prev) => [newTask, ...prev]);
    } catch (e) {
      console.error("Error creating scraper task", e);
    }
  };

  const handleCancelScraperTask = async (taskId: string) => {
    try {
      await fetch(`/api/collect/tasks/${taskId}/cancel`, { method: "POST" });
      setScraperTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
    } catch (e) {
      console.error("Error cancelling scraper task", e);
    }
  };

  const handleRetryScraperTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/collect/tasks/${taskId}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.task) {
        setScraperTasks((prev) => prev.map(t => t.id === taskId ? data.task : t));
      }
    } catch (e) {
      console.error("Error retrying scraper task", e);
    }
  };

  const handleDeleteScraperTask = async (taskId: string) => {
    const activeSpace = spaces.find(s => s.id === selectedSpaceId);
    if (activeSpace && activeSpace.operationPermission && !activeSpace.operationPermission.allowDeletion) {
      alert("当前工作空间已禁用【删除动作】。请先通过空间右上角[空间设置]进行开启！");
      return;
    }
    try {
      await fetch(`/api/collect/tasks/${taskId}`, { method: "DELETE" });
      setScraperTasks((prev) => prev.filter(t => t.id !== taskId));
    } catch (e) {
      console.error("Error deleting scraper task", e);
    }
  };

  // Persona Actions
  const handleCreatePersonaTask = async (name: string, kbIds: string[]) => {
    const activeSpace = spaces.find(s => s.id === selectedSpaceId);
    if (activeSpace && activeSpace.operationPermission && !activeSpace.operationPermission.allowPersonaExtraction) {
      alert("当前工作空间禁用了【人格特征萃取】功能。请先通过空间右上角[空间设置]进行开启！");
      return;
    }
    try {
      const res = await fetch("/api/personas/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, kbIds, spaceId: selectedSpaceId })
      });
      const newTask = await res.json();
      setPersonaTasks((prev) => [newTask, ...prev]);
    } catch (e) {
      console.error("Error creating persona task", e);
    }
  };

  // Content Creation Actions
  const handleCreateCreationTask = async (params: {
    type: 'topic' | 'direct';
    theme: string;
    kbDocIds: string[];
    personaId?: string;
    useWebSearch: boolean;
  }) => {
    const activeSpace = spaces.find(s => s.id === selectedSpaceId);
    if (activeSpace && activeSpace.operationPermission && !activeSpace.operationPermission.allowContentCreation) {
      alert("当前工作空间禁用了【智能内容创作】功能。请先通过空间右上角[空间设置]进行开启！");
      return;
    }
    try {
      const res = await fetch("/api/creation/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, spaceId: selectedSpaceId })
      });
      const newTask = await res.json();
      setCreationTasks((prev) => [newTask, ...prev]);
    } catch (e) {
      console.error("Error creating creation task", e);
    }
  };

  const handleCancelCreationTask = async (taskId: string) => {
    try {
      await fetch(`/api/creation/tasks/${taskId}/cancel`, { method: "POST" });
      setCreationTasks((prev) => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t));
    } catch (e) {
      console.error("Error cancelling creation task", e);
    }
  };

  const handleRetryCreationTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/creation/tasks/${taskId}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.task) {
        setCreationTasks((prev) => prev.map(t => t.id === taskId ? data.task : t));
      }
    } catch (e) {
      console.error("Error retrying creation task", e);
    }
  };

  const handleDeleteCreationTask = async (taskId: string) => {
    const activeSpace = spaces.find(s => s.id === selectedSpaceId);
    if (activeSpace && activeSpace.operationPermission && !activeSpace.operationPermission.allowDeletion) {
      alert("当前工作空间已禁用【删除动作】。请先通过空间右上角[空间设置]进行开启！");
      return;
    }
    try {
      await fetch(`/api/creation/tasks/${taskId}`, { method: "DELETE" });
      setCreationTasks((prev) => prev.filter(t => t.id !== taskId));
    } catch (e) {
      console.error("Error deleting creation task", e);
    }
  };

  const handleSelectTopic = async (taskId: string, topic: string) => {
    try {
      const res = await fetch(`/api/creation/tasks/${taskId}/select-topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      const updatedTask = await res.json();
      setCreationTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    } catch (e) {
      console.error("Error selecting topic", e);
    }
  };

  const handleArchiveDocument = async (taskId: string, kbId: string) => {
    try {
      await fetch(`/api/creation/tasks/${taskId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kbId })
      });
      // Refresh KB state and Docs
      fetchKBs();
      if (selectedKBId === kbId) {
        fetchKBDocuments(kbId);
      }
    } catch (e) {
      console.error("Error archiving doc", e);
    }
  };


  // Helpers
  const activeChat = chats.find(c => c.id === activeChatId) || null;
  
  // Aggregate all docs across KBs for easy select in creations config
  const [allDocEntities, setAllDocEntities] = useState<Document[]>([]);
  useEffect(() => {
    const fetchAllDocs = async () => {
      try {
        const docPromises = kbs.map(async (k) => {
          const res = await fetch(`/api/kb/${k.id}/documents`);
          return res.json();
        });
        const docsArrays = await Promise.all(docPromises);
        setAllDocEntities(docsArrays.flat());
      } catch (e) {
        // quiet safety
      }
    };
    if (kbs.length > 0) {
      fetchAllDocs();
    }
  }, [kbs, kbDocuments]);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 antialiased overflow-hidden" id="workspace-layout">      {/* PERSISTENT LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-950 text-slate-350 flex flex-col justify-between shrink-0 border-r border-slate-900 h-screen select-none" id="sidebar-layout">
        
        {/* UPPER SEGMENT: Navigation & Controls */}
        <div className="flex flex-col flex-1 min-h-0 pt-6 px-4" id="sidebar-upper-panel">
          
          {/* Main system header */}
          <div className="flex items-center gap-3 px-2.5 mb-7" id="sidebar-brand-header">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-950/50 shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-50 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-white text-[13px] md:text-sm tracking-tight leading-none uppercase truncate">AI 智能创作系统</h1>
              <span className="text-[9px] text-indigo-400 font-mono block mt-1.5 tracking-widest font-bold">CREATOR MATRIX v3.5</span>
            </div>
          </div>

          {/* New Chat Top button */}
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-indigo-600 hover:border-indigo-500/50 text-slate-200 hover:text-white font-semibold text-xs rounded-xl shadow-md border border-slate-800 transition-all duration-300 transform active:scale-98 shrink-0 mb-6"
            id="new-chat-sidebar-btn"
          >
            <Plus className="w-4.5 h-4.5 text-indigo-405 shrink-0" />
            新建 AI 探索对话
          </button>

          {/* Section Indicator */}
          <div className="px-3 mb-2.5 flex items-center justify-between" id="menu-sections-label">
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase font-mono">系统基础模块</span>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1.5 p-0.5" id="sidebar-tab-menu">
            <button
              onClick={() => setActiveTab('chat')}
              className={`group relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs transition-all duration-200 font-medium ${
                activeTab === 'chat'
                  ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-800/40'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              {activeTab === 'chat' && (
                <span className="absolute left-0 w-1 h-5/6 bg-indigo-500 rounded-r-full" />
              )}
              <MessageSquare className={`w-4 h-4 shrink-0 transition-all duration-300 ${activeTab === 'chat' ? 'text-indigo-400 scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'text-slate-500 group-hover:text-slate-350'}`} />
              <span>AI 探索对话</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge_base')}
              className={`group relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs transition-all duration-200 font-medium ${
                activeTab === 'knowledge_base'
                  ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-800/40'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              {activeTab === 'knowledge_base' && (
                <span className="absolute left-0 w-1 h-5/6 bg-amber-500 rounded-r-full" />
              )}
              <BookOpen className={`w-4 h-4 shrink-0 transition-all duration-300 ${activeTab === 'knowledge_base' ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'text-slate-500 group-hover:text-slate-350'}`} />
              <span>知识库管理</span>
            </button>

            <button
              onClick={() => setActiveTab('task_space')}
              className={`group relative w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left text-xs transition-all duration-200 font-medium ${
                activeTab === 'task_space'
                  ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-800/40'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
              }`}
            >
              {activeTab === 'task_space' && (
                <span className="absolute left-0 w-1 h-5/6 bg-indigo-500 rounded-r-full" />
              )}
              <LayoutGrid className={`w-4 h-4 shrink-0 transition-all duration-300 ${activeTab === 'task_space' ? 'text-indigo-400 scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'text-slate-500 group-hover:text-slate-350'}`} />
              <span>工作空间</span>
            </button>
          </div>
        </div>

        {/* LOWER SEGMENT: Historical Chats */}
        <div className="px-4 py-5 border-t border-slate-905 flex flex-col min-h-0 shrink" id="sidebar-lower-panel">
          <div className="flex items-center justify-between mb-2.5 px-1 shrink-0" id="history-chats-label">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">历史探索会话</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded-md font-mono border border-slate-800">{chats.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin max-h-56 pr-1" id="history-chats-scroll">
            {chats.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic px-2 py-4">无历史缓存记录</p>
            ) : (
              chats.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setActiveTab('chat');
                    }}
                    className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-[11px] font-medium cursor-pointer transition select-none ${
                      isActive && activeTab === 'chat'
                        ? 'bg-indigo-950/40 text-indigo-200 border border-indigo-900/40 shadow-sm'
                        : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                      <span className="truncate leading-tight">{chat.title}</span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="p-1 text-slate-600 hover:text-rose-450 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition shrink-0"
                      title="删除会话"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Infrastructure status lines */}
          <div className="pt-4 border-t border-slate-900 text-slate-600 mt-4 shrink-0 font-mono text-center flex flex-col gap-2">
            <div className="text-[9px] py-1.5 bg-slate-900/50 border border-slate-850 rounded-lg flex items-center justify-center gap-1.5 leading-none">
              <Database className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="text-slate-400">LOCAL MEMORY PERSISTED</span>
            </div>
          </div>
        </div>

      </aside>

      {/* CENTRAL DISPLAY INTERACTION CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0" id="main-display-panel">
        <header className="bg-white border-b border-slate-100 py-3.5 px-8 flex items-center justify-between shadow-sm shrink-0" id="dashboard-global-header">
          <div className="flex items-center gap-3">
            <span className="uppercase text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded font-bold font-mono tracking-wider">工作台</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700 capitalize">
              {activeTab === 'chat' && "AI 探索双向交互会话"}
              {activeTab === 'knowledge_base' && "创作智囊知识库及文献管理"}
              {activeTab === 'task_space' && "多维工作空间"}
            </span>
          </div>

          {/* Sandbox metrics info */}
          <div className="flex items-center gap-4 text-slate-400 text-[10px] font-mono" id="header-telemetry">
            <span>系统状态: <span className="text-emerald-500 font-bold font-mono text-[9px]">● RUNNING</span></span>
            <span className="text-slate-200">|</span>
            <span>API层: <span className="text-indigo-500 font-bold">@google/genai</span></span>
          </div>
        </header>

        {/* Tab content renders */}
        <div className="flex-1 p-6 overflow-hidden min-h-0 bg-slate-50" id="tab-panel-graft">
          {activeTab === 'chat' && (
            <ChatPanel
              activeChat={activeChat}
              onSendMessage={handleSendMessage}
              isTyping={isChatTyping}
              onStartNewChat={handleStartNewChat}
            />
          )}

          {activeTab === 'knowledge_base' && (
            <KnowledgeBasePanel
              kbs={kbs}
              onCreateKB={handleCreateKB}
              onDeleteKB={handleDeleteKB}
              selectedKBId={selectedKBId}
              onSelectKB={setSelectedKBId}
              kbDocuments={kbDocuments}
              onImportDocument={handleImportDocument}
            />
          )}

          {activeTab === 'task_space' && (
            <div className="flex h-full min-h-0 overflow-hidden bg-slate-50 gap-6" id="workspaces-root-container">
              {/* Inner Left: Workspaces Sidebar */}
              <div className="w-72 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col p-4 shrink-0 h-full overflow-hidden" id="workspace-spaces-sidebar">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100" id="spaces-sidebar-header">
                  <h4 className="text-xs font-bold text-slate-800 tracking-wider">主创工作空间 ({spaces.length})</h4>
                  <button
                    onClick={() => setIsNewSpaceModalOpen(true)}
                    className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                    title="新建工作空间"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1" id="spaces-list-scroller">
                  {spaces.map((s) => {
                    const isSelected = selectedSpaceId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSpaceId(s.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition relative group select-none ${
                          isSelected
                            ? "bg-indigo-50/20 border-indigo-200 ring-1 ring-indigo-50/20 shadow-sm"
                            : "bg-white border-slate-150/80 hover:bg-slate-50/70"
                        }`}
                      >
                        <h5 className={`text-xs font-bold truncate ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
                          {s.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 select-none leading-relaxed">
                          {s.description || "暂无描述信息"}
                        </p>
                        
                        {/* Delete custom spaces */}
                        {!["space-1", "space-2"].includes(s.id) && (
                          <button
                            onClick={(e) => handleDeleteSpace(s.id, e)}
                            className="absolute right-2 top-2 p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                            title="删除此空间"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Tiny workspace helper card */}
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl" id="space-sidebar-tip">
                  <p className="text-[10px] text-slate-500 font-normal leading-relaxed text-left flex items-start gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>每个空间均为独立创意沙盒。空间内的<b>数据采集</b>、<b>人格特征萃取</b>与<b>智能内容创作</b>为三类平行的独立任务，并无先后依赖关系，均由您按需求独立创建和执行。</span>
                  </p>
                </div>
              </div>

              {/* Inner Right: Current Space Workflow Content */}
              <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden" id="workspace-details-canvas">
                {(() => {
                  const activeSpace = spaces.find(s => s.id === selectedSpaceId) || spaces[0] || { id: "space-1", name: "科幻世界宇宙观构建", description: "本空间致力于萃取庄严冷峻的硬科幻文风，采集前沿物理与社会学基础，撰写宏大的星系纪元史诗。" };
                  return (
                    <div className="flex flex-col h-full min-h-0" id="space-flow-sub-layout">
                      {/* Space Header info cards */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0" id="space-meta-banner">
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-left space-y-1">
                            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <Database className="w-4 h-4 text-indigo-600" />
                              空间: {activeSpace.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-normal leading-relaxed max-w-4xl">
                              {activeSpace.description}
                            </p>
                            
                            {/* Permission summary badges */}
                            <div className="flex flex-wrap gap-1.5 mt-2" id="space-permission-badges">
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                                操作角色限: {activeSpace.operationPermission?.roleRequired === 'creator' ? '仅所有者' : activeSpace.operationPermission?.roleRequired === 'admin' ? '管理员' : '所有成员'}
                              </span>
                              <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded border ${
                                activeSpace.dataPermission?.dataClassification === 'confidential'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200/60'
                                  : activeSpace.dataPermission?.dataClassification === 'internal'
                                  ? 'bg-amber-50 text-amber-600 border-amber-200/80'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200/80'
                              }`}>
                                <Lock className="w-2.5 h-2.5 shrink-0" />
                                密级: {activeSpace.dataPermission?.dataClassification === 'confidential' ? '核心机密' : activeSpace.dataPermission?.dataClassification === 'internal' ? '内部专用' : '公开星标'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200/80">
                                数据范围: {activeSpace.dataPermission?.visibility === 'isolated' ? '沙箱完全隔离' : activeSpace.dataPermission?.visibility === 'shared' ? '跨空间只读' : '跨空间完全互通'}
                              </span>
                              {activeSpace.operationPermission?.allowScraping === false && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/80">
                                  <ShieldAlert className="w-2.5 h-2.5 text-rose-500" />
                                  数据采集限制中
                                </span>
                              )}
                              {activeSpace.operationPermission?.allowPersonaExtraction === false && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/80">
                                  <ShieldAlert className="w-2.5 h-2.5 text-rose-500" />
                                  人格萃取限制中
                                </span>
                              )}
                              {activeSpace.operationPermission?.allowContentCreation === false && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/80">
                                  <ShieldAlert className="w-2.5 h-2.5 text-rose-500" />
                                  文案创作限制中
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openSpaceSettings(activeSpace)}
                              className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg px-2.5 py-1.5 transition shadow-sm bg-white cursor-pointer"
                              title="空间设置"
                            >
                              <Settings className="w-3.5 h-3.5 text-slate-400" />
                              <span>空间设置</span>
                            </button>
                            
                            <div className="text-amber-600 bg-amber-50 border border-amber-200/80 text-[10px] font-bold px-2 py-1.5 rounded-lg select-none">
                              🔥 独立沙箱隔离
                            </div>
                          </div>
                        </div>

                        {/* Sub-tabs horizontal nav: Multi-task selection tabs */}
                        <div className="flex items-center gap-2 mt-5 border-t border-slate-100 pt-4" id="space-subtabs-nav">
                          <button
                            onClick={() => setSpaceSubTab('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                              spaceSubTab === 'all'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'hover:bg-slate-150/40 text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <LayoutGrid className={`w-3.5 h-3.5 ${spaceSubTab === 'all' ? 'text-indigo-400' : 'text-slate-400'}`} />
                            全部任务
                          </button>

                          <button
                            onClick={() => setSpaceSubTab('folders')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                              spaceSubTab === 'folders'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'hover:bg-slate-150/40 text-slate-500 hover:text-slate-700'
                            }`}
                            id="tab-folders"
                          >
                            <Folder className={`w-3.5 h-3.5 ${spaceSubTab === 'folders' ? 'text-amber-400' : 'text-slate-400'}`} />
                            成果资料文件夹
                          </button>
                        </div>
                      </div>

                      {/* Render selected workflow sub-panel */}
                      <div className="flex-1 overflow-hidden min-h-0 relative" id="space-sub-panel-viewport">
                        {spaceSubTab === 'all' && (
                          <AllTasksPanel
                            scraperTasks={scraperTasks}
                            personaTasks={personaTasks}
                            creationTasks={creationTasks}
                            kbs={kbs}
                            personas={personas}
                            allDocs={allDocEntities}
                            selectedSpaceId={selectedSpaceId}
                            isCreateOpen={isUnifiedCreateOpen}
                            setIsCreateOpen={setIsUnifiedCreateOpen}
                            onCreateScraperTask={handleCreateScraperTask}
                            onCancelScraperTask={handleCancelScraperTask}
                            onRetryScraperTask={handleRetryScraperTask}
                            onDeleteScraperTask={handleDeleteScraperTask}
                            onCreatePersonaTask={handleCreatePersonaTask}
                            onCreateCreationTask={handleCreateCreationTask}
                            onCancelCreationTask={handleCancelCreationTask}
                            onRetryCreationTask={handleRetryCreationTask}
                            onDeleteCreationTask={handleDeleteCreationTask}
                            onSelectTopic={handleSelectTopic}
                            onArchiveDoc={handleArchiveDocument}
                          />
                        )}

                        {spaceSubTab === 'folders' && (
                          <SpaceFoldersPanel
                            selectedSpaceId={selectedSpaceId}
                            kbs={kbs}
                            onDocArchived={async () => {
                              await fetchKBs();
                              if (selectedKBId) {
                                await fetchKBDocuments(selectedKBId);
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal to create a new task space */}
      {isNewSpaceModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="new-space-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden" id="new-space-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-100 text-left">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-indigo-650" />
                创建专属工作空间
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5">
                建立独立的灵感及文案创作沙箱，整合你的采集、调性萃取和生成流水线。
              </p>
            </div>
            
            <div className="p-5 space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">工作空间名称 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="例如：量子前沿科普特刊、旅行爆款文案舱..."
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">功能空间描述</label>
                <textarea
                  placeholder="简述该写作空间的特定研究项目、参考资料库主题及预期创风格调..."
                  value={newSpaceDesc}
                  rows={3}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition resize-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setIsNewSpaceModalOpen(false);
                  setNewSpaceName("");
                  setNewSpaceDesc("");
                }}
                className="px-3 py-1.5 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition font-medium"
              >
                取消
              </button>
              <button
                onClick={() => handleCreateSpace(newSpaceName, newSpaceDesc)}
                disabled={!newSpaceName.trim()}
                className={`px-4 py-1.5 font-bold rounded-lg transition shadow-sm ${
                  newSpaceName.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-250 text-slate-400 cursor-not-allowed"
                }`}
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal to configure space settings & permissions */}
      {isSpaceSettingsModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} id="space-settings-modal-overlay">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden" id="space-settings-modal">
            <div className="p-4 bg-slate-50 border-b border-slate-100 text-left flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings className="w-4.5 h-4.5 text-indigo-655" />
                  工作空间权限配置与安全设置
                </h3>
                <p className="text-[10.5px] text-slate-450 mt-1">
                  细粒度管控【操作权限】及【数据权限】，确保多轨协作沙盒的数据隔离与合规。
                </p>
              </div>
              <button 
                onClick={() => setIsSpaceSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 md:space-y-6 space-y-4 max-h-[72vh] overflow-y-auto text-left" id="settings-model-body">
              {/* Part 1: Basic settings */}
              <div>
                <h4 className="text-[11.5px] font-bold text-slate-800 border-l-2 border-indigo-600 pl-2 mb-3">空间名片属性</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">工作空间名称 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">功能描述</label>
                    <textarea
                      value={settingsDesc}
                      rows={1}
                      onChange={(e) => setSettingsDesc(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 transition resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Operation Permissions */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11.5px] font-bold text-slate-800 border-l-2 border-indigo-600 pl-2 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    操作权限控制 (Operation Permissions)
                  </h4>
                  <span className="text-[9.5px] bg-indigo-50 text-indigo-650 font-bold px-1.5 py-0.5 rounded">
                    核心安全策略
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Toggles */}
                  <div className="space-y-3.5 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[11px] font-bold text-slate-700">启用数据爬取及采集</p>
                        <p className="text-[9.5px] text-slate-400">允许创建爬虫任务到知识库</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsAllowScraping}
                        onChange={(e) => setSettingsAllowScraping(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/70 pt-2.5">
                      <div className="text-left">
                        <p className="text-[11px] font-bold text-slate-700">启用多维语感/人格萃取</p>
                        <p className="text-[9.5px] text-slate-400">允许运行AI人格训练萃取任务</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsAllowPersona}
                        onChange={(e) => setSettingsAllowPersona(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/70 pt-2.5">
                      <div className="text-left">
                        <p className="text-[11px] font-bold text-slate-700">启用智能文案创作</p>
                        <p className="text-[9.5px] text-slate-400">启用Gemini新选题及文稿撰写</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsAllowCreation}
                        onChange={(e) => setSettingsAllowCreation(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/70 pt-2.5">
                      <div className="text-left">
                        <p className="text-[11px] font-bold text-slate-700">允许物理硬删除任务</p>
                        <p className="text-[9.5px] text-slate-400">允许清除已被彻底执行的任务</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsAllowDeletion}
                        onChange={(e) => setSettingsAllowDeletion(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-305 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Operational Role levels */}
                  <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 text-left space-y-3.5">
                    <div>
                      <label className="block text-[11.5px] font-bold text-slate-600 mb-1.5">
                        执行操作最低角色要求 (Level)
                      </label>
                      <select
                        value={settingsRoleRequired}
                        onChange={(e: any) => setSettingsRoleRequired(e.target.value)}
                        className="w-full bg-white text-xs px-2.5 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="member">所有协同空间成员 (All Members)</option>
                        <option value="admin">仅空间管理员及以上 (Admins & Owners)</option>
                        <option value="creator">仅空间所有者/创建人 (Creator Only)</option>
                      </select>
                      <p className="text-[9.5px] text-slate-450 mt-1.5 leading-relaxed">
                        限制空间除创建者外，其他普通协同成员的操作修改阈值。
                      </p>
                    </div>

                    <div className="bg-amber-50/40 p-2.5 border border-amber-100 rounded-lg text-amber-805 text-[10px] leading-relaxed">
                      💡 <b>操作锁定提示：</b>若在左侧禁用特定操作，则不论角色级别，所有成员皆无法在该空间内执行对应任务。
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 3: Data Security and Isolation */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-[11.5px] font-bold text-slate-800 border-l-2 border-indigo-600 pl-2 mb-3 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  数据权限与隔离沙箱强度 (Data Permissions & Security)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Visibility */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      数据隔离能级 (Sandbox Isolation)
                    </label>
                    <select
                      value={settingsVisibility}
                      onChange={(e: any) => setSettingsVisibility(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-2.5 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="isolated">物理完全隔离 (Isolated Sandbox)</option>
                      <option value="shared">跨空间只读参考 (Shared Read-Only)</option>
                      <option value="restricted">机密完全对通 (Inter-Restricted)</option>
                    </select>
                    <p className="text-[9.5px] text-slate-450 mt-1 leading-relaxed">
                      完全隔离能确保任务和结果文件不发生跨空间参考混杂。
                    </p>
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      最高数据保密级别 (Confidentiality)
                    </label>
                    <select
                      value={settingsClassification}
                      onChange={(e: any) => setSettingsClassification(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-2.5 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="public">公开星标级 (L1 Public Disclosure)</option>
                      <option value="internal">内部专享级 (L2 Corporate Internal)</option>
                      <option value="confidential">核心机密级 (L3 Strictly Confidential)</option>
                    </select>
                    <p className="text-[9.5px] text-slate-450 mt-1 leading-relaxed">
                      针对该创作空间设定打上保密星标戳记，触发高级安全合规机制。
                    </p>
                  </div>

                  {/* KB scopes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      知识文献参考边界 (KB Scope)
                    </label>
                    <select
                      value={settingsAllowedKBs}
                      onChange={(e: any) => setSettingsAllowedKBs(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs px-2.5 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="all">共享全部知识库 (All System KBs)</option>
                      <option value="associated">仅本空间受托知识库 (Self KBs Only)</option>
                      <option value="none">禁止引入外部库 (No External reference)</option>
                    </select>
                    <p className="text-[9.5px] text-slate-450 mt-1 leading-relaxed">
                      禁止引入后，AI撰笔任务将无法选取后台知识文献做上下文检索引导。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setIsSpaceSettingsModalOpen(false)}
                className="px-3.5 py-2 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveSpaceSettings}
                disabled={!settingsName.trim()}
                className={`px-5 py-2 font-bold rounded-lg transition shadow-sm ${
                  settingsName.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    : "bg-slate-250 text-slate-400 cursor-not-allowed"
                }`}
              >
                保存空间设置
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
