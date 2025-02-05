from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
from docx import Document
from PyPDF2 import PdfReader

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

def convert_pdf(file_path):
    """Convert PDF to text."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

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

        # Create prompt for OpenAI
        prompt = f"""Please analyze this essay according to the given rubric.
        
        RUBRIC:
        {rubric_text}

        ESSAY:
        {essay_text}

        Please provide:
        1. A numerical score for each rubric criterion (out of 100)
        2. Specific feedback and suggestions for each criterion
        3. Overall score (out of 100) formatted exactly as $SCORE$ (e.g., $85$)
        4. General feedback and areas for improvement

        Format your response as follows:
        CRITERION_NAME: [score]/100
        Feedback: [your feedback]

        OVERALL SCORE: $[score]$
        
        GENERAL FEEDBACK:
        [your feedback]

        IMPORTANT: Make sure to format the overall score within dollar signs, like this: $85$
        """
        # Call OpenAI API
        completion = client.chat.completions.create(
            model="gpt-4o-mini",  # or your preferred model
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert essay evaluator. Provide detailed, constructive feedback based on the given rubric."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ]
        )

        # Extract and structure the response
        feedback = completion.choices[0].message.content

        return jsonify({
            'success': True,
            'feedback': feedback
        })

    except Exception as e:
        print(f"Error: {str(e)}")  # For debugging
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)