import { Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home.jsx';
import Destination from './pages/Destination.jsx';
import Itinerary from './pages/Itinerary.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/destination" element={<Destination />} />
        <Route path="/itinerary" element={<Itinerary />} />
      </Routes>
      <Footer />
    </>
  );
}


export default App;