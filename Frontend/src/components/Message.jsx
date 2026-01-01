import React, { useState } from "react";
import { FiEdit2, FiCheck, FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { SimpleFormattedText } from "./FormattedText";
import RunbookCard from "./RunbookCard";

export default function Message({ sender, text, index, onEdit, isRunbook, runbookType, sources }) {
  const isUser = sender === "user";
  const msgClass = isUser ? "user" : "system";
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);

  if (!isUser && isRunbook) {
    return (
      <div className="message-row system">
        <div className="message-wrapper" style={{ maxWidth: '85%' }}>
          <div className="message-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
          <RunbookCard
            content={text}
            type={runbookType}
            sources={sources}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`message-row ${msgClass}`}
    >
      <div
        className="message-wrapper"
      >
        <div className="message-icon">
          {isUser ? (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          )}
        </div>

        <div className="message-bubble">
          {isEditing ? (
            <div className="edit-mode">
              <textarea
                autoFocus
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onEdit && onEdit(index, editedText);
                    setIsEditing(false);
                  }
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditedText(text);
                  }
                }}
              />
              <div className="edit-actions">
                <button onClick={() => { setIsEditing(false); setEditedText(text); }}>Cancel</button>
                <button onClick={() => { onEdit && onEdit(index, editedText); setIsEditing(false); }}>Submit</button>
              </div>
            </div>
          ) : (
            <SimpleFormattedText text={text} />
          )}
        </div>

        {isUser && !isEditing && (
          <button
            className="edit-msg-btn"
            onClick={() => { setIsEditing(true); setEditedText(text); }}
            title="Edit message"
          >
            <FiEdit2 />
          </button>
        )}

      </div>
    </div>
  );
}
