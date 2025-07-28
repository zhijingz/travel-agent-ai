import { Link } from 'react-router-dom'; 
import Chat from '../components/Chat';
import React, { useState, useEffect, useRef } from 'react';
import { useMapEvent, MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import chat from 'daisyui/components/chat';

function MapClickHandler({ onMapClick }) {
  useMapEvent('click', (e) => {
    onMapClick(e);
  });
  return null;
}

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function FlyToLocation({ position }) {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      const offsetLat = position[0] + 0.13; 
      map.flyTo([offsetLat, position[1]], 10); // 10 is the zoom level
    }
  }, [position, map]);
  return null;
}

function StreamingResponse({ content, speed = 20 }) {
  const [linesToShow, setLinesToShow] = useState(0);
  const lines = content ? content.split('\n') : [];

  useEffect(() => {
    if (!content) return;
    setLinesToShow(0);

    if (lines.length === 0) return;

    const timer = setInterval(() => {
      setLinesToShow((prev) => {
        if (prev < lines.length) {
          return prev + 1;
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, speed);

    return () => clearInterval(timer);
  }, [content, speed]);

  return (
    <div style={{ whiteSpace: 'pre-wrap', marginTop: '1em' }}>
      {lines.slice(0, linesToShow).join('\n')}
    </div>
  );
}

function Destination() {
  const initialMessage =
  "Hello! I'm the local travel guide, your travel specialist. I can provide cultural insights, safety tips, and local customs for any destination! My expertise is in Europe but ask me about anything!";
  const [searchlocation, setLocation] = useState('');
  const [markers, setMarkers] = useState([]);
  const [advice, setAdvice] = useState({});
  const [loading, setLoading] = useState({});
  const [flyTo, setFlyTo] = useState(null);


  const handleChatLocation = async (chatLocation) => {
      if (!chatLocation) return;
      setLocation(chatLocation); // Optional: update input field
      await handleSearch(chatLocation); // Pass directly to geocoding and marker logic
    };
  const geocodeLocation = async (locationName) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  };
  const handleSearch = async (location) => {
    if (!location) return;
    const coords = await geocodeLocation(location);
    if (!coords) {
      alert('Location not found.');
      return;
    }
    setLoading({ [`${coords.lat},${coords.lng}`]: true });

    try {
      const res = await fetch('http://localhost:5002/api/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, query: 'travel' }),
      });
      const data = await res.json();
      const summaryText = typeof data === 'string' ? data : data.response || '';

      setMarkers(prev => [
        ...prev,
        { lat: coords.lat, lng: coords.lng, location, advice: summaryText }
      ]);
      setFlyTo([coords.lat, coords.lng]);
      
      setAdvice(prev => ({
        ...prev,
        [`${coords.lat},${coords.lng}`]: typeof data === 'string' ? data : data.response || ''
      }));
    } catch (err) {
      setAdvice(prev => ({
        ...prev,
        [`${coords.lat},${coords.lng}`]: 'Error fetching travel advice.'
      }));
    } finally {
      setLoading(prev => ({ ...prev, [`${coords.lat},${coords.lng}`]: false }));
    }
  };
    // Handle map click (optional: allow both input and map click)
  const handleMapClick = async (e) => {
    console.log("I have entered here")
    const { lat, lng } = e.latlng;
    const locString = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setFlyTo([lat, lng]);
    setLoading(prev => ({ ...prev, [`${lat},${lng}`]: true }));
    try {
      const res = await fetch('http://localhost:5002/api/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locString, query: 'travel' }),
      });
      const data = await res.json();
      const summaryText = typeof data === 'string' ? data : data.response || '';
      setMarkers(prev => [
        ...prev,
        { lat, lng, location: locString, advice: summaryText }
      ]);
    } catch (err) {
      setMarkers(prev => [
        ...prev,
        { lat, lng, location: locString, advice: 'Error fetching travel advice.' }
      ]);
    } finally {
      setLoading(prev => ({ ...prev, [`${lat},${lng}`]: false }));
    }
  };

return (
    <div className="relative text-gray-100 min-h-screen px-4 py-6">
      {/* Background Image with Overlay */}
      <img
        src="src/assets/trees.jpg"
        alt="Beautiful sea"
        className="fixed inset-0 w-full h-full object-cover opacity-60 brightness-70 -z-10"
        draggable="false"
      />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="mt-30 text-4xl font-extrabold text-blue-400 mb-2 drop-shadow-lg">
            Chat with our Tour Guide Agent
          </h1>
          <p className="text-lg text-gray-300 max-w-xl mx-auto">
            Get ideas for travel destinations based on your preferences!
          </p>
        </header>

        {/* Main Content Grid */}
        <div className="
            grid grid-cols-1 md:grid-cols-2 gap-2">
          {/*className="
            grid grid-cols-1 md:grid-cols-2 gap-2
            rounded-xl shadow-xl 
            bg-gradient-to-b from-gray-900/70 to-gray-900/30
            backdrop-blur-md
            p-6
          "
          style={{
            background: 'rgba(36, 35, 45, 0.2)',
            // You can adjust the rgba value for more/less opacity
          }}*/}
        
          {/* Chat Section */}
          <section className="flex flex-col items-center">
            <div className="w-full max-w-2xl shadow-lg rounded-lg overflow-hidden bg-gray-900 border border-gray-700">
              <Chat
                onLocationSearch={handleChatLocation}
                agentType="destination"
                initialMessage={initialMessage}
                agentInitials="DA"
              />
            </div>
          </section>

          {/* Map Section */}
          <section className="w-full h-[520px] rounded-lg overflow-hidden border border-gray-700 shadow-lg">
            <MapContainer
              className="w-full h-full"
              center={[20, 0]}
              zoom={2}
              whenCreated={(map) => map.invalidateSize()}
              // Use MapClickHandler to handle clicks
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {flyTo && <FlyToLocation position={flyTo} />}
              {markers.map(({ lat, lng, location, advice }, idx) => (
                <Marker key={idx} position={[lat, lng]} icon={markerIcon}>
                  <Popup minWidth={300} maxWidth={400}>
                    <div
                      className="w-full"
                      style={{ maxHeight: '200px', overflowY: 'auto', boxSizing: 'border-box' }}
                    >
                      <strong>{location}</strong>
                      <br />
                      {loading[`${lat},${lng}`] ? (
                        <span className="italic text-gray-400">Loading travel advice...</span>
                      ) : (
                        <StreamingResponse content={advice} speed={20} />
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Destination;
