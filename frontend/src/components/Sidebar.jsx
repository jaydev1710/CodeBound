function FileTree({ nodes, onOpen }) {
  return (
    <div className="file-tree">
      {nodes.map((item) => (
        <div key={item.path} className="tree-item-wrap">
          <button className="tree-item" onClick={() => item.type === 'file' && onOpen(item)} title={item.path}>
            <span className="tree-caret">{item.type === 'directory' ? '▸' : '•'}</span>
            <span>{item.name}</span>
          </button>
          {item.type === 'directory' && item.children?.length ? (
            <div className="tree-children"><FileTree nodes={item.children} onOpen={onOpen} /></div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function Sidebar({
  workspace,
  files,
  workspacePath,
  onWorkspacePathChange,
  onSelectWorkspace,
  onRefresh,
  onOpenFile,
  conversations,
  activeId,
  onNewConversation,
  onLoadConversation,
  onRenameConversation,
  onDeleteConversation,
}) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">⌘</span><span>CodeBound</span></div>

      <button className="new-chat-button" onClick={onNewConversation}>＋ New conversation</button>

      <section className="sidebar-section conversation-section">
        <div className="section-title"><span>CONVERSATIONS</span><span className="conversation-count">{conversations.length}</span></div>
        <div className="conversation-list">
          {conversations.length === 0 ? <div className="sidebar-empty">No saved conversations.</div> : conversations.map((conversation) => (
            <div key={conversation.id} className={`conversation-row ${activeId === conversation.id ? 'active' : ''}`}>
              <button className="conversation-main" onClick={() => onLoadConversation(conversation.id)} title={conversation.title}>
                <span>{conversation.title || 'New conversation'}</span>
                <small>{new Date(conversation.updatedAt).toLocaleDateString()}</small>
              </button>
              <div className="conversation-actions">
                <button className="conversation-action" onClick={() => onRenameConversation(conversation)} title="Rename conversation" aria-label={`Rename ${conversation.title}`}>✎</button>
                <button className="conversation-action danger" onClick={() => onDeleteConversation(conversation.id)} title="Delete conversation" aria-label={`Delete ${conversation.title}`}>×</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sidebar-section workspace-section">
        <div className="section-title"><span>WORKSPACE</span><button className="icon-button" onClick={onRefresh} disabled={!workspace.selected} title="Refresh files">↻</button></div>
        <div className="workspace-picker">
          <input
            value={workspacePath}
            onChange={(event) => onWorkspacePathChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') onSelectWorkspace() }}
            placeholder={workspace.selected ? workspace.path : 'F:\\path\\to\\project'}
            aria-label="Workspace folder path"
          />
          <button className="primary-small full-width" onClick={onSelectWorkspace}>{workspace.selected ? 'Change folder' : 'Open folder'}</button>
        </div>
        {workspace.selected ? (
          <div className="workspace-card selected">
            <span className="workspace-status"><span className="status-dot" />Workspace open</span>
            <strong title={workspace.path}>{workspace.name || workspace.path}</strong>
            <span className="workspace-path" title={workspace.path}>{workspace.path}</span>
          </div>
        ) : (
          <div className="workspace-card"><strong>No workspace selected</strong><p>Enter a local folder path above. CodeBound will keep all file tools inside it.</p></div>
        )}
      </section>

      <section className="sidebar-section explorer-section">
        <div className="section-title"><span>EXPLORER</span></div>
        {workspace.selected ? (files.length ? <div className="explorer-scroll"><FileTree nodes={files} onOpen={onOpenFile} /></div> : <div className="sidebar-empty">No files found.</div>) : <div className="sidebar-empty">Open a workspace to explore its files.</div>}
      </section>

      <footer>Local-first coding agent<br /><span>Chat · Workspace · Diffs</span></footer>
    </aside>
  )
}
