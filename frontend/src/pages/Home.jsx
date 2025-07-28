import { Link } from 'react-router-dom';
import Chat from '../components/Chat';

function Home() {
  const initialMessage =
    "Hello! I'm DestinationAgent, your travel specialist. I can provide cultural insights, safety tips, and local customs for any destination! My expertise is in Europe but ask me about anything!";

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[100vh] w-full">
        <img
          src="src/assets/sea.jpg"
          alt="Beautiful sea"
          className="absolute inset-0 w-full h-full object-cover opacity-90 brightness-120 z-0"
          draggable="false"
        />
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl px-8 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-yellow-200 drop-shadow-lg">
            Plan your holiday today!
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-6 drop-shadow">
            Have some destinations in mind but don't want to do the homework?
          </p>
          <Link
            to="/Destination"
            className="inline-block mt-4 px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg shadow hover:bg-blue-800 transition"
          >
            Meet our Agents
          </Link>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 to-gray-900/90 z-0" />
      </section>

      {/* Agents Section */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-yellow-200 mb-2">Our two favorites</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our experts are here to help you with every step of your travel planning.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* DestinationAgent Card */}
          <div className="bg-gray-800 rounded-xl shadow-xl p-8 flex flex-col items-center transition-transform hover:scale-105">
            <div className="mb-4 bg-blue-700 text-white w-16 h-16 flex items-center justify-center rounded-full text-2xl font-bold shadow-lg">
              DA
            </div>
            <h5 className="text-2xl font-semibold mb-2 text-blue-200">DestinationAgent</h5>
            <p className="text-gray-400 mb-6 text-center">
              Provides cultural insights, safety tips, and local customs for destinations.
            </p>
            <Link
              to="/Destination"
              className="mt-auto px-5 py-2 border border-blue-400 text-blue-400 rounded-md hover:bg-blue-900 transition-colors font-medium"
            >
              Ask about destinations
            </Link>
          </div>
          {/* ItineraryAgent Card */}
          <div className="bg-gray-800 rounded-xl shadow-xl p-8 flex flex-col items-center transition-transform hover:scale-105">
            <div className="mb-4 bg-pink-600 text-white w-16 h-16 flex items-center justify-center rounded-full text-2xl font-bold shadow-lg">
              IA
            </div>
            <h5 className="text-2xl font-semibold mb-2 text-pink-200">ItineraryAgent</h5>
            <p className="text-gray-400 mb-6 text-center">
              Creates detailed travel plans with daily schedules and recommendations.
            </p>
            <Link
              to="/Destination"
              className="mt-auto px-5 py-2 border border-pink-400 text-pink-400 rounded-md hover:bg-pink-900 transition-colors font-medium"
            >
              Plan your trip
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
