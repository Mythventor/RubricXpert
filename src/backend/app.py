from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
from docx import Document
from PyPDF2 import PdfReader
import re
import json
import concurrent.futures

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)


# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize OpenAI client
client = OpenAI()

# File conversion functions (from your existing code)
def convert_to_text(file_path):
    """Convert a document file to text."""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    try:
        if file_extension == '.pdf':
            return convert_pdf(file_path)
        elif file_extension == '.docx':
            return convert_docx(file_path)
        elif file_extension == '.txt':
            return convert_txt(file_path)
        else:
            return f"Unsupported file format: {file_extension}"
    except Exception as e:
        return f"Error converting file: {str(e)}"

import pdfplumber

def convert_pdf(file_path):
    """Extract rubric text from a PDF while preserving structure."""
    text = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text.strip())  # Strips unnecessary spaces
    
    final_text = "\n\n".join(text)  # Keep paragraphs separate
    print(final_text)  # Debugging print
    return final_text
"""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text.append(page_text)  # store extracted text from each page
    final_text = " ".join(text) # join all pages into one text block
    print(final_text)
    return final_text
"""

def convert_docx(file_path):
    """Convert DOCX to text."""
    doc = Document(file_path)
    text = []
    for paragraph in doc.paragraphs:
        text.append(paragraph.text)
    return '\n'.join(text)

def convert_txt(file_path):
    """Convert TXT to text."""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()
    
def extract_rubric_from_text(rubric_text):
    """Uses OpenAI API to extract and structure the rubric properly."""

    prompt = f"""
    You are an AI trained to analyze essay grading rubrics. Your task is to extract 
    and structure the grading criteria and their respective scoring levels in a JSON format.

    Given the following essay grading rubric:

    {rubric_text}

    Extract the grading criteria and their descriptions, returning the output in JSON format like this:

    {{
        "Criteria": [
            {{
                "Name": "Criterion Name",
                "Scores": [
                    {{"Score": 5, "Description": "Description for score 5"}},
                    {{"Score": 4, "Description": "Description for score 4"}},
                    {{"Score": 3, "Description": "Description for score 3"}},
                    {{"Score": 2, "Description": "Description for score 2"}},
                    {{"Score": 1, "Description": "Description for score 1"}}
                ]
            }},
            ...
        ]
    }}
    Make sure to extract all relevant details while preserving clarity.
    """
    print("\nDEBUG: Sending rubric extraction prompt to OpenAI...")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a JSON formatting assistant. Only output valid JSON with no additional text."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"}
    )

    structured_rubric = response.choices[0].message.content 
    #print("\nDEBUG: OpenAI Rubric Response:", structured_rubric[:500])  # Print first 500 chars
    return structured_rubric  # This will be in JSON format

def evaluate_criterion(section, essay_text, client):
    criterion_name = section.get("Name", "Unnamed Criterion")
    scores = section.get("Scores", [])

    rubric_formatted = "\n".join([
        f"- **Score {len(scores) - idx}:** {score.get('Description', 'No description')}"
        for idx, score in enumerate(scores) if isinstance(score, dict)
    ])

    print(f"[DEBUG] Rubric for '{criterion_name}':\n{rubric_formatted}")

    score_values = sorted([
        score.get("Value") for score in scores if isinstance(score, dict) and isinstance(score.get("Value"), (int, float))
    ])

    min_score, max_score = (score_values[0], score_values[-1]) if score_values else (1, len(scores))

    prompt = f"""
    You are an AI trained to evaluate essays using a structured grading rubric.

    ### Essay to Evaluate:
    {essay_text}

    ### Grading Criterion: {criterion_name}

    The essay will be scored based on the following standards:
    {rubric_formatted}

    **Task:** Evaluate the essay based on this criterion. Provide:
    1. The most appropriate score ({min_score} to {max_score}).
    2. Justification for the given score.
    3. Suggestions on how to improve the essay to achieve a higher score.

    Respond in the following JSON format:
    {{
        "criterion": "{criterion_name}",
        "score": ({min_score}-{max_score}),
        "feedback": "Your feedback explanation."
    }}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert essay evaluator. Provide structured, detailed feedback."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=800
        )

        feedback = response.choices[0].message.content

        # Try parsing JSON response
        try:
            feedback_json = json.loads(feedback)
        except json.JSONDecodeError:
            # Fallback parsing
            match = re.search(r'"score":\s*(\d)', feedback)
            score = int(match.group(1)) if match else None
            feedback_json = {"criterion": criterion_name, "score": score, "feedback": feedback.strip()}

        return feedback_json

    except Exception as e:
        print(f"Error while evaluating criterion '{criterion_name}': {e}")
        return {"criterion": criterion_name, "score": None, "feedback": f"Error: {str(e)}"}

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'API is working!'})

@app.route('/analyze', methods=['POST'])
def analyze_essay():
    try:
        if 'essay' not in request.files or 'rubric' not in request.files:
            return jsonify({'error': 'Missing files'}), 400

        essay_file = request.files['essay']
        rubric_file = request.files['rubric']

        # Save files temporarily
        essay_path = os.path.join(UPLOAD_FOLDER, secure_filename(essay_file.filename))
        rubric_path = os.path.join(UPLOAD_FOLDER, secure_filename(rubric_file.filename))
        
        essay_file.save(essay_path)
        rubric_file.save(rubric_path)

        essay_text = convert_to_text(essay_path)
        rubric_text = convert_to_text(rubric_path)
        rubric_parsed = extract_rubric_from_text(rubric_text)

        # Ensure temp files are removed safely
        if os.path.exists(essay_path):
            os.remove(essay_path)
        if os.path.exists(rubric_path):
            os.remove(rubric_path)

        # Split rubric into sections
        # ✅ Step 1: Convert JSON string to a Python dictionary
        try:
            rubric_json = json.loads(rubric_parsed)  # Parse the JSON
            rubric_sections = rubric_json.get("Criteria", [])  # Extract "Criteria" safely
        except json.JSONDecodeError as e:
            print("\nDEBUG: Failed to parse rubric JSON:", str(e))
            rubric_sections = []  # Handle parsing failure

        feedback_responses = []
        print("DEBUG: Analyzing Essay Based on Rubric")

        # Parallel processing of rubric sections
        feedback_responses = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:  # Adjust workers as needed
            futures = [executor.submit(evaluate_criterion, section, essay_text, client) for section in rubric_sections]

            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    feedback_responses.append(result)
                except Exception as e:
                    print(f"Error during criterion evaluation: {e}")

        print("\nDEBUG: Final Combined Feedback JSON:")
        print(json.dumps(feedback_responses, indent=4))

        return jsonify({
            'success': True,
            'results': feedback_responses
        })

    except Exception as e:
        print(f"Server Error: {str(e)}")  # Debug print
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/chat', methods=['POST'])
def handle_chat_message():
   try:
       data = request.json
       if not data or 'message' not in data:
           return jsonify({'error': 'Missing message'}), 400


       user_message = data['message']
       feedback_context = data.get('feedback', '')
       chat_history = data.get('chatHistory', [])


       # Format the chat history for the OpenAI API
       formatted_history = []
       for msg in chat_history:
           role = "user" if msg.get('user', False) else "assistant"
           formatted_history.append({"role": role, "content": msg['message']})


       # Create system prompt
       system_prompt = f"""You are an expert essay evaluator assistant.
        Your task is to clarify and explain feedback given on an essay.


        FEEDBACK CONTEXT:
        {feedback_context}


        Provide helpful, concise explanations about the feedback. If the student asks for improvement suggestions, provide specific, actionable advice based on the feedback context.
        """
       messages = [{"role": "system", "content": system_prompt}]
       messages.extend(formatted_history)
       messages.append({"role": "user", "content": user_message})


       completion = client.chat.completions.create(
           model="gpt-4o-mini",
           messages=messages
       )
       assistant_response = completion.choices[0].message.content


       return jsonify({
           'success': True,
           'response': assistant_response
       })


   except Exception as e:
       print(f"Error in chat handler: {str(e)}")
       return jsonify({
           'success': False,
           'error': str(e)
       }), 500
   
if __name__ == '__main__':
    app.run(debug=True, port=5000)
