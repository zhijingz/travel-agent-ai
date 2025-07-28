import praw
import spacy
from textblob import TextBlob
from agents.base_agent import BaseAgent
from dotenv import load_dotenv
import os

load_dotenv()  # Loads variables from .env into environment

client_id = os.getenv('REDDIT_CLIENT_ID')
client_secret = os.getenv('REDDIT_CLIENT_SECRET')
user_agent = os.getenv('REDDIT_USER_AGENT')


nlp = spacy.load("en_core_web_sm")

class ExpertAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="OnlineAdvisor",
            description="Scraps the web for real-time advice from other travelers and summarize response in helpful way",
            avatar="travel_avatar.png"
        )

    def extract_entities(self, text):
        doc = nlp(text)
        places = [ent.text for ent in doc.ents if ent.label_ in ["GPE", "LOC"]]
        return places

    def analyze_sentiment(self, text):
        blob = TextBlob(text)
        return blob.sentiment.polarity

    def scrape_reddit(self, location):
        reddit = praw.Reddit(client_id=client_id, client_secret=client_secret, user_agent=user_agent)
        print(list(reddit.subreddit('travel').hot(limit=1)))
        subreddit = reddit.subreddit('travel')
        posts = []
        for post in subreddit.search(location, limit=5):
            posts.append(post.title + " " + post.selftext)
        return posts

    def get_travel_insights(self, query, location):
        texts = self.scrape_reddit(location)
        prompt = f"Here is a collection of travel insights about {location} from reddit:"
        for text in texts:
            entities = self.extract_entities(text)
            sentiment = self.analyze_sentiment(text)
            keywords = ("tip", "advice")
            tips = [line.strip() for line in text.split('.') if any(word in line.lower() for word in keywords) and line.strip()]
            prompt += (
                f"Text: {text}\n"
                f"Places: {entities}\n"
                f"Sentiment: {sentiment}\n"
                f"Tips: {tips}\n"
            )
        prompt += f"""
        **Your Task** 
        Distill, from the full comments, the most informative sentence with advice or tips on traveling to {location}.
        Format these as short comments in double quotation marks and single lines. 
        Then use a uniform scale of emojis to rate the sentiment of the place.
        Finally give some summarizing tips.
        """
        return self.get_response(prompt)
