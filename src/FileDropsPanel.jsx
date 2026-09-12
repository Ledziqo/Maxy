import React from 'react'

export default function FileDropsPanel({ drops, api, headers, onUpdate }) {
  const download = async file => {
    const response = await fetch(file.url, { headers })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
  return <div className="operations-list file-drops-list">{drops.length ? drops.map(drop => <article className="operations-panel file-drop-admin-card" key={drop.id}><div className="panel-heading"><div><div className="eyebrow">FILE DROP #{drop.id}</div><h2>{drop.customer_name}</h2><small>{drop.customer_phone || 'No phone'} {drop.customer_email ? `· ${drop.customer_email}` : ''} · {new Date(drop.created_at).toLocaleString()}</small></div><select value={drop.status} onChange={event => onUpdate(drop.id, event.target.value)}><option value="new">New</option><option value="reviewed">Reviewed</option><option value="archived">Archived</option></select></div>{drop.note && <p className="file-drop-note">{drop.note}</p>}<div className="file-drop-admin-files">{drop.files.map(file => <button className="outline" key={file.id} onClick={() => download(file)}>↓ {file.original_name} <small>{Math.ceil(file.size_bytes / 1024)} KB</small></button>)}</div></article>) : <div className="empty-state"><h2>No file drops yet</h2><p>Files sent from the storefront will appear here.</p></div>}</div>
}
