import React, { useState, useRef, useEffect } from "react";
import { Send, Cpu, User, Sparkles, MessageSquare, AlertCircle } from "lucide-react";
import { Chat, Message } from "../types";

interface ChatPanelProps {
  activeChat: Chat | null;
  onSendMessage: (content: string) => Promise<void>;
  isTyping: boolean;
  onStartNewChat: () => void;
}

export default function ChatPanel({
  activeChat,
  onSendMessage,
  isTyping,
  onStartNewChat
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input);
    setInput("");
  };

  const handlePresetSelect = (text: string) => {
    setInput(text);
  };

  const promptPresets = [
    { title: "科幻设定推荐", text: "能帮我设计一个关于‘引力跃迁引擎’的硬科幻机械构造和运行前置设定吗？" },
    { title: "自媒体爆款爆点", text: "如何将‘低成本高转化AI助手’包装成让传统中小企业老板焦虑并买单的爆款标题？" },
    { title: "提炼知识大纲", text: "我应该如何从厚度达100页的商业白皮书里，提纯出具备传播力的核心思想骨架？" }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden" id="chat-panel-container">
      {/* Panel Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between" id="chat-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm md:text-base">
              {activeChat ? activeChat.title : "智能AI对话"}
            </h2>
            <p className="text-xs text-slate-400">
              {activeChat ? `${activeChat.messages.length} 条对话记录` : "利用大模型探讨无限可能"}
            </p>
          </div>
        </div>
        {!activeChat && (
          <button
            onClick={onStartNewChat}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
            id="chat-header-new-btn"
          >
            开启新对话
          </button>
        )}
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" id="chat-messages-scroll">
        {!activeChat ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12" id="chat-welcome-state">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 mb-6">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">欢迎来到创意探索工坊</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              这里是创意系统的心智内核。您可以随时向我输入灵感、大纲或难题。若要体验更佳的写作表现，可在关联的知识库和人格配置中做好准备，然后在内容创作面板开始成稿。
            </p>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 text-left" id="chat-presets-list">
              {promptPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetSelect(preset.text)}
                  className="p-4 bg-white hover:bg-indigo-50/50 hover:border-indigo-150 border border-slate-200/80 rounded-xl transition text-left group"
                >
                  <p className="font-medium text-xs text-indigo-600 mb-1 group-hover:text-indigo-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {preset.title}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    "{preset.text}"
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : activeChat.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto" id="chat-empty-messages">
            <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">新会话已开启</p>
            <p className="text-xs text-slate-400 mt-1">请输入您的第一个问题来激发AI脑风暴</p>
          </div>
        ) : (
          <div className="space-y-6" id="chat-message-list">
            {activeChat.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  id={`msg-bubble-${msg.id}`}
                >
                  <div className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 ${
                    isUser 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white border border-slate-200 text-indigo-600 shadow-sm'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUser 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-200/80 shadow-sm rounded-tl-none prose prose-slate max-w-none'
                    }`}>
                      {msg.content.split("\n").map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                      ))}
                    </div>
                    <p className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-4 max-w-xl mr-auto animate-pulse" id="chat-typing-bubble">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0 bg-white border border-slate-200 text-indigo-600 shadow-sm">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="px-4 py-3 bg-white text-slate-500 border border-slate-200/80 shadow-sm rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                    <span className="flex space-x-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                    <span className="text-xs text-slate-400 ml-1">AI 正在深度思考并撰写答复...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Message Form */}
      <div className="p-4 bg-white border-t border-slate-100" id="chat-input-area">
        {!activeChat ? (
          <div className="text-center py-2 text-xs text-slate-400" id="chat-disabled-hint">
            先在下方输入框中输入并发送，会自动帮您新建一个创作会话 🌟
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeChat ? "询问AI任意问题，可按 Enter 直捷发送..." : "输入想要探索的心得或指示，直接发送开始对话..."}
            className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm pr-12 transition outline-none"
            id="chat-text-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className={`absolute right-2 p-2 rounded-lg transition ${
              input.trim() && !isTyping
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-300 pointer-events-none'
            }`}
            id="chat-send-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 px-1" id="chat-bottom-meta">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-indigo-400" />
            基于 Gemini 大模型驱动 · 在离线仿真模式下亦可完美运行
          </span>
        </div>
      </div>
    </div>
  );
}
