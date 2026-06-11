'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatApi, Message, ConversationItem } from '../services/api';
import SpurLogo from '../components/SpurLogo';

// Simple, safe, and robust custom markdown parser for rendering bold text and bulleted lists
const parseMarkdown = (text: string) => {
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const parseInline = (str: string) => {
    let html = escapeHtml(str);
    // Replace **bold** with <strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace *italic* or _italic_ with <em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    // Replace `code` with <code>
    html = html.replace(/`(.*?)`/g, '<code class="bg-black/15 px-1 py-0.5 rounded text-xs font-mono font-semibold">$1</code>');
    return html;
  };

  const blocks = text.split('\n\n');

  return blocks.map((block, blockIdx) => {
    const lines = block.split('\n');
    const elements: React.ReactNode[] = [];
    
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const renderList = (list: typeof currentList, key: string) => {
      if (!list) return null;
      if (list.type === 'ul') {
        return (
          <ul key={key} className="list-disc pl-5 my-2 space-y-1">
            {list.items.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
            ))}
          </ul>
        );
      } else {
        return (
          <ol key={key} className="list-decimal pl-5 my-2 space-y-1">
            {list.items.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
            ))}
          </ol>
        );
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      
      // 1. Headers
      if (trimmed.startsWith('### ')) {
        if (currentList) {
          elements.push(renderList(currentList, `list-${lineIdx}`));
          currentList = null;
        }
        const headerText = trimmed.replace(/^###\s+/, '');
        elements.push(
          <h3 key={lineIdx} className="text-sm font-bold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: parseInline(headerText) }} />
        );
      } else if (trimmed.startsWith('## ')) {
        if (currentList) {
          elements.push(renderList(currentList, `list-${lineIdx}`));
          currentList = null;
        }
        const headerText = trimmed.replace(/^##\s+/, '');
        elements.push(
          <h2 key={lineIdx} className="text-base font-bold mt-4 mb-1.5 border-b border-zinc-200/40 pb-0.5" dangerouslySetInnerHTML={{ __html: parseInline(headerText) }} />
        );
      } else if (trimmed.startsWith('# ')) {
        if (currentList) {
          elements.push(renderList(currentList, `list-${lineIdx}`));
          currentList = null;
        }
        const headerText = trimmed.replace(/^#\s+/, '');
        elements.push(
          <h1 key={lineIdx} className="text-lg font-bold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: parseInline(headerText) }} />
        );
      }
      // 2. Unordered lists (* or -)
      else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const cleanItem = trimmed.replace(/^[\*\-]\s*/, '');
        if (currentList && currentList.type === 'ul') {
          currentList.items.push(cleanItem);
        } else {
          if (currentList) {
            elements.push(renderList(currentList, `list-${lineIdx}`));
          }
          currentList = { type: 'ul', items: [cleanItem] };
        }
      }
      // 3. Ordered lists (e.g. 1. or 2. )
      else if (/^\d+\.\s+/.test(trimmed)) {
        const cleanItem = trimmed.replace(/^\d+\.\s*/, '');
        if (currentList && currentList.type === 'ol') {
          currentList.items.push(cleanItem);
        } else {
          if (currentList) {
            elements.push(renderList(currentList, `list-${lineIdx}`));
          }
          currentList = { type: 'ol', items: [cleanItem] };
        }
      }
      // 4. Plain paragraphs
      else {
        if (currentList) {
          elements.push(renderList(currentList, `list-${lineIdx}`));
          currentList = null;
        }
        if (trimmed === '') {
          elements.push(<div key={lineIdx} className="h-1" />);
        } else {
          elements.push(
            <p key={lineIdx} className="min-h-[1rem] my-1" dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
          );
        }
      }
    });

    if (currentList) {
      elements.push(renderList(currentList, `list-end`));
    }

    return (
      <div key={blockIdx} className="space-y-1">
        {elements}
      </div>
    );
  });
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-0.5 cursor-pointer bg-transparent border-none p-0 select-none font-medium ml-1.5"
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('New Support Chat');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const focusInput = () => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // 1. Initialize sessionId and fetch history/conversations list
  useEffect(() => {
    const storedSessionId = localStorage.getItem('spurdesk_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadHistory(storedSessionId);
    } else {
      setMessages([]);
      setConversationTitle('New Support Chat');
      focusInput();
    }
    loadConversations();
  }, []);

  // 2. Auto-scroll to the bottom of the list when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // 3. Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  const loadConversations = async () => {
    try {
      const list = await ChatApi.fetchConversations();
      setConversations(list);
    } catch (err) {
      console.error('[ChatPage] Error loading conversations list:', err);
    }
  };

  const loadHistory = async (id: string) => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const data = await ChatApi.fetchHistory(id);
      setMessages(data.messages);
      setConversationTitle(data.title);
    } catch (err: any) {
      console.error(err);
      setErrorText('The AI service is temporarily unavailable. Please try again in a few moments.');
      handleNewChat();
    } finally {
      setIsLoading(false);
      focusInput();
    }
  };

  const handleSelectConversation = (id: string) => {
    setSessionId(id);
    localStorage.setItem('spurdesk_session_id', id);
    loadHistory(id);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const query = inputText.trim();
    if (!query || isLoading || isTyping) return;

    if (query.length > 2000) {
      setErrorText("Message exceeds maximum length.");
      return;
    }

    setInputText('');
    setErrorText(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Append user message immediately locally
    const userMsg: Message = {
      id: `temp-user-${Date.now()}`,
      sender: 'user',
      text: query,
      createdAt: new Date().toISOString()
    };

    setMessages((prev: Message[]) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const result = await ChatApi.sendMessage(query, sessionId || undefined);
      
      // Update session if it was generated on the backend
      if (!sessionId && result.sessionId) {
        setSessionId(result.sessionId);
        localStorage.setItem('spurdesk_session_id', result.sessionId);
      }

      setConversationTitle(result.conversationTitle);

      // Append AI message
      const aiMsg: Message = {
        id: `temp-ai-${Date.now()}`,
        sender: 'ai',
        text: result.reply,
        createdAt: new Date().toISOString()
      };

      setMessages((prev: Message[]) => [...prev, aiMsg]);
      
      // Reload conversations list to update title
      await loadConversations();
    } catch (err: any) {
      console.error(err);
      const userFriendlyError = err.message && err.message.includes('Message exceeds')
        ? err.message
        : 'The AI service is temporarily unavailable. Please try again in a few moments.';
      setErrorText(userFriendlyError);
    } finally {
      setIsTyping(false);
      focusInput();
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem('spurdesk_session_id');
    setSessionId(null);
    setMessages([]);
    setConversationTitle('New Support Chat');
    setErrorText(null);
    setInputText('');
    focusInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLoading || isTyping) {
      e.preventDefault();
      return;
    }
    const isCtrlEnter = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
    const isNormalEnter = e.key === 'Enter' && !e.shiftKey;
    
    if (isNormalEnter || isCtrlEnter) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-800 font-sans antialiased overflow-hidden">
      
      {/* Sidebar for Desktop / Hidden on Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200/80 flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Sidebar Header with blended SpurLogo */}
        <div className="h-14 border-b border-zinc-200/60 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SpurLogo size={22} className="text-blue-600" />
            <span className="font-bold text-zinc-900 tracking-tight text-base">SpurDesk</span>
          </div>
          {/* Close Sidebar Button for Mobile */}
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden p-1 text-zinc-400 hover:text-zinc-600 rounded hover:bg-zinc-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Sidebar List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2.5 py-1.5 mb-1">
            Chat Sessions
          </div>
          
          {conversations.length === 0 ? (
            <div className="text-xs text-zinc-400 px-2.5 py-1.5 italic">
              No previous chats.
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv: ConversationItem) => {
                const isActive = conv.id === sessionId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors border cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50/60 border-blue-200/30 text-blue-700 font-semibold shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-zinc-50 hover:text-zinc-900 text-zinc-500'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-600' : 'bg-zinc-300'}`}></div>
                    <span className="truncate flex-1">{conv.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer with Spur Blue CTA */}
        <div className="p-3 border-t border-zinc-200/80">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold tracking-tight transition-colors shadow-sm cursor-pointer"
          >
            <span>+</span> Start New Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-zinc-50 relative">
        {/* Mobile Header Overlay Background */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 z-40 bg-black/30 md:hidden cursor-pointer"
          ></div>
        )}

        {/* Chat Window Header */}
        <header className="h-14 border-b border-zinc-200/80 bg-white/90 backdrop-blur flex items-center justify-between px-4 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-700 rounded hover:bg-zinc-100 cursor-pointer"
            >
              ☰
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-zinc-950 tracking-tight flex items-center gap-2">
                {conversationTitle}
                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/50">
                  <span className="w-1 h-1 rounded-full bg-blue-600"></span>
                  Active Agent
                </span>
              </h1>
            </div>
          </div>
          
          {/* Header badging matching Spur landing page pills */}
          <div className="flex items-center gap-2">
            <span className="hidden lg:inline-flex text-[10px] text-zinc-500 border border-zinc-200 px-2 py-1 rounded-md bg-white">
              Shopify Partner
            </span>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              New Session
            </button>
          </div>
        </header>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm gap-2">
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin"></div>
              Loading conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-5 px-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/50 flex items-center justify-center text-blue-600">
                <SpurLogo size={26} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900">Start chatting with SpurBot.</h3>
                
                {/* Subtle Capabilities Panel */}
                <div className="mt-4 p-3.5 bg-white border border-zinc-200/80 rounded-xl text-left text-[11px] text-zinc-500 space-y-2 max-w-sm mx-auto shadow-sm select-none">
                  <div className="font-bold text-zinc-800 flex items-center gap-1.5 pb-1 border-b border-zinc-200/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    SpurDesk Demo Capabilities:
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0.5 font-medium">
                    <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">✓</span> Persistent conversations</span>
                    <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">✓</span> Context-aware AI</span>
                    <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">✓</span> FAQ grounding</span>
                    <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">✓</span> Swappable providers</span>
                    <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">✓</span> Graceful failures</span>
                    <span className="flex items-center gap-1"><span className="text-blue-600 font-bold">✓</span> Session history</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto pt-2">
                  Try asking one of the suggested prompts below:
                </p>
              </div>
              
              {/* Quick Prompt Cards in Spur light mode theme */}
              <div className="grid grid-cols-1 gap-2.5 w-full pt-1">
                {[
                  { text: "What does Spur do?", label: "What does Spur do?" },
                  { text: "What integrations exist?", label: "What integrations exist?" },
                  { text: "Explain pricing.", label: "Explain pricing." }
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(prompt.text);
                      focusInput();
                    }}
                    className="text-left text-xs bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl p-3 transition-colors cursor-pointer shadow-sm font-medium flex items-center gap-2"
                  >
                    <span className="text-blue-600 text-sm">•</span>
                    <span>{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg: Message) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group animate-fade-in`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold text-zinc-400">
                        {isUser ? 'You' : 'SpurBot'}
                      </span>
                      {!isUser && (
                        <>
                          <span className="text-[10px] text-zinc-300">•</span>
                          <CopyButton text={msg.text} />
                        </>
                      )}
                    </div>
                    
                    {/* Blended bubbles: Blue for AI, White with border for User */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-white text-zinc-900 border border-zinc-200/80 font-medium'
                          : 'bg-[#0f62fe] text-white font-normal'
                      }`}
                    >
                      <div className="space-y-1 text-inherit">
                        {parseMarkdown(msg.text)}
                      </div>
                    </div>
                    
                    {/* Timestamp displayed below each message bubble */}
                    <div className="text-[9px] text-zinc-400 mt-1 px-1 select-none">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                );
              })}

              {/* Thinking indicator combining skeleton animated placeholders */}
              {isTyping && (
                <div className="flex flex-col items-start animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-zinc-400">SpurBot is thinking...</span>
                    <span className="flex gap-0.5 text-[8px] text-zinc-400 font-bold animate-pulse">
                      <span>●</span><span>●</span><span>●</span>
                    </span>
                  </div>
                  {/* skeleton pulsing placeholder bubble */}
                  <div className="bg-white border border-zinc-200/80 rounded-2xl px-4 py-3.5 max-w-[80%] w-60 shadow-sm animate-pulse flex flex-col gap-2">
                    <div className="h-2 bg-zinc-200/70 rounded w-5/6"></div>
                    <div className="h-2 bg-zinc-200/70 rounded w-2/3"></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Alert Bar */}
        {errorText && (
          <div className="max-w-2xl mx-auto w-full px-4 mb-2 z-20">
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-semibold">{errorText}</span>
              </div>
              <button 
                onClick={() => setErrorText(null)} 
                className="text-red-500 hover:text-red-700 font-bold p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Message Input Area in Spur style */}
        <div className="border-t border-zinc-200/60 p-4 bg-white z-20 shadow-inner-sm">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-end bg-zinc-50 border border-zinc-200 rounded-2xl focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:bg-white transition-all p-1.5 pr-2.5">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                rows={1}
                disabled={isLoading || isTyping}
                className="flex-1 max-h-40 min-h-[36px] bg-transparent outline-none border-none py-2 px-3 text-sm text-zinc-900 placeholder-zinc-400 resize-none self-center align-middle"
              />
              <button
                type="submit"
                disabled={isLoading || isTyping || !inputText.trim()}
                className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors self-center flex-shrink-0 ${
                  inputText.trim() && !isLoading && !isTyping
                    ? 'bg-[#0f62fe] hover:bg-blue-700 text-white cursor-pointer shadow-sm'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </form>
            <div className="flex justify-between items-center mt-2 px-1">
              <p className="text-[10px] text-zinc-400">
                Press Enter or Ctrl+Enter to send, Shift+Enter for new line.
              </p>
              <p className="text-[10px] text-zinc-400 select-none">
                {inputText.trim().length > 1500 ? (
                  <span className={`${inputText.trim().length > 2000 ? 'text-red-500 font-bold' : 'text-amber-500 font-medium'}`}>
                    {inputText.trim().length}/2000
                  </span>
                ) : (
                  'Secure SSL & Spur AI'
                )}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
