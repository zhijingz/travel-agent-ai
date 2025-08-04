from flask import Flask, request, jsonify, session
from flask_cors import CORS
from agents import DestinationAgent, ItineraryAgent, ExpertAgent
import os
import re
import wave
import json

app = Flask(__name__, static_folder='dist', static_url_path='/') 
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-2023')
CORS(app, resources={r"/api/*": {"origins": "https://travel-agent-ai-production.up.railway.app"}})

from flask import send_from_directory

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


pdf_path = "agents/data/"
destination_agent = DestinationAgent(pdf_path=pdf_path)
expert_agent = ExpertAgent()

@app.route('/static/images/default_avatar.png')
@app.route('/static/images/default_project.jpg')
def block_default_images():
    response = app.make_response(
        b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;')
    response.headers['Content-Type'] = 'image/gif'
    response.headers['Cache-Control'] = 'public, max-age=31536000'
    response.headers['Expires'] = 'Thu, 31 Dec 2037 23:59:59 GMT'
    return response

@app.before_request
def make_session_permanent():
    session.permanent = True
    session.setdefault('history', [])

@app.route('/api/destination', methods=['POST'])
def destination_endpoint():
    data = request.json
    usePdf = data.get('usePdf', False)
    message = data.get('message', '')
    history = session['history'][-4:]
    
    # Determine interest type
    interest_type = None
    if any(k in message.lower() for k in ['culture', 'history', 'art']):
        interest_type = 'culture'
    elif any(k in message.lower() for k in ['food', 'eat']):
        interest_type = 'food'
    elif any(k in message.lower() for k in ['nature', 'hiking', 'green']):
        interest_type = 'nature'
    
    if interest_type:
        response = destination_agent.greet(interest_type)
    else:
        destination = destination_agent.extract_destination(message)
        response = destination_agent.get_destination_insights(
            destination=destination,
            history=history,
            query=message, 
            usePdf=usePdf
        )

    session['history'].append({"user": message, "bot": response})
    session.modified = True
    return jsonify({'response': response, 'destination': destination})

@app.route('/api/expert', methods=['POST'])
def expert_endpoint():
    data = request.json
    query = data.get('query', '')
    location = data.get('location', '')
    response = expert_agent.get_travel_insights(query=query, location=location)
    return jsonify(response)

'''
@app.route('/api/destination', methods=['POST'])

def destination_audio_endpoint():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    audio_file = request.files['audio']


    print('hi')
    # Save audio to a temporary file
    temp_path = "temp_audio.wav"
    audio_file.save(temp_path)

    file_size = os.path.getsize(temp_path)
    print(f"[DEBUG] Uploaded file size: {file_size} bytes")

    try:
        wf = wave.open(temp_path, "rb")
    except wave.Error as e:
        print(f"[DEBUG] wave.Error: {e}")
        os.remove(temp_path)
        return jsonify({"error": "Uploaded file is not a valid WAV file. Please ensure your browser records in WAV/PCM format."}), 400
    except Exception as e:
        print(f"[DEBUG] Unexpected error opening WAV: {e}")
        os.remove(temp_path)
        return jsonify({"error": "Unexpected error processing audio file."}), 500

    # Load Vosk model
    model_path = "vosk-model-en-us-0.22"
    if not os.path.exists(model_path):
        return jsonify({"error": "Vosk model not found"}), 500
    model = Model(model_path)

    # Open audio file and transcribe
    wf = wave.open(temp_path, "rb")
    rec = KaldiRecognizer(model, wf.getframerate())
    result_text = ""
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            res = json.loads(rec.Result())
            result_text += res.get("text", "")
    # Final partial result
    res = json.loads(rec.FinalResult())
    result_text += res.get("text", "")

    os.remove(temp_path)

    if not result_text.strip():
        return jsonify({"error": "No speech recognized"}), 400

    # Use the recognized text as the user message
    history = session['history'][-4:]
    destination = destination_agent.extract_destination(result_text)
    response = destination_agent.get_destination_insights(
        destination=destination,
        history=history,
        query=result_text
    )
    session['history'].append({"user": result_text, "bot": response})
    session.modified = True
    return jsonify({
        'transcript': result_text,
        'response': response
    })
'''

itinerary_agent = ItineraryAgent()

@app.route('/api/itinerary', methods=['POST'])
def itinerary_endpoint():
    data = request.json
    try:
        trip_type = data.get('trip_type', 'city')
        destinations = data.get('destinations', [])
        pace = data.get('pace', 3) 
        
        if not destinations and 'destination' in data:
            destinations = [data['destination']]
        
        if not destinations:
            return jsonify({"error": "At least one destination is required"}), 400
        if any(not d.strip() for d in destinations):
            return jsonify({"error": "Destination names cannot be empty"}), 400
        
        result = itinerary_agent.plan_trip(
            from_city=data['origin'],
            destinations=destinations,
            interests=data['interests'],
            date_from=data['date_from'],
            date_to=data['date_to'],
            pace=pace
        )
        return jsonify({'itinerary': result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5002, debug=True)
