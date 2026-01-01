import React from "react";
import {
  FiMenu, FiChevronLeft, FiSun, FiMoon, FiPlus, FiHome,
  FiFileText, FiSettings, FiHelpCircle, FiMessageSquare, FiClock, FiTrash2, FiSearch, FiUser, FiLogOut
} from "react-icons/fi";
import "../styles/search-modal.css";

export default function Sidebar({
  open,
  toggleSidebar,
  theme,
  toggleTheme,
  newChat,
  chatHistory = [],
  loadChat,
  activeView,
  onMenuClick,
  deleteChat,
  settings
}) {

  const menu = [
    { key: "Dashboard", icon: <FiHome /> },
    { key: "Reports", icon: <FiFileText /> },
    { key: "Settings", icon: <FiSettings /> }
  ];

  const support = [{ key: "Help", icon: <FiHelpCircle /> }];
  const [searchModalOpen, setSearchModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deleteModal, setDeleteModal] = React.useState({ open: false, chat: null });

  const filteredHistory = chatHistory.filter(chat =>
    (chat.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (e, chat) => {
    e.stopPropagation();
    setDeleteModal({ open: true, chat });
  };

  const confirmDelete = () => {
    if (deleteModal.chat) {
      deleteChat(deleteModal.chat.id);
      setDeleteModal({ open: false, chat: null });
    }
  };

  return (
    <>
      <aside className={`sidebar ${open ? "open" : "closed"}`}>
        <div className="sidebar-header">
          {open ? (
            <>
              <FiChevronLeft className="collapse-icon" onClick={toggleSidebar} />
              <div className="brand"><div className="brand-logo">A</div><div className="brand-text">ARCOFINTECH</div></div>
            </>
          ) : (
            <FiMenu className="menu-icon" onClick={toggleSidebar} />
          )}
        </div>

        <div className="sidebar-content">
          <button className="new-chat-btn" onClick={newChat}>
            <FiPlus /> {open && <span>New Chat</span>}
          </button>

          {open && <div className="sidebar-section-title">MAIN MENU</div>}

          {menu.map(item => (
            <div
              key={item.key}
              className={`sidebar-item ${activeView === item.key ? "active" : ""}`}
              onClick={() => onMenuClick && onMenuClick(item.key)}
            >
              {item.icon} {open && <span>{item.key}</span>}
            </div>
          ))}

          <div className="sidebar-divider" style={{ margin: "12px 0", height: 1, background: "rgba(255,255,255,0.03)" }} />

          <div
            className="sidebar-item"
            onClick={() => setSearchModalOpen(true)}
          >
            <FiSearch /> {open && <span>Search Chats</span>}
          </div>

          <div className="sidebar-divider" style={{ margin: "12px 0", height: 1, background: "rgba(255,255,255,0.03)" }} />

          {open && <div className="sidebar-section-title"><FiClock style={{ marginRight: 6 }} /> CHAT HISTORY</div>}

          {open && (
            <div className="chat-history-list">
              {chatHistory.length === 0 ? (
                <div className="chat-history-empty">No previous chats</div>
              ) : (
                chatHistory.slice(0, 10).map(chat => (
                  <div
                    key={chat.id}
                    className="chat-history-item"
                    onClick={() => loadChat && loadChat(chat.id)}
                  >
                    <FiMessageSquare className="chat-history-icon" />
                    <div className="chat-history-content">
                      <div className="chat-history-title">{chat.title || "Untitled Chat"}</div>
                      <div className="chat-history-time">
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    {open && (
                      <button
                        className="delete-chat-btn"
                        onClick={(e) => handleDeleteClick(e, chat)}
                        title="Delete chat"
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          <div className="sidebar-divider" style={{ margin: "12px 0", height: 1, background: "rgba(255,255,255,0.03)" }} />

          {open && <div className="sidebar-section-title">SUPPORT</div>}

          {support.map(item => (
            <div
              key={item.key}
              className={`sidebar-item ${activeView === item.key ? "active" : ""}`}
              onClick={() => onMenuClick && onMenuClick(item.key)}
            >
              {item.icon} {open && <span>{item.key}</span>}
            </div>
          ))}

          <div className="sidebar-item logout-item" onClick={() => {
            if (window.handleLogout) window.handleLogout();
          }}>
            <FiLogOut />
            {open && <span>Log Out</span>}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="profile-avatar">
              <FiUser />
            </div>
            {open && (
              <div className="profile-info">
                <div className="profile-name">{settings?.userName || "User"}</div>
                <div className="profile-email">{settings?.userEmail || "user@example.com"}</div>
              </div>
            )}
          </div>
        </div>
      </aside >

      {
        deleteModal.open && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Delete Chat?</h3>
              <p className="modal-subtitle">This action cannot be undone.</p>

              <div className="modal-preview">
                <div className="preview-label">Preview:</div>
                <div className="preview-text">
                  {deleteModal.chat.messages && deleteModal.chat.messages.length > 0
                    ? deleteModal.chat.messages[0].text.substring(0, 100) + (deleteModal.chat.messages[0].text.length > 100 ? "..." : "")
                    : (deleteModal.chat.preview || deleteModal.chat.title || "Empty chat")}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setDeleteModal({ open: false, chat: null })}
                  className="modal-btn cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="modal-btn delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }
      {
        searchModalOpen && (
          <div className="modal-overlay" onClick={() => setSearchModalOpen(false)}>
            <div className="modal-content search-modal" onClick={e => e.stopPropagation()}>
              <div className="search-modal-header">
                <FiSearch className="search-modal-icon" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-modal-input"
                />
              </div>
              <div className="search-results">
                {filteredHistory.length === 0 ? (
                  <div className="search-empty">
                    {searchQuery ? "No matching chats found" : "Type to search..."}
                  </div>
                ) : (
                  filteredHistory.map(chat => (
                    <div
                      key={chat.id}
                      className="search-result-item"
                      onClick={() => {
                        loadChat(chat.id);
                        setSearchModalOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <FiMessageSquare className="result-icon" />
                      <div className="result-info">
                        <div className="result-title">{chat.title || "Untitled Chat"}</div>
                        <div className="result-date">
                          {new Date(chat.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}
