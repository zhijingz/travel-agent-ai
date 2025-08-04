from agents.base_agent import BaseAgent
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import OllamaEmbeddings  # Updated import
from chromadb import PersistentClient
from chromadb.utils import embedding_functions  # For direct embedding function
from langchain.text_splitter import CharacterTextSplitter
import re

class DestinationAgent(BaseAgent):
    def __init__(self, pdf_path):
        super().__init__(
            name="DestinationExpert",
            description="Provides factual insights on travel destinations with conversation history support",
            avatar="travel_avatar.png"
        )
        self.pdf_path = pdf_path
        
        # Use native Chroma embedding function
        self.embedding_function = embedding_functions.OllamaEmbeddingFunction(
            url="http://localhost:11434/api/embeddings",
            model_name="nomic-embed-text"
        )
        
        self.loaded_destinations = set()
        self.client = PersistentClient(path="chroma_db")  # Simplified initialization
        
        self.collection = self.client.get_or_create_collection(
            name="destination_docs",
            embedding_function=self.embedding_function
        ) 

    def ensure_destination_loaded(self, destination):
        if destination.lower() in self.loaded_destinations:
            return True
            
        pdf_file = self.get_matching_pdf(destination)
        if not pdf_file:
            return False
            
        # Load and process PDF
        loader = PyPDFLoader(pdf_file)
        text_splitter = CharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
        docs = loader.load_and_split(text_splitter)
        
        # Add documents directly to Chroma
        for i, doc in enumerate(docs):
            self.collection.add(
                ids=f"doc_{i}_{destination}",
                documents=doc.page_content,
                metadatas={"destination": destination.lower()}
            )
        
        self.loaded_destinations.add(destination.lower())
        return True

    def get_matching_pdf(self, destination):
        """Find PDF matching destination (case-insensitive)"""
        dest_lower = destination.strip().lower()
        for fname in os.listdir(self.pdf_path):
            if fname.lower().endswith('.pdf'):
                base_name = os.path.splitext(fname)[0].lower()
                if base_name == dest_lower:
                    return os.path.join(self.pdf_path, fname)
        return None

    def is_followup(self, query, history):
        """Detect follow-up questions using linguistic cues"""
        if not history:
            return False
        return any(word in query.lower() for word in 
                 ['they', 'it', 'there', 'that', 'those', 'more', 'how about'])

    def make_standalone_query(self, current_query, history):
        """Rewrite follow-up questions to standalone format"""
        if not history or not self.is_followup(current_query, history):
            return current_query
        
        # Format history for prompt
        history_str = "\n".join([f"User: {h['user']}\nBot: {h['bot']}" for h in history[-3:]])
        
        prompt = f"""
        Rewrite this follow-up question to be standalone using context:
        Chat History:
        {history_str}
        Follow-up: {current_query}
        Standalone question:"""
        return self.get_response(prompt, max_tokens=100).strip()

    def get_relevant_documents(self, query, history=None, destination=None):
        """Enhanced retrieval with follow-up handling and destination filter"""
        filter = {"destination": destination.lower()} if destination else None
        n_results = 5 if (history and self.is_followup(query, history)) else 3

        # Query ChromaDB collection directly
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=filter
        )
        # Chroma returns a dict with 'documents' as a list of lists
        docs = results['documents'][0] if results['documents'] else []
        # If you want to mimic doc.page_content, just return the strings
        return docs

    def query_pdf(self, destination, history=None, query=None):
        """Modified PDF query with contextual awareness"""
        # Ensure destination is loaded
        if not self.ensure_destination_loaded(destination):
            return ""
        
        # Use rewritten query if available
        effective_query = self.make_standalone_query(query or destination, history)
        
        # Retrieve context with history awareness
        docs = self.get_relevant_documents(
            effective_query, 
            history,
            destination=destination
        )
        pdf_context = "\n".join(docs)
        
        # Build context-aware prompt
        prompt = self.build_contextual_prompt(
            destination=destination,
            context=pdf_context,
            history=history,
            query=effective_query
        )
        
        return self.get_response(prompt)

    def build_contextual_prompt(self, destination, context, history, query):
        """Create conversation-aware prompt template"""
        return f"""
        **Conversation Context**
        Previous discussion: {self.summarize_history(history)}
        Current focus: {query}

        **Document Context**
        {context if context else "No specific location context available"}

        **Response Requirements**
        - Address follow-up aspects from conversation history
        - Highlight new information not previously mentioned
        - Maintain natural flow with previous exchanges
        - Include emojis relevant to key points
        - Italicize all info retrieved from local pdf file and nothing else 
        """
    
    def summarize_history(self, history):
        """Extract key entities from conversation history"""
        return ", ".join([h.get('user', '') for h in history[-2:]]) if history else "New conversation"

    def is_valid_destination(self, destination):
        if not destination:
            return False
        return destination.strip().casefold() in [c.casefold() for c in self.allowed_countries]

    def extract_destination(self, message):
        """Extract destination name from user message"""
        patterns = [
            r'tell me about (.+)',
            r'about (.+)',
            r'information on (.+)',
            r'guide me about (.+)',
            r'details on (.+)'
        ]
        for pattern in patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return message.strip()

    def greet(self, interest_type=None):
        if interest_type == "culture":
            return self.get_response(
                "Generate a suggestion of european countries for travelers interested in exploring culture/history/arts."
            )
        elif interest_type == "food":
            return self.get_response(
                "Generate a suggestion of european countries for travelers interested in exploring food/culinary/eating."
            )
        else:
            return self.get_response(
                "Generate a suggestion of european countries for travelers interested in exploring nature/hiking."
            )

    def get_destination_insights(self, destination, history=None, query=None, usePdf=False):
        """Main method with follow-up support"""
        if (usePdf):
            pdf_context = self.query_pdf(destination, history, query)
        else:
            pdf_context = ""
        
        prompt = f"""
        **Local Guide Context:**
        {pdf_context if pdf_context else "No local info available"}

        **Conversation History:**
        {history[-2:] if history else 'No recent history'}

        **Your Task:**
        Provide insights about {destination} including:
        - Cultural/historical context
        - Interesting historical fact/story
        - Best cities/attractions to visit
        - Ideal traveler profiles
        - Best time to visit

        Format with:
        - Markdown headers for sections
        - Bullet points for lists
        - Emojis for key points
        - Italics for local context details
        """
        return self.get_response(prompt)
