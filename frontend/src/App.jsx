import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatMessage from './components/ChatMessage'
import { approveChange, getWorkspace, getWorkspaceTree, rejectChange, selectWorkspace, sendChat } from './services/api'

const STORAGE_KEY = 'codebound_conversations_v2'
const WORKSPACE_KEY = 'codebound_workspace_v2'
const ACTIVE_KEY = 'codebound_active_conversation_v2'
const welcome = {
  role: 'assistant',
  content: 'I’m CodeBound, your local coding agent. Select a workspace on the left to let me inspect files. File changes are always shown as a diff and require your approval.',
}

function makeConversation() {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return { id, title: 'New conversation', createdAt: Date.now(), updatedAt: Date.now(), messages: [welcome] }
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(saved)) return [makeConversation()]
    const normalized = saved.map((item) => ({ ...item, messages: Array.isArray(item.messages) && item.messages.length ? item.messages : [welcome] }))
    return normalized.length ? normalized : [makeConversation()]
  } catch {
    return [makeConversation()]
  }
}

function titleFrom(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned || 'New conversation'
}

function getInitialActiveId(conversations) {
  const stored = localStorage.getItem(ACTIVE_KEY)
  return conversations.some((item) => item.id === stored) ? stored : conversations[0]?.id ?? null
}

export default function App() {
  const [conversations, setConversations] = useState(() => loadSaved())
  const [activeId, setActiveId] = useState(() => getInitialActiveId(loadSaved()))
  const [input, setInput] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [workspace, setWorkspace] = useState({ selected: false, path: '', name: '' })
  const [workspacePath, setWorkspacePath] = useState(() => localStorage.getItem(WORKSPACE_KEY) || '')
  const [files, setFiles] = useState([])
  const [pending, setPending] = useState([])
  const controllerRef = useRef(null)
  const endRef = useRef(null)

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? conversations[0],
    [conversations, activeId],
  )
  const messages = activeConversation?.messages ?? [welcome]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    if (!conversations.some((item) => item.id === activeId)) {
      const nextId = conversations[0]?.id ?? null
      setActiveId(nextId)
    }
  }, [conversations, activeId])

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
  }, [activeId])

  useEffect(() => {
    let cancelled = false
    const remembered = localStorage.getItem(WORKSPACE_KEY)
    if (remembered) {
      selectWorkspace(remembered).then(async (value) => {
        if (cancelled) return
        const next = { selected: true, path: value.path, name: value.path.split(/[/\\]/).filter(Boolean).pop() }
        setWorkspace(next)
        setWorkspacePath(value.path)
        try {
          const tree = await getWorkspaceTree()
          if (!cancelled) setFiles(tree.tree || [])
        } catch (err) {
          if (!cancelled) setError(err.message)
        }
      }).catch(() => {})
    } else {
      getWorkspace().then((value) => {
        if (cancelled) return
        setWorkspace({ ...value, name: value.path ? value.path.split(/[/\\]/).filter(Boolean).pop() : '' })
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, pending.length, working])

  function updateConversation(id, updater) {
    setConversations((current) => current.map((item) => item.id === id ? updater(item) : item))
  }

  function updateActiveMessages(nextMessages, extra = {}) {
    if (!activeId) return
    updateConversation(activeId, (item) => ({ ...item, ...extra, messages: nextMessages, updatedAt: Date.now() }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || working || !activeConversation) return
    const history = messages.filter((item) => item !== welcome && (item.role === 'user' || item.role === 'assistant')).slice(-8)
    const userMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    updateConversation(activeConversation.id, (item) => ({
      ...item,
      title: item.title === 'New conversation' ? titleFrom(text) : item.title,
      messages: nextMessages,
      updatedAt: Date.now(),
    }))
    setInput('')
    setError('')
    setPending([])
    setWorking(true)
    controllerRef.current = new AbortController()
    try {
      console.info('[CodeBound] Sending chat request', { message: text, workspace: workspace.path || null })
      const result = await sendChat(text, history, controllerRef.current.signal)
      console.info('[CodeBound] Chat response', result)
      const toolMessages = (result.events || []).map((event) => ({ role: 'tool', content: `${event.name} completed`, tool: event }))
      const assistant = result.reply || 'I could not produce a response.'
      updateConversation(activeConversation.id, (item) => ({ ...item, messages: [...nextMessages, ...toolMessages, { role: 'assistant', content: assistant }], updatedAt: Date.now() }))
      setPending(result.pending_changes || [])
    } catch (err) {
      console.error('[CodeBound] Chat error', err)
      if (err.name !== 'AbortError') setError(err.message || 'Request failed.')
    } finally {
      controllerRef.current = null
      setWorking(false)
    }
  }

  function newConversation() {
    if (working) return
    const conversation = makeConversation()
    setConversations((current) => [conversation, ...current])
    setActiveId(conversation.id)
    setInput('')
    setError('')
    setPending([])
  }

  function clearChat() {
    if (working || !activeConversation) return
    updateConversation(activeConversation.id, (item) => ({ ...item, title: 'New conversation', messages: [welcome], updatedAt: Date.now() }))
    setInput('')
    setError('')
    setPending([])
  }

  function loadConversation(id) {
    if (working) return
    setActiveId(id)
    setInput('')
    setError('')
    setPending([])
  }

  function renameConversation(conversation) {
    if (working) return
    const name = window.prompt('Rename conversation:', conversation.title || 'New conversation')
    if (!name?.trim()) return
    updateConversation(conversation.id, (item) => ({ ...item, title: name.trim().slice(0, 80), updatedAt: Date.now() }))
  }

  function deleteConversation(id) {
    if (working) return
    const target = conversations.find((item) => item.id === id)
    if (!target) return
    if (!window.confirm(`Delete “${target.title || 'New conversation'}”? This removes its local history.`)) return
    setConversations((current) => current.filter((item) => item.id !== id))
    if (activeId === id) {
      const remaining = conversations.filter((item) => item.id !== id)
      if (remaining.length) setActiveId(remaining[0].id)
      else {
        const fresh = makeConversation()
        setConversations([fresh])
        setActiveId(fresh.id)
      }
    }
    setPending([])
    setError('')
  }

  async function handleSelectWorkspace() {
    if (working) return
    const raw = workspacePath.trim()
    if (!raw) {
      setError('Enter a full local folder path in the Workspace field.')
      return
    }
    try {
      const value = await selectWorkspace(raw)
      const next = { selected: true, path: value.path, name: value.path.split(/[/\\]/).filter(Boolean).pop() }
      localStorage.setItem(WORKSPACE_KEY, value.path)
      setWorkspacePath(value.path)
      setWorkspace(next)
      const tree = await getWorkspaceTree()
      setFiles(tree.tree || [])
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function refreshFiles() {
    if (!workspace.selected) return
    try {
      const tree = await getWorkspaceTree()
      setFiles(tree.tree || [])
      setError('')
    } catch (err) { setError(err.message) }
  }

  function openFile(item) {
    setInput(`Read ${item.path} and explain what it does.`)
  }

  async function approve(id) {
    const change = pending.find((item) => item.id === id)
    if (!change) return
    try {
      await approveChange(id)
      setPending((current) => current.filter((item) => item.id !== id))
      await refreshFiles()
      updateActiveMessages([...messages, { role: 'assistant', content: `Approved and applied the change to "${change.path}".` }])
    } catch (err) { setError(err.message) }
  }

  async function reject(id) {
    const change = pending.find((item) => item.id === id)
    if (!change) return
    try {
      await rejectChange(id)
      setPending((current) => current.filter((item) => item.id !== id))
      updateActiveMessages([...messages, { role: 'assistant', content: `The proposed change to "${change.path}" was rejected.` }])
    } catch (err) { setError(err.message) }
  }

  return (
    <main className="app-shell">
      <Sidebar
        workspace={workspace}
        files={files}
        workspacePath={workspacePath}
        onWorkspacePathChange={setWorkspacePath}
        onSelectWorkspace={handleSelectWorkspace}
        onRefresh={refreshFiles}
        onOpenFile={openFile}
        conversations={conversations}
        activeId={activeId}
        onNewConversation={newConversation}
        onLoadConversation={loadConversation}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
      />
      <section className="chat-panel">
        <header className="chat-header">
          <div><span className="eyebrow">LOCAL AGENT</span><h1>{activeConversation?.title || 'New conversation'}</h1></div>
          <button className="text-button" onClick={clearChat} disabled={working}>Clear chat</button>
        </header>

        <div className="conversation">
          {messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} {...message} />)}
          {working && <div className="activity"><span className="pulse" />CodeBound is thinking…</div>}
          {error && <div className="error"><strong>CodeBound error</strong><span>{error}</span></div>}
          {pending.map((change) => (
            <div className="change-card" key={change.id}>
              <div className="change-header"><div><strong>{change.action === 'delete' ? 'Delete file' : 'Proposed file change'}</strong><span>{change.path}</span></div><span className="approval-badge">Approval required</span></div>
              <pre>{change.diff || '(No textual diff)'}</pre>
              <div className="change-actions"><button className="secondary-button" onClick={() => reject(change.id)}>Reject</button><button className="primary-small" onClick={() => approve(change.id)}>Approve change</button></div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask CodeBound about your code…" rows="1" maxLength="4000" disabled={working} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }} />
          <div className="composer-footer"><span>Enter to send · Shift + Enter for a new line</span>{working ? <button type="button" className="stop-button" onClick={() => controllerRef.current?.abort()}>Stop</button> : <button type="submit" className="send-button" disabled={!input.trim()}>Send <span>↗</span></button>}</div>
        </form>
      </section>
    </main>
  )
}
