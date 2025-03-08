from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
from docx import Document
from PyPDF2 import PdfReader
import json
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize OpenAI client
client = OpenAI()

# File conversion functions
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

def convert_pdf(file_path):
    """Convert PDF to text."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def convert_docx(file_path):
    """Convert DOCX to text."""
    doc = Document(file_path)
    text = [paragraph.text for paragraph in doc.paragraphs]
    return '\n'.join(text)

def convert_txt(file_path):
    """Convert TXT to text."""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def extract_rubric_criteria(rubric_text):
    """
    Extract rubric criteria from the rubric text using the OpenAI API.
    The API is prompted to return each criterion on a new line in the following format:
    **Criterion Name**: Description of the criterion.
    """
    prompt = f"""You are an AI that extracts and structures rubric criteria from text.
Given the following rubric text, extract each criterion in the following format:
**Criterion Name**: Description of the criterion.
Each criterion should be on its own line.
Rubric text:
{rubric_text}
"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    output = response.choices[0].message.content
    
    # Parse the output using regex: find lines formatted as "**Criterion Name**: Description"
    criteria = []
    pattern = r"\*\*(.*?)\*\*\s*:\s*(.+)"
    matches = re.findall(pattern, output)
    for match in matches:
        criterion_name = match[0].strip()
        description = match[1].strip()
        criteria.append({
            "criterion_name": criterion_name,
            "description": description
        })
    return criteria


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

        # Convert files to text
        essay_text = convert_to_text(essay_path)
        rubric_text = convert_to_text(rubric_path)

        # Clean up temporary files
        os.remove(essay_path)
        os.remove(rubric_path)

        # First, generate an overall analysis for the essay
        overall_prompt = f"""Please analyze the following essay overall based on the rubric provided.

Rubric:
{rubric_text}

Essay:
{essay_text}

Please provide:
1. An overall numerical score for the essay (out of 100).
2. General feedback and suggestions for improvement.

Format your response using the following structure:
**Overall Analysis**: [score]/100
Feedback: [your overall feedback here]

Ensure the response is formatted exactly as specified. In the feedback, don't make any bullet points or 
listing points using numbers like 1. 2. 3., just write text!!!
"""
        overall_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert essay evaluator."},
                {"role": "user", "content": overall_prompt}
            ],
            temperature=0.2,
            max_tokens=800
        )
        overall_feedback_text = overall_response.choices[0].message.content.strip()

        # Extract individual rubric criteria using the updated extraction function
        criteria_list = extract_rubric_criteria(rubric_text)
        full_feedback_text = overall_feedback_text + "\n\n"

        # Process each rubric criterion separately
        for criterion in criteria_list:
            criterion_name = criterion.get("criterion_name", "Unnamed Criterion")
            description = criterion.get("description", "No description provided.")
            print(f"Analyzing criterion: {criterion_name}")
            print(f"Description: {description}")

            prompt = f"""Please analyze the following essay based on the rubric criterion below.

Rubric Criterion: {criterion_name}
Description: {description}

Essay:
{essay_text}

Please provide:
1. A numerical score for this criterion (out of 100).
2. Specific feedback and suggestions for improvement.

Format your response using the following structure:
**{criterion_name}**: [score]/100
Feedback: [your feedback here]

Ensure the response is formatted exactly as specified. In the feedback, don't make any bullet points or 
listing points using numbers like 1. 2. 3., just write text!!!
"""
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert essay evaluator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=800
            )
            feedback_text = response.choices[0].message.content.strip()
            full_feedback_text += feedback_text + "\n\n"

        return jsonify({
            'success': True,
            'feedback': full_feedback_text.strip()
        })

    except Exception as e:
        print(f"Error: {str(e)}")
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