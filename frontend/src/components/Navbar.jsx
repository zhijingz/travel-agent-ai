import { Link } from 'react-router-dom'
import React, { useEffect, useState } from 'react'

export default function Navbar() {
  const [show, setShow] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 40) {
        setShow(true)
        setLastScrollY(window.scrollY)
        return
      }
      if (window.scrollY > lastScrollY) {
        setShow(false) // Scrolling down
      } else {
        setShow(true) // Scrolling up
      }
      setLastScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <nav
      className={`
        navbar fixed top-0 left-0 right-0 z-50 transition-transform duration-300
        ${show ? 'translate-y-0' : '-translate-y-full'}
        bg-gradient-to-b from-gray-900/70 to-gray-900/30 backdrop-blur-md
        shadow-lg
        text-gray-100 font-bold
      `}
      style={{ background: 'rgba(24, 28, 40, 0.7)' }}
    >
      <div className="flex-1">
        <h1 className="pl-4 text-[30px] tracking-tight font-extrabold text-blue-200 drop-shadow">
          TripSmart AI
        </h1>
      </div>
      <div className="flex-none px-3">
        <ul className="menu menu-horizontal px-6 gap-5 text-[17px]">
          <li className="rounded transition">
            <Link
              to="/"
              className="hover:bg-blue-800 hover:text-maize px-3 py-1 rounded transition"
            >
              Home
            </Link>
          </li>
          <li className="rounded transition">
            <Link
              to="/Destination"
              className="hover:bg-blue-800 hover:text-maize px-3 py-1 rounded transition"
            >
              Destination Finder
            </Link>
          </li>
          <li className="rounded transition">
            <Link
              to="/Itinerary/"
              className="hover:bg-blue-800 hover:text-maize px-3 py-1 rounded transition"
            >
              Itinerary Planner
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
