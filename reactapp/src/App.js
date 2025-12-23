import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { FiUser, FiSun, FiMoon, FiTrash2, FiDownload, FiCheck, FiSettings } from "react-icons/fi";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(Date.now());

  const [analytics, setAnalytics] = useState({ totalQuestions: 0, searches: [] });

  const [activeView, setActiveView] = useState("Dashboard");

  const [settings, setSettings] = useState({
    userName: "User",
    userEmail: "user@example.com",
    fontSize: "medium",
    apiEndpoint: "http://127.0.0.1:8000"
  });

  const [saveStatus, setSaveStatus] = useState("");

  const [calcType, setCalcType] = useState("emi");
  const [calcResult, setCalcResult] = useState(null);

  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${settings.apiEndpoint}/documents`);
      const data = await res.json();
      setUploadedDocs(data.documents || []);
    } catch (e) {
      console.error("Failed to fetch documents", e);
    }
  };

  const openDocPreview = async (docName) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`${settings.apiEndpoint}/documents/${encodeURIComponent(docName)}`);
      const data = await res.json();
      setPreviewDoc(data);
    } catch (e) {
      console.error("Failed to fetch document", e);
    }
    setPreviewLoading(false);
  };

  const closePreview = () => setPreviewDoc(null);

  useEffect(() => {
    if (activeView === "Reports") {
      fetchDocuments();
    }
  }, [activeView]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const sizes = { small: "14px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--base-font-size", sizes[settings.fontSize]);
    document.body.style.fontSize = sizes[settings.fontSize];
  }, [settings.fontSize]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleUploadSuccess = (docName) => {
    fetchDocuments();
    const systemMsg = {
      sender: "system",
      text: `✅ Document "**${docName}**" uploaded and processed successfully. You can now ask questions about it!`
    };
    setMessages(prev => [...prev, systemMsg]);
  };

  const saveSettings = () => {
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    }, 500);
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${settings.apiEndpoint}/history/list`);
      const data = await res.json();
      if (data.history) {
        setChatHistory(data.history);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  const newChat = () => {
    if (messages.length > 0) {
      const chatTitle = messages[0]?.text?.slice(0, 30) || "Untitled Chat";
      setChatHistory(prev => {
        const existingIndex = prev.findIndex(c => c.id === currentChatId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], messages };
          return updated;
        } else if (currentChatId) {
          return [{ id: currentChatId, title: chatTitle, messages, timestamp: new Date().toISOString() }, ...prev];
        }
        return prev;
      });
    }
    setCurrentChatId(Date.now());
    setMessages([]);
    setIsTyping(false);
    setActiveView("Dashboard");
  };

  const loadChat = (chatId) => {
    if (messages.length > 0 && currentChatId) {
      const chatTitle = messages[0]?.text?.slice(0, 30) || "Untitled Chat";
      setChatHistory(prev => {
        const existingIndex = prev.findIndex(c => c.id === currentChatId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], messages };
          return updated;
        } else {
          return [{ id: currentChatId, title: chatTitle, messages, timestamp: new Date().toISOString() }, ...prev];
        }
      });
    }

    const selectedChat = chatHistory.find(c => c.id === chatId);
    if (selectedChat) {
      setCurrentChatId(chatId);
      fetch(`${settings.apiEndpoint}/history/${chatId}`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            setMessages(data.messages);
          } else {
            setMessages([]);
          }
        })
        .catch(err => {
          console.error(err);
          setMessages([]);
        });

      setActiveView("Dashboard");
    }
  };

  const deleteChat = async (chatId) => {
    try {
      const res = await fetch(`${settings.apiEndpoint}/history/${chatId}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (data.success) {
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(Date.now());
          setMessages([]);
          setIsTyping(false);
          setActiveView("Dashboard");
        }
      } else {
        alert("Failed to delete chat from server.");
      }
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Error deleting chat. Check connection.");
    }
  };

  const handleMenuClick = (menuKey) => setActiveView(menuKey);

  const clearAllData = () => {
    if (window.confirm("Clear all chat history and analytics?")) {
      setChatHistory([]);
      setAnalytics({ totalQuestions: 0, searches: [] });
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ chatHistory, analytics, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `arcofintech-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const processMessage = async (text, baseMessages) => {
    const userMsg = { sender: "user", text };
    const updatedMessages = [...baseMessages, userMsg];

    setMessages(updatedMessages);

    setAnalytics(prev => ({
      totalQuestions: prev.totalQuestions + 1,
      searches: [{ query: text, timestamp: new Date().toISOString() }, ...prev.searches].slice(0, 50)
    }));

    setChatHistory(prev => {
      const existingIndex = prev.findIndex(c => c.id === currentChatId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], messages: updatedMessages };
        return updated;
      } else {
        return [{
          id: currentChatId,
          title: text.slice(0, 30),
          messages: updatedMessages,
          timestamp: new Date().toISOString()
        }, ...prev];
      }
    });

    const conversationHistory = [];
    const recentMessages = baseMessages.slice(-10);
    for (const msg of recentMessages) {
      conversationHistory.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text
      });
    }

    setIsTyping(true);
    try {
      const response = await fetch(`${settings.apiEndpoint}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          conversation_history: conversationHistory,
          conversation_id: String(currentChatId)
        })
      });
      const data = await response.json();
      setIsTyping(false);

      const assistantResponse = data.answer || "No response.";
      const systemMsg = {
        sender: "system",
        text: assistantResponse,
        is_runbook: data.is_runbook || false,
        runbook_type: data.runbook_type || null,
        sources: data.sources || []
      };

      setMessages(prev => [...prev, systemMsg]);
      setChatHistory(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, systemMsg] } : c));

      fetchChatHistory();
    } catch {
      setIsTyping(false);
      const errorMsg = { sender: "system", text: "⚠ Backend unreachable." };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    processMessage(input, messages);
    setInput("");
  };

  const handleEditMessage = (index, newText) => {
    const keptMessages = messages.slice(0, index);
    processMessage(newText, keptMessages);
  };

  const toggleProfile = () => setProfileOpen(!profileOpen);
  useEffect(() => {
    const handler = e => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case "Reports":
        return (
          <div className="reports-container">
            {previewDoc && (
              <div className="preview-overlay" onClick={closePreview}>
                <div className="preview-modal" onClick={e => e.stopPropagation()}>
                  <div className="preview-header">
                    <div className="preview-title">
                      <span className="preview-icon">📄</span>
                      <h3>{previewDoc.name}</h3>
                    </div>
                    <button className="preview-close" onClick={closePreview}>✕</button>
                  </div>
                  <div className="preview-content">
                    {previewDoc.chunks.map((chunk, i) => (
                      <div key={i} className="preview-chunk">
                        <div className="chunk-header">Chunk {chunk.id + 1}</div>
                        <div className="chunk-text">{chunk.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="reports-header">
              <h2>Reports</h2>
              <p>Usage analytics and document management</p>
            </div>

            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-value">{analytics.totalQuestions}</div>
                <div className="stat-label">Questions</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{chatHistory.length}</div>
                <div className="stat-label">Sessions</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{uploadedDocs.length}</div>
                <div className="stat-label">Documents</div>
              </div>
            </div>

            <div className="reports-grid">
              <div className="report-section">
                <div className="section-title">
                  <h3>Documents</h3>
                  <span className="count-badge">{uploadedDocs.length}</span>
                </div>
                {uploadedDocs.length === 0 ? (
                  <div className="empty-msg">No documents yet</div>
                ) : (
                  <div className="doc-list">
                    {uploadedDocs.map((doc, i) => (
                      <div key={i} className="doc-row" onClick={() => openDocPreview(doc.name)}>
                        <span className="doc-icon">📄</span>
                        <span className="doc-name">{doc.name}</span>
                        <span className="doc-chunks">{doc.chunks}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="report-section">
                <div className="section-title">
                  <h3>Recent Queries</h3>
                </div>
                {analytics.searches.length === 0 ? (
                  <div className="empty-msg">No queries yet</div>
                ) : (
                  <div className="query-list">
                    {analytics.searches.slice(0, 6).map((s, i) => (
                      <div key={i} className="query-row">
                        <span className="query-text">{s.query}</span>
                        <span className="query-time">{new Date(s.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "Settings":
        return (
          <div className="settings-container">
            <div className="settings-header">
              <h2>Settings</h2>
              <p>Manage your preferences</p>
            </div>

            <div className="settings-section">
              <h3>Profile</h3>
              <div className="field-group">
                <label>Name</label>
                <input
                  type="text"
                  value={settings.userName}
                  onChange={(e) => setSettings(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="field-group">
                <label>Email</label>
                <input
                  type="email"
                  value={settings.userEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, userEmail: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="settings-section">
              <h3>Appearance</h3>
              <div className="field-group">
                <label>Theme</label>
                <div className="btn-group">
                  <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>
                    <FiSun /> Light
                  </button>
                  <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>
                    <FiMoon /> Dark
                  </button>
                </div>
              </div>
              <div className="field-group">
                <label>Font Size</label>
                <div className="btn-group">
                  {["small", "medium", "large"].map(size => (
                    <button
                      key={size}
                      className={settings.fontSize === size ? "active" : ""}
                      onClick={() => setSettings(prev => ({ ...prev, fontSize: size }))}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>System</h3>
              <div className="field-group">
                <label>API Endpoint</label>
                <input
                  type="text"
                  value={settings.apiEndpoint}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                  placeholder="http://localhost:8000"
                />
              </div>
              <div className="action-row">
                <button className="btn-secondary" onClick={exportData}>
                  <FiDownload /> Export Data
                </button>
                <button className="btn-danger" onClick={clearAllData}>
                  <FiTrash2 /> Clear All
                </button>
              </div>
            </div>

            <button className={`save-btn ${saveStatus}`} onClick={saveSettings}>
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? <><FiCheck /> Saved</> : "Save Settings"}
            </button>

            <div className="settings-footer">
              ARCOFINTECH v1.0.0
            </div>
          </div>
        );

      case "Help":
        return (
          <div className="help-container">
            <div className="help-header">
              <div className="header-brand">
                <div className="help-logo">A</div>
                <h2>ARCOFINTECH</h2>
              </div>
              <p>Your AI-Powered Financial Assistant</p>
            </div>

            <div className="help-section">
              <h3>What We Do</h3>
              <p className="section-text">
                ARCOFINTECH is an intelligent financial assistant that helps you understand your financial documents.
                Upload bank statements, loan agreements, investment reports, or any financial document - our AI will analyze
                and answer your questions based on the content.
              </p>
            </div>

            <div className="help-section">
              <h3>Capabilities</h3>
              <div className="capability-grid">
                <div className="capability-item">
                  <span>📄</span>
                  <div>
                    <strong>Document Analysis</strong>
                    <p>Upload PDF/TXT files for AI processing</p>
                  </div>
                </div>
                <div className="capability-item">
                  <span>💬</span>
                  <div>
                    <strong>Smart Q&A</strong>
                    <p>Ask questions about your documents</p>
                  </div>
                </div>
                <div className="capability-item">
                  <span>🎤</span>
                  <div>
                    <strong>Voice Input</strong>
                    <p>Speak your questions naturally</p>
                  </div>
                </div>
                <div className="capability-item">
                  <span>📊</span>
                  <div>
                    <strong>Analytics</strong>
                    <p>Track usage and manage documents</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="help-section">
              <h3>Technology</h3>
              <div className="tech-badges">
                <span className="tech-badge">RAG</span>
                <span className="tech-badge">PostgreSQL</span>
                <span className="tech-badge">Groq LLM</span>
                <span className="tech-badge">React</span>
                <span className="tech-badge">FastAPI</span>
              </div>
              <p className="section-text" style={{ marginTop: '12px' }}>
                Powered by Retrieval Augmented Generation - documents are chunked, embedded, and intelligently retrieved to provide accurate answers.
              </p>
            </div>

            <div className="help-section">
              <h3>Support</h3>
              <div className="support-info">
                <p>📧 <strong>support@arcofintech.com</strong></p>
                <p>📞 +91 1800-123-4567</p>
                <p>🌐 www.arcofintech.com</p>
              </div>
            </div>

            <div className="help-footer">
              <p>Version 1.0.0 • © 2024 ARCOFINTECH</p>
            </div>
          </div>
        );

      default:
        return (
          <ChatWindow
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            isTyping={isTyping}
            sidebarOpen={sidebarOpen}
            theme={theme}
            apiEndpoint={settings.apiEndpoint}
            onEditMessage={handleEditMessage}
            onUploadSuccess={handleUploadSuccess}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        open={sidebarOpen}
        toggleSidebar={toggleSidebar}
        theme={theme}
        toggleTheme={toggleTheme}
        newChat={newChat}
        chatHistory={chatHistory}
        loadChat={loadChat}
        activeView={activeView}
        onMenuClick={handleMenuClick}
        deleteChat={deleteChat}
        settings={settings}
      />

      {renderContent()}
    </div>
  );
}
