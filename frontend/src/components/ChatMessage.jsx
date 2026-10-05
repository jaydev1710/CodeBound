function formatContent(content) {
  const parts = String(content ?? '').split(/(```[\s\S]*?```)/g)
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```[\w-]*\n?/, '').replace(/```$/, '')
      return <pre key={index}><code>{code}</code></pre>
    }
    if (!part.trim()) return null
    return <p key={index}>{part}</p>
  })
}

export default function ChatMessage({ role, content, tool }) {
  if (role === 'tool') {
    const result = tool?.result
    return (
      <div className="tool-event">
        <span className="tool-dot" />
        <span>Tool: {tool?.name || 'workspace operation'}</span>
        {result?.message ? <small>{result.message}</small> : null}
      </div>
    )
  }
  return (
    <article className={`message ${role}`}>
      <div className="avatar">{role === 'user' ? 'Y' : 'C'}</div>
      <div className="message-content">
        <span className="message-label">{role === 'user' ? 'You' : 'CodeBound'}</span>
        {formatContent(content)}
      </div>
    </article>
  )
}
