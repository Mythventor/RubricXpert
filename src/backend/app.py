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
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    structured_rubric = response.choices[0].message.content 
    #print("\nDEBUG: OpenAI Rubric Response:", structured_rubric[:500])  # Print first 500 chars
    return structured_rubric  # This will be in JSON format

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

        for section in rubric_sections:
            criterion_name = section.get("Name", "Unnamed Criterion")
            scores = section.get("Scores", [])

            # Ensure 'scores' is a list and format properly
            rubric_formatted = "\n".join([
                f"- **Score {len(scores) - idx}:** {score.get('Description', 'No description')}"
                for idx, score in enumerate(scores) if isinstance(score, dict)
            ])
            
            print(f"Criterion: {criterion_name}\n{rubric_formatted}\n")
            # Extract numerical score values, sort them, and get the range
            score_values = sorted([
                score.get("Value") for score in scores if isinstance(score, dict) and isinstance(score.get("Value"), (int, float))
            ])

            # Ensure min_score and max_score are always assigned based on number of scores
            if score_values:
                min_score, max_score = score_values[0], score_values[-1]
            else:
                min_score, max_score = 1, len(scores)  # Set fallback to number of rubric levels

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

            # Call GPT-4 API for evaluation
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert essay evaluator. Provide structured, detailed feedback."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=800
            )

            # Extract response
            feedback = response.choices[0].message.content 
            print("\nDEBUG: GPT-4 Response Received:", feedback[:500])

            # Attempt to extract score using regex
            match = re.search(r'"score":\s*(\d)', feedback)
            score = int(match.group(1)) if match else None

            # Parse the JSON response from OpenAI
            try:
                feedback_json = json.loads(feedback)
            except json.JSONDecodeError:
                feedback_json = {"criterion": criterion_name, "score": score, "feedback": feedback.strip()}

            feedback_responses.append(feedback_json)
            print("START OF NEXT CRITERION-----")
        
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
