from agno.agent import Agent
from agno.team import Team
from agno.models.groq import Groq
from agents.base_agent import BaseAgent
import os
import re

class ItineraryAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ItineraryPlanner",
            description="Seasoned travel planner with decades of experience",
            avatar="travel_avatar.png",
        )

    def plan_trip(self, from_city, destinations, interests, date_from, date_to, pace):
        # Validate inputs
        if not destinations:
            raise ValueError("No destinations provided")
        if any(not d.strip() for d in destinations):
            raise ValueError("Destination names cannot be empty")
        
        is_multi_city = len(destinations) > 1
        
        pace_descriptions = {
            1: "leisurely pace with minimal tourist sites",
            2: "relaxed pace with few tourist sites",
            3: "balanced mix of activities and relaxation",
            4: "active pace covering most key attractions",
            5: "fast-paced intensive sightseeing"
        }
        pace_description = pace_descriptions.get(pace, "balanced itinerary")

        # FIX: Safely map pace to categories
        print('pace')
        print(pace)
        
        pace_categories = ['non-touristy', 'mixed', 'must-see']
        pace_index = min(max(pace, 1), 3) - 1
        pace_category = pace_categories[pace_index]
        print(pace_index)
        
        destinations_str = ", ".join(destinations) if is_multi_city else destinations[0]
        
        prompt = f"""
            Plan a {'multi-city' if is_multi_city else 'single-destination'} trip from {from_city} to {destinations_str}
            Traveler interests: {interests}
            Dates: {date_from} to {date_to}
            Pace: {pace_description} (level {pace}/5)

            **Your Task:**
            Craft complete travel itineraries including:
            - City introduction (1 paragraph per city)
            - Daily schedule with time allocations
            - Restaurant recommendations
            - Transportation options between cities (if multi-city)
            - Estimated costs
            - Safety tips

            **Special Instructions:**
            - Adjust the density of activities based on pace: {pace_description}
            - For multi-city trips, include travel time and logistics between cities
            - Prioritize {pace_category} locations

            Format response in markdown with:
            # Section Headers
            - Bullet points for lists
            - Emojis for key points
            *Italics for local context details*
        """
        return self.get_response(prompt)
