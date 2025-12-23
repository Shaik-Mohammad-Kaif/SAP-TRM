import React, { useRef, useEffect, useState } from "react";
import Message from "./Message";
import { FiMic, FiMicOff, FiPaperclip, FiFileText, FiX } from "react-icons/fi";

export default function ChatWindow({
  messages, input, setInput, sendMessage,
  isTyping, sidebarOpen, theme,
  apiEndpoint, onEditMessage, onUploadSuccess
}) {
  const chatEndRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [setInput]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const toggleVoice = () => {
    if (!speechSupported) {
      alert("Speech recognition not supported. Use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.txt'].includes(ext)) {
      alert("Only PDF and TXT files allowed.");
      return;
    }
    setAttachedFile(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedFile) return;

    if (attachedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachedFile);
        const response = await fetch(`${apiEndpoint}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        if (!response.ok) {
          alert(`Upload failed: ${data.detail}`);
          setIsUploading(false);
          return;
        }
        if (onUploadSuccess) onUploadSuccess(data.document_name || attachedFile.name);
      } catch (error) {
        alert(`Upload failed: ${error.message}`);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    if (input.trim()) {
      sendMessage();
    }
  };

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="welcome-center">
          <div className="welcome-title">👋 Welcome, Kaif!</div>
          <div className="welcome-sub">How can ARCOFINTECH assist you today?</div>
          <div className="suggestions">
            <div className="suggestion-item">💰 How to manage monthly budget?</div>
            <div className="suggestion-item">📊 Show investment insights</div>
            <div className="suggestion-item">🏦 How to improve credit score?</div>
            <div className="suggestion-item">⚡ Best savings plan?</div>
          </div>
        </div>
      )}

      <div className="messages">
        {messages.map((msg, index) => (
          <Message
            key={index}
            sender={msg.sender}
            text={msg.text}
            index={index}
            onEdit={onEditMessage}
            isRunbook={msg.is_runbook}
            runbookType={msg.runbook_type}
            sources={msg.sources}
          />
        ))}

        {isTyping && (
          <div className="message-row system">
            <div className="message-wrapper">
              <div className="message-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </div>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className={`input-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="input-wrapper">
          {attachedFile && (
            <div className="attached-file">
              <FiFileText className="file-icon" />
              <span className="file-name">{attachedFile.name}</span>
              <button className="file-remove" onClick={removeFile}><FiX /></button>
            </div>
          )}

          <div className="input-bar">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt"
              style={{ display: 'none' }}
            />

            <button
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <FiPaperclip />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isUploading ? "Uploading..." : isListening ? "Listening..." : "Message ARCOFINTECH..."}
              onKeyDown={(e) => e.key === "Enter" && !isUploading && handleSend()}
              disabled={isUploading}
            />

            <button
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleVoice}
              title="Voice input"
            >
              {isListening ? <FiMicOff /> : <FiMic />}
            </button>

            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isUploading || (!input.trim() && !attachedFile)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
