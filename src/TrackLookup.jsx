import React, { useState } from 'react'

export default function TrackLookup({ go }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const submit = event => {
    event.preventDefault()
    const value = token.trim()
    const match = value.match(/(?:^|\/)track\/([^/?#]+)(?:[?#].*)?$/)
    const code = match ? match[1] : value
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) { setError('Paste the tracking code or full tracking link from your confirmation.'); return }
    setError('')
    go(`/track/${encodeURIComponent(code)}`)
  }
  return <main className="subpage centered-page track-lookup">
    <div className="eyebrow">ORDER TRACKING</div><h1>See where your order is.</h1>
    <p>Paste your private tracking code or confirmation link to follow your print job.</p>
    <form onSubmit={submit}><input autoFocus required aria-label="Tracking code or link" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste tracking code or link" /><button className="primary">Open tracking</button></form>
    {error && <p className="error-text" role="alert">{error}</p>}
  </main>
}
