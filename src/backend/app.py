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
    and structure the grading criteria and their respective scoring levels EXACTLY as they appear in the original rubric.

    Given the following essay grading rubric:

    {rubric_text}

    CRITICALLY IMPORTANT INSTRUCTIONS:
    1. Extract ONLY the main criteria that are explicitly defined as rows in the rubric table.
    2. DO NOT create or infer additional criteria that don't exist in the original rubric.
    3. DO NOT separate subcategories or descriptions as distinct criteria.
    4. For each criterion, include ONLY the specific score levels that are defined in the rubric.
    5. The score "Value" field must be the numerical value (e.g., 4, 3, 2, 1).
    6. If the rubric contains multiple distinct sections (like separate rubrics for different assignments), 
       treat them as separate criteria with their own respective scoring scales.
    7. A criterion is typically a row in a rubric table with its own title and scoring descriptions.
    
    Return the output in this exact JSON format:

    {{
        "Criteria": [
            {{
                "Name": "Exact Criterion Name from Rubric",
                "Scores": [
                    {{"Score": "Highest Score Label", "Description": "Description for highest score", "Value": highest_numeric_value}},
                    {{"Score": "Next Score Label", "Description": "Description for next score", "Value": next_numeric_value}},
                    ...and so on for all score levels
                ]
            }},
            ...repeat for each criterion...
        ]
    }}
    """
    
    print("\nDEBUG: Sending rubric extraction prompt to OpenAI...")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Consider using gpt-4o for complex rubrics
            messages=[
                {"role": "system", "content": "You are a precise document structure analyzer specializing in educational rubrics. Your task is to extract the exact criteria and scoring levels from rubrics without adding, splitting, or modifying the original structure. Return only valid JSON with no explanatory text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Lower temperature for more deterministic results
            response_format={"type": "json_object"}
        )

        structured_rubric = response.choices[0].message.content
        
        # Validate JSON
        try:
            parsed_json = json.loads(structured_rubric)
            
            # Log the extracted criteria for debugging
            criteria = parsed_json.get("Criteria", [])
            print(f"\nDEBUG: Successfully extracted {len(criteria)} criteria")
            
            if criteria:
                # Print names of extracted criteria
                criteria_names = [criterion.get("Name", "Unnamed") for criterion in criteria]
                print(f"\nDEBUG: Extracted criteria: {', '.join(criteria_names)}")
                
                # Check if Value field exists in all scores
                for criterion in criteria:
                    scores = criterion.get("Scores", [])
                    if not all("Value" in score for score in scores):
                        print(f"\nDEBUG: Missing Value field in criterion: {criterion.get('Name')}")
                        # Add Value field if missing
                        for i, score in enumerate(scores):
                            if "Value" not in score and "Score" in score:
                                try:
                                    # Try to extract numeric value from Score field
                                    score_text = score["Score"]
                                    numeric_val = int(''.join(filter(str.isdigit, score_text))) if any(c.isdigit() for c in score_text) else (len(scores) - i)
                                    score["Value"] = numeric_val
                                    print(f"Added Value {numeric_val} to {score_text}")
                                except:
                                    # Fallback to position-based value
                                    score["Value"] = len(scores) - i
            
            return json.dumps(parsed_json)
            
        except json.JSONDecodeError as e:
            print(f"\nDEBUG: Invalid JSON from OpenAI: {e}")
            return json.dumps({
                "Criteria": [
                    {
                        "Name": "Error in Rubric Extraction",
                        "Scores": [
                            {"Score": "Error", "Description": "Could not parse rubric format", "Value": 0}
                        ]
                    }
                ]
            })
            
    except Exception as e:
        print(f"\nDEBUG: Error calling OpenAI: {e}")
        return json.dumps({
            "Criteria": [
                {
                    "Name": "API Error",
                    "Scores": [
                        {"Score": "Error", "Description": f"API error: {str(e)}", "Value": 0}
                    ]
                }
            ]
        })

        

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
