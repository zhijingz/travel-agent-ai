import React, { useState, useEffect, useRef } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Link } from 'react-router-dom';
import jsPDF from "jspdf";
import pink from '/src/assets/pink.jpg'

// --- Markdown rendering utility ---
const renderContent = (content) => {
  let formattedContent = content;

  // Headers (process from h6 to h1 to avoid conflicts)
  formattedContent = formattedContent.replace(/#{6}\s+(.*?)(?=\n|$)/g, "<h6>$1</h6>");
  formattedContent = formattedContent.replace(/#{5}\s+(.*?)(?=\n|$)/g, "<h5>$1</h5>");
  formattedContent = formattedContent.replace(/#{4}\s+(.*?)(?=\n|$)/g, "<h4>$1</h4>");
  formattedContent = formattedContent.replace(/#{3}\s+(.*?)(?=\n|$)/g, "<h3>$1</h3>");
  formattedContent = formattedContent.replace(/#{2}\s+(.*?)(?=\n|$)/g, "<h2>$1</h2>");
  formattedContent = formattedContent.replace(/#{1}\s+(.*?)(?=\n|$)/g, "<h1>$1</h1>");

  // Bold and Italic
  formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formattedContent = formattedContent.replace(/\*(.*?)\*/g, "<em>$1</em>");
  formattedContent = formattedContent.replace(/`(.*?)`/g, "<code>$1</code>");

  // Links
  formattedContent = formattedContent.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Process lists properly
  const lines = formattedContent.split('\n');
  let processedLines = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    // Handle unordered lists
    if (trimmedLine.match(/^\s*[-*+]\s/)) {
      if (!inUnorderedList) {
        processedLines.push('<ul>');
        inUnorderedList = true;
      }
      const listItem = trimmedLine.replace(/^\s*[-*+]\s*/, '');
      processedLines.push(`<li>${listItem}</li>`);
    }
    // Handle ordered lists
    else if (trimmedLine.match(/^\s*\d+\.\s/)) {
      if (!inOrderedList) {
        processedLines.push('<ol>');
        inOrderedList = true;
      }
      const listItem = trimmedLine.replace(/^\s*\d+\.\s*/, '');
      processedLines.push(`<li>${listItem}</li>`);
    }
    // Close lists when not a list item
    else {
      if (inUnorderedList) {
        processedLines.push('</ul>');
        inUnorderedList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      processedLines.push(line);
    }
  });

  // Close any remaining open lists
  if (inUnorderedList) processedLines.push('</ul>');
  if (inOrderedList) processedLines.push('</ol>');

  formattedContent = processedLines.join('\n');
  
  // Convert line breaks to paragraphs
  formattedContent = formattedContent.replace(/(?:\r?\n){2,}/g, "</p><p>");
  formattedContent = `<p>${formattedContent}</p>`;
  
  // Clean up empty paragraphs
  formattedContent = formattedContent.replace(/<p><\/p>/g, '');

  return { __html: formattedContent };
};


function StreamingResponse({ content, speed = 20 }) {
  const [linesToShow, setLinesToShow] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const lines = content ? content.split('\n') : [];

  useEffect(() => {
    if (!content) return;
    setLinesToShow(0);
    setStreaming(true);

    if (lines.length === 0) return;

    const timer = setInterval(() => {
      setLinesToShow((prev) => {
        if (prev < lines.length) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setStreaming(false);
          return prev;
        }
      });
    }, speed);

    return () => clearInterval(timer);
    // eslint-disable-next-line
  }, [content, speed]);

  // Only show lines up to linesToShow
  const visibleContent = lines.slice(0, linesToShow).join('\n');

  return (
    <div style={{ color: '#e6e6e6' }}>
      <div dangerouslySetInnerHTML={renderContent(visibleContent)} />
      {streaming && (
        <span style={{
          display: 'inline-block',
          width: '2px',
          backgroundColor: '#ff6b9d',
          animation: 'blink 1s infinite',
          marginLeft: '2px'
        }} />
      )}
    </div>
  );
}

function Itinerary() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const downloadItinerary = () => {
    if (!fullItinerary) return;
    
    // Convert markdown to plain text (remove markdown syntax)
    const plainText = fullItinerary
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1'); // Remove code
    
    const blob = new Blob([plainText], { 
      type: 'text/plain;charset=utf-8' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'itinerary.txt';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    destinations: [''],
    interests: '',
    tripType: 'city',
    pace: 3
  });
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [fullItinerary, setFullItinerary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const itineraryRef = useRef(null);

  useEffect(() => {
    if (itineraryRef.current && fullItinerary) {
      itineraryRef.current.scrollTop = itineraryRef.current.scrollHeight;
    }
  }, [fullItinerary]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDestinationChange = (index, value) => {
    const newDestinations = [...formData.destinations];
    newDestinations[index] = value;
    setFormData({ ...formData, destinations: newDestinations });
  };

  const handleAddDestination = () => {
    setFormData({
      ...formData,
      destinations: [...formData.destinations, '']
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!formData.origin) {
      setError('Please fill in the origin');
      return;
    }

    if (formData.tripType === 'city') {
      if (!formData.destination) {
        setError('Please fill in the destination');
        return;
      }
    } else {
      const validDestinations = formData.destinations.filter(d => d.trim() !== '');
      if (validDestinations.length === 0) {
        setError('Please fill at least one destination');
        return;
      }
    }

    if (!formData.interests) {
      setError('Please fill in your interests');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Please select travel dates');
      return;
    }

    setIsLoading(true);
    setError('');
    setFullItinerary(null);
    
    try {
      const formattedStart = startDate.toISOString().slice(0, 10);
      const formattedEnd = endDate.toISOString().slice(0, 10);
      
      const payload = {
        origin: formData.origin,
        ...(formData.tripType === 'city' ? { destination: formData.destination } : {}),
        interests: formData.interests,
        date_from: formattedStart,
        date_to: formattedEnd,
        trip_type: formData.tripType,
        destinations: formData.tripType === 'region' ? 
          formData.destinations.filter(d => d.trim() !== '') : 
          [formData.destination],
        pace: formData.pace
      };
      
      const response = await fetch(`${API_BASE_URL}/api/itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error;
        } catch (parseError) {
          errorText = await response.text();
        }
        throw new Error(errorText || 'Request failed');
      }
      
      const data = await response.json();
      setFullItinerary(data.itinerary);
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || 'Failed to create itinerary');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="relative text-gray-100 min-h-screen px-4 py-6">
      <img
        src={pink}
        className="fixed inset-0 w-full h-full object-cover opacity-60 brightness-70 -z-10"
        draggable="false"
      />
      <section className="flex flex-col items-center justify-center mb-16">
        
        <div className="max-w-lg mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-pink-300 mt-20">Plan Your Perfect Trip</h1>
          <p className="text-lg text-gray-200">
            Create a customized itinerary based on your travel preferences
          </p>
        </div>
        
        <div className={`shadow-lg overflow-hidden max-w-3xl bg-gray-800 rounded-xl w-full bg-gradient-to-b from-gray-900/70 to-gray-900/30 backdrop-blur-md
        shadow-lg
        text-gray-100 font-bold
      `}
      style={{ background: 'rgba(24, 28, 40, 0.7)' }}>
          <div className="p-6">
            <h5 className="text-xl font-semibold mb-2 text-pink-200">
              Travel Itinerary Planner
            </h5>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Origin Field */}
              <div>
                <label className="block mb-1 font-medium text-gray-300">Origin City*</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                  placeholder="Where are you traveling from?"
                  required
                />
              </div>
              
              {/* Trip Type Toggle */}
              <div>
                <label className="block mb-1 font-medium text-gray-300">Trip Type*</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      formData.tripType === 'city' 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                    onClick={() => setFormData({...formData, tripType: 'city'})}
                  >
                    Single City
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      formData.tripType === 'region' 
                        ? 'bg-pink-600 text-white' 
                        : 'bg-gray-700 text-gray-300'
                    }`}
                    onClick={() => setFormData({...formData, tripType: 'region'})}
                  >
                    Multi-City/Region
                  </button>
                </div>
              </div>
              
              {/* Destination Inputs */}
              {formData.tripType === 'city' ? (
                <div>
                  <label className="block mb-1 font-medium text-gray-300">Destination City*</label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                    placeholder="Where do you want to go?"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.destinations.map((dest, index) => (
                    <div key={index}>
                      <label className="block mb-1 font-medium text-gray-300">
                        Destination {index + 1}*
                      </label>
                      <input
                        type="text"
                        value={dest}
                        onChange={(e) => handleDestinationChange(index, e.target.value)}
                        className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter city or region"
                        required
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-pink-400 text-sm flex items-center"
                    onClick={handleAddDestination}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add another destination
                  </button>
                </div>
              )}
              
              {/* Date Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium text-gray-300">Start Date*</label>
                  <DatePicker
                    selected={startDate}
                    onChange={setStartDate}
                    className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-gray-300">End Date*</label>
                  <DatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
              </div>
              
              {/* Interests Field */}
              <div>
                <label className="block mb-1 font-medium text-gray-300">Interests*</label>
                <input
                  type="text"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., hiking, museums, food"
                  required
                />
              </div>
              
              {/* Pace Slider */}
              <div className="w-full">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-400 font-medium">Leisurely</span>
                  <span className="text-sm text-gray-400 font-medium">Fast-Paced</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.pace}
                  onChange={(e) => setFormData({...formData, pace: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
                <div className="mt-1 text-pink-300 text-sm font-semibold text-center">
                  {formData.pace === 1
                    ? 'Leisurely'
                    : formData.pace === 2
                    ? 'Relaxed'
                    : formData.pace === 3
                    ? 'Balanced'
                    : formData.pace === 4
                    ? 'Active'
                    : 'Fast-Paced'}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 disabled:bg-gray-600"
              >
                {isLoading ? 'Creating Itinerary...' : 'Generate Itinerary'}
              </button>
              
              {error && (
                <div className="p-3 bg-pink-900 text-pink-200 rounded-md">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Results Section */}
        {fullItinerary && (
          <div className="max-w-2xl mx-auto mb-16 mt-10 w-full">
            <div className="shadow-lg overflow-hidden w-full bg-gray-800 rounded-xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-pink-200">Your Travel Itinerary</h3>
                  <button
                    onClick={downloadItinerary}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                      <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                    </svg>
                    Download
                  </button>
                </div>
                
                <div 
                  ref={itineraryRef}
                  className="bg-gray-700 rounded-lg p-4 max-h-[50vh] overflow-y-auto"
                >
                  <StreamingResponse content={fullItinerary} speed={7} />
                </div>
              </div>
            </div>
          </div>
        )}

      



      </section>
    </div>
  );
}
export default Itinerary;
