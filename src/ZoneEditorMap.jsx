import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const facility = [9.0320, 38.7469]
const colors = ['#c7232c', '#2369a8', '#b06b1b', '#4c8b5b', '#7953a6', '#bd5b86']

function coordinate(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function ZoneEditorMap({ zones, setZones }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef([])

  const updateZone = (id, changes) => setZones(current => current.map(zone => zone.id === id ? { ...zone, ...changes } : zone))

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(facility, 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    L.marker(facility, { icon: L.divIcon({ className: 'facility-map-pin', html: '<span>MAXREZ</span>', iconSize: [68, 24], iconAnchor: [34, 12] }) }).addTo(map).bindTooltip('Maxrez facility', { direction: 'top' })
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 80)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    layersRef.current.forEach(layer => layer.remove())
    layersRef.current = []
    zones.forEach((zone, index) => {
      const lat = coordinate(zone.center_lat, facility[0])
      const lng = coordinate(zone.center_lng, facility[1])
      const radiusKm = Math.max(.1, coordinate(zone.radius_km, 1))
      const color = colors[index % colors.length]
      const circle = L.circle([lat, lng], { radius: radiusKm * 1000, color, weight: 3, fillColor: color, fillOpacity: .11 }).addTo(map)
      const pin = L.marker([lat, lng], { draggable: true, icon: L.divIcon({ className: 'zone-map-pin', html: `<span>${index + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(map).bindTooltip(zone.name || `Zone ${index + 1}`, { direction: 'top' })
      const handle = L.marker([lat + radiusKm / 111.2, lng], { draggable: true, icon: L.divIcon({ className: 'zone-radius-handle', html: '<span></span>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(map).bindTooltip('Drag to resize radius', { direction: 'top' })
      pin.on('drag', event => { const position = event.target.getLatLng(); circle.setLatLng(position); handle.setLatLng([position.lat + radiusKm / 111.2, position.lng]) })
      pin.on('dragend', event => { const position = event.target.getLatLng(); updateZone(zone.id, { center_lat: Number(position.lat.toFixed(6)), center_lng: Number(position.lng.toFixed(6)) }) })
      handle.on('drag', event => { const center = circle.getLatLng(); const position = event.target.getLatLng(); circle.setRadius(center.distanceTo(position)); })
      handle.on('dragend', event => { const center = circle.getLatLng(); const position = event.target.getLatLng(); updateZone(zone.id, { radius_km: Number(Math.max(.1, center.distanceTo(position) / 1000).toFixed(1)) }) })
      layersRef.current.push(circle, pin, handle)
    })
    setTimeout(() => map.invalidateSize(), 80)
  }, [zones])

  return <div className="zone-editor-map"><div ref={containerRef} className="zone-editor-map-canvas" /><div className="zone-editor-map-help"><b>Drag a numbered pin</b><span>to move a zone</span><b>Drag the small handle</b><span>to resize its radius</span></div></div>
}
