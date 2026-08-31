import React, { useState } from 'react'

export default function TrackLookup({ go }) {
  const [token, setToken] = useState('')
  const submit = event => { event.preventDefault(); if (token.trim()) go(`/track/${token.trim()}`) }
  return <main className="subpage centered-page track-lookup"><div className="eyebrow">ORDER TRACKING</div><h1>See where your order is.</h1><p>Paste the private tracking code from your Maxrez order confirmation.</p><form onSubmit={submit}><input autoFocus required value={token} onChange={e => setToken(e.target.value)} placeholder="Paste tracking code" /><button className="primary">Open tracking</button></form></main>
}
