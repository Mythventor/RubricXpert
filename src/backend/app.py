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
from transformers import AutoModel, AutoTokenizer, pipeline
from sentence_transformers import SentenceTransformer
import numpy as np
import torch
from concurrent.futures import ThreadPoolExecutor, as_completed

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

def warmup_longformer():
    print("\n⚙️ Warming up Longformer model...")
    dummy_input = longformer_tokenizer("Warm-up sentence.", return_tensors="pt", truncation=True, padding="max_length", max_length=512)
    with torch.no_grad():
        _ = longformer_model(**dummy_input)
    print("✅ Warm-up complete.")

# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ✅ Load Longformer for full-essay encoding (handles 4,096 tokens)
longformer_name = "allenai/longformer-large-4096"
longformer_tokenizer = AutoTokenizer.from_pretrained(longformer_name)
longformer_model = AutoModel.from_pretrained(longformer_name)

# Move model to GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
longformer_model.to(device)
print(f"✅ Longformer is now on device: {device}")

warmup_longformer()  # Warm it up once when app starts

# ✅ Load MiniLM for paragraph embeddings (helps track local context)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

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

def split_paragraphs_gpt(essay_text):
    """
    Uses GPT-4o to intelligently split essay into paragraphs based on logical flow.
    """
    print("\n🔄 Asking GPT-4o to split essay into logical paragraphs...")

    prompt = f"""
    You are an expert essay grader.

    Please analyze the following essay and split it into logical paragraphs.
    Pay attention to topic shifts and where natural breaks should occur.
    Return the output as a numbered list of paragraphs, like this:
    
    1. First paragraph content here.
    2. Second paragraph content here.
    3. Third paragraph content here.
    
    Only return the list of paragraphs — no extra commentary.

    Essay:
    {essay_text}
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=2000  # Increase this if essays are long
    )

    print("\n✅ GPT-4o returned split paragraphs.")  # Debug print

    # Optionally parse numbered list back into Python list (if needed)
    output = response.choices[0].message.content.strip()
    paragraphs = [p.split('. ', 1)[1] for p in output.split('\n') if p and '. ' in p]

    return paragraphs

from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity

from sklearn.preprocessing import normalize
# META-ANALYSIS PIPLINE
def compute_coherence_with_minilm(paragraphs):
    """
    Compute coherence between paragraphs using MiniLM (sentence-transformers).
    """
    #print("\n🔄 Computing coherence with MiniLM...")

    # Generate embeddings using MiniLM
    embeddings = embedding_model.encode(paragraphs)

    # Normalize for cosine similarity
    normalized_embeddings = normalize(embeddings)

    # Compute pairwise coherence between adjacent paragraphs
    coherence_scores = []
    for i in range(1, len(normalized_embeddings)):
        sim = cosine_similarity([normalized_embeddings[i-1]], [normalized_embeddings[i]])[0][0]
        coherence_scores.append(sim)

    avg_coherence = np.mean(coherence_scores) if coherence_scores else 0
    #print(f"✅ MiniLM Average Coherence: {avg_coherence:.2f}")

    return avg_coherence, coherence_scores

def convert_context_to_text(paragraph_embeddings, context_vectors, paragraphs):
    """
    Converts Longformer embeddings into structured, human-readable text for GPT,
    using both paragraph embeddings and accumulated context vectors.
    Also uses MiniLM for coherence checking (external to embeddings).
    """
    print("\n🔄 Converting paragraph embeddings and context vectors into structured text...")  # 🔹 Debug print

    # Combine paragraph embeddings with context vectors (mean of both)
    combined_embeddings = [
        (np.array(para_emb) + np.array(context_vec)) / 2
        for para_emb, context_vec in zip(paragraph_embeddings, context_vectors)
    ]

    # Reduce dimensions with PCA
    pca = PCA(n_components=5)
    reduced_vectors = pca.fit_transform(combined_embeddings)

    # Extract dominant features for each paragraph
    dominant_features = np.argmax(reduced_vectors, axis=1)

    # Compute coherence using MiniLM instead of Longformer embeddings
    avg_coherence, coherence_scores = compute_coherence_with_minilm(paragraphs)

    # Final accumulated context vector (last one) to be summarized
    final_context_vector = context_vectors[-1] if context_vectors else [0] * 1024

    # Generate structured summary
    summary = {
        "essay_theme": "Main ideas detected from context-aware embeddings.",
        "logical_flow": f"Average coherence (MiniLM-based): {avg_coherence:.2f}",
        "dominant_features": [f"Paragraph {i+1} focuses on feature {feat}" for i, feat in enumerate(dominant_features)],
        "coherence_issues": [f"Paragraph {i+1} and {i+2} may not connect well." if sim < 0.5 else "" for i, sim in enumerate(coherence_scores)],
        "context_summary_vector": f"Final accumulated context vector of length {len(final_context_vector)} (summarized as overall essay representation)."
    }

    #print("\n✅ Full Context-Aware Summary Generated:\n", summary)
    return summary


def encode_paragraphs_with_longformer(paragraphs):
    """Encodes each paragraph with Longformer and analyzes raw coherence."""
    
    context_dim = 1024
    context_vector = np.zeros((context_dim,))  # Used for context building (not coherence testing)
    context_vectors = []  # Store smoothed context vectors for other purposes

    paragraph_embeddings = []  # Store raw embeddings for coherence

    for idx, para in enumerate(paragraphs):
        print(f"\n🔹 Processing Paragraph {idx + 1}: {para[:60]}...")  

        tokens = longformer_tokenizer(para, return_tensors="pt", truncation=True, padding="max_length", max_length=512)
        tokens = {k: v.to(device) for k, v in tokens.items()}  # ✅ Move to GPU

        with torch.no_grad():
            outputs = longformer_model(**tokens)

        # Use mean pooling for better representation of paragraph
        para_embedding = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

        # Save raw paragraph embeddings for coherence
        paragraph_embeddings.append(para_embedding.tolist())

        # Also build smoothed context vector (for other context analysis purposes)
        alpha = 0.7  
        context_vector = alpha * context_vector + (1 - alpha) * para_embedding # recursive context formula
        context_vectors.append(context_vector.tolist())  

    # Convert raw paragraph embeddings to GPT-readable summary
    context_summary = convert_context_to_text(paragraph_embeddings, context_vectors, paragraphs)

    return context_summary  # Return both context and summary

def extract_essay_theme_gpt(essay_text):
    """
    Uses GPT to extract a clear, single-sentence essay theme.
    """
    print("\n🔄 Asking GPT to extract essay theme...")  # Debug print

    prompt = f"""
    You are an expert essay evaluator.

    Please read the following essay and write ONE sentence that clearly describes the main theme or central idea of the essay.

    Do NOT give a summary. Just ONE sentence that captures the overall theme.

    Essay:
    {essay_text}
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=150  # Short because we only want 1 sentence
    )

    return response.choices[0].message.content.strip()

def process_rubric_and_pipeline(essay_text, rubric_text):
    """
    Runs the full pipeline with parallelized meta-analysis:
    1. Splits essay into paragraphs (GPT-4o)
    2. Extracts essay theme (GPT-4o)
    3. Encodes paragraphs with Longformer
    4. Generates structured summary
    
    Args:
        essay_text (str): Full essay text.
        
    Returns:
        dict: Full pipeline output including structured summary, GPT theme, and paragraphs.
    """
    
    # Step 1: Parallel execution of paragraph splitting and theme extraction
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_rubric = executor.submit(extract_rubric_from_text, rubric_text)
        future_split = executor.submit(split_paragraphs_gpt, essay_text)
        future_theme = executor.submit(extract_essay_theme_gpt, essay_text)

        # Collect both results when ready
        rubric_parsed = future_rubric.result()
        paragraphs = future_split.result()
        theme = future_theme.result()
 
    # Step 2: Encode paragraphs using Longformer (contextual embeddings)
    context_summary = encode_paragraphs_with_longformer(paragraphs) 

    # Step 3: Return structured output
    result = {
        'rubric_parsed': rubric_parsed,
        "structured_summary": context_summary,
        "gpt_summary": theme,
        "paragraphs": paragraphs
    }

    return result

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

        

def evaluate_criterion(section, meta_result, client):
    criterion_name = section.get("Name", "Unnamed Criterion")
    scores = section.get("Scores", [])
    paragraphs = meta_result["paragraphs"]

    # Format rubric as readable list
    rubric_formatted = "\n".join([
        f"- **Score {len(scores) - idx}:** {score.get('Description', 'No description')}"
        for idx, score in enumerate(scores) if isinstance(score, dict)
    ]) 

    #print(f"[DEBUG] Rubric for '{criterion_name}':\n{rubric_formatted}")

    score_values = sorted([
        score.get("Value") for score in scores if isinstance(score, dict) and isinstance(score.get("Value"), (int, float))
    ])
    min_score, max_score = (score_values[0], score_values[-1]) if score_values else (1, len(scores))

    theme = meta_result["gpt_summary"]

    # ✅ Function to evaluate a single paragraph
    def evaluate_paragraph(idx, paragraph, paragraphs):
        # Extract meta elements safely
        dominant_feature = meta_result["structured_summary"]['dominant_features'][idx]
        coherence_issue = (
            meta_result["structured_summary"]['coherence_issues'][idx - 1]
            if idx > 0 and (idx - 1) < len(meta_result["structured_summary"]['coherence_issues']) and meta_result["structured_summary"]['coherence_issues'][idx - 1] != ""
            else "None"
        )
        prev_paragraph_summary = paragraphs[idx - 1][:150] + "..." if idx > 0 else "None"

        # GPT prompt for paragraph evaluation
        paragraph_prompt = f"""
        You are an AI trained to evaluate essays using a structured grading rubric.

        ### Essay Meta-Summary (your context):
        - **Theme**: {theme}
        - **Dominant Feature of this paragraph**: {dominant_feature}
        - **Previous Paragraph Summary**: {prev_paragraph_summary}
        - **Coherence Issue with previous paragraph**: {coherence_issue}

        ### Paragraph {idx + 1} to Evaluate:
        {paragraph}

        ### Grading Criterion:
        {criterion_name}

        ### Scoring Rubric:
        {rubric_formatted}

        ### TASK:
        Focus ONLY on evaluating **this paragraph** for the **'{criterion_name}'** criterion.

        DO NOT:
        - Evaluate other aspects of the essay.
        - Comment on overall essay quality or unrelated sections.

        DO:
        1. Give a score between {min_score} and {max_score}.
        2. Provide clear, focused feedback justifying the score.
        3. Suggest 1 specific actionable improvements, quoting from the essay text, tied to this criterion.

        ### RESPOND IN THIS JSON FORMAT ONLY:
        {{
            "paragraph": {idx + 1},
            "criterion": "{criterion_name}",
            "score": (number between {min_score}-{max_score}),
            "feedback": "Focused feedback for this paragraph and criterion.",
            "suggestions": [
                "Specific actionable suggestion 1."
            ]
        }}
        """

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert essay evaluator. Stay strictly on task."},
                    {"role": "user", "content": paragraph_prompt}
                ],
                temperature=0.2,
                max_tokens=600
            )
            return json.loads(response.choices[0].message.content)

        except Exception as e:
            print(f"Error on paragraph {idx + 1}: {e}")
            return {
                "paragraph": idx + 1,
                "criterion": criterion_name,
                "score": None,
                "feedback": f"Error analyzing paragraph: {e}"
            }

    # ✅ Parallel processing of paragraph evaluations
    paragraph_feedback = []
    with ThreadPoolExecutor(max_workers=5) as executor:  # Adjust as needed
        futures = [executor.submit(evaluate_paragraph, idx, paragraph, paragraphs) for idx, paragraph in enumerate(paragraphs)]
        for future in as_completed(futures): 
            paragraph_feedback.append(future.result())
 
    # ✅ Final summary aggregation using the paragraph feedback
    final_summary_prompt = f"""
You are an expert essay evaluator. Based on the following paragraph-by-paragraph evaluations for the criterion '{criterion_name}', write a final overall score and detailed summary for the entire essay under this criterion.

### Essay Meta-Summary (Context for Reference):
- **Theme**: {meta_result["gpt_summary"]}
- **Dominant Features by Paragraph**: {', '.join(meta_result["structured_summary"]['dominant_features'])}
- **Coherence Issues Noted**: {', '.join([issue for issue in meta_result["structured_summary"]['coherence_issues'] if issue]) if any(meta_result["structured_summary"]['coherence_issues']) else "None"}
- **Logical Flow (Average Coherence Score)**: {meta_result["structured_summary"]['logical_flow']}

### Paragraph Evaluations:
{json.dumps(paragraph_feedback, indent=2)}

---

### TASK — Follow **strictly and deeply**:

1. **Evaluate how well the essay meets '{criterion_name}' using the Scoring Rubric: {rubric_formatted}**. Focus entirely on what the rubric defines for this criterion and analyze how well the essay fulfills that. (DO NOT inclue score in summary)
2. **Use meta-summary insights (coherence, flow) ONLY if directly relevant to this criterion and scoring rubric**. Avoid addressing unrelated issues (e.g., don’t address organization when grading focus).
3. Provide **2-3 actionable, deeply text-based suggestions**:
    - Quote **precise phrases or moments** from at least 2-3 different paragraphs. 
    - Embed the suggestions as **natural parts of the analysis** (NO lists or bullet points).
    - For each suggestion:
        - (a) **Rewrite awkward, vague, or weak phrases fully** (e.g., "The author could write: '___'.").
        - (b) For weak word choice, give **two vivid, precise alternatives** (e.g., "'important' to 'pivotal' or 'crucial'").
        - (c) If flow/coherence undermines this criterion (e.g., it makes focus unclear or weakens voice), give a **model transition sentence** to solve it — but **do NOT address flow unless it affects this criterion**.
4. Avoid vague advice — be **precise, detailed, and fully grounded in essay text and rubric for this criterion**.
5. **End with a deep, insightful reflection fully tied to this criterion**:
    - Explicitly connect suggestions to **the essay’s theme**, showing how they strengthen this specific criterion (e.g., how voice, word choice, focus relate to the theme of resilience and colonization).
    - Explain how **clarity, precision, and emotional/analytical impact on the reader** will improve — but only as relevant to this criterion.
    - Reflect on how **readers will better understand, engage with, or emotionally connect to the essay** if this criterion is strengthened.
    - Be **specific and concrete** — avoid generic claims like "this will improve the essay" and **directly tie** to the purpose of the criterion.

---

### **Respond ONLY in this JSON (DO NOT inclue score in summary):**
{{
    "criterion": "{criterion_name}", 
    "summary_feedback": "Detailed, meta-aware analysis following all points above. Concrete examples from essay text required. (Escape all quotes, no line breaks inside this string)."
}}
"""
    # GPT API Call for final criterion summary
    try:
        final_response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a structured essay evaluator based off of meta-summary."},
                {"role": "user", "content": final_summary_prompt}
            ],
            temperature=0.2,
            max_tokens=600
        )
        final_feedback = json.loads(final_response.choices[0].message.content)
    except Exception as e:
        print(f"[ERROR] Final summary issue for criterion '{criterion_name}': {e}")
        final_feedback = {
            "criterion": criterion_name,
            "overall_score": None,
            "summary_feedback": f"Error during final summary: {e}"
        }

    # ✅ Return final structured output
    return {
        "criterion": criterion_name,
        "final_summary": final_feedback
    }
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

        # Ensure temp files are removed safely
        if os.path.exists(essay_path):
            os.remove(essay_path)
        if os.path.exists(rubric_path):
            os.remove(rubric_path)

        # STEP 1: Meta-analysis (you can replace this with your Longformer + MiniLM pipeline call)
        meta_result = process_rubric_and_pipeline(essay_text, rubric_text)
        #print(meta_result["gpt_summary"])
        #print(meta_result["structured_summary"])

        # Split rubric into sections
        rubric_parsed = meta_result["rubric_parsed"]
        # Step 1: Convert JSON string to a Python dictionary
        try:
            rubric_json = json.loads(rubric_parsed)  # Parse the JSON
            rubric_sections = rubric_json.get("Criteria", [])  # Extract "Criteria" safely
        except json.JSONDecodeError as e:
            print("\nDEBUG: Failed to parse rubric JSON:", str(e))
            rubric_sections = []  # Handle parsing failure

        feedback_responses = []
        print("DEBUG: Analyzing Essay Based on Rubric")

        # STEP 2: Parallel criterion evaluation
        print("DEBUG: Analyzing Essay Based on Rubric and Meta-Analysis")

        # Parallel processing of rubric sections
        feedback_responses = [] 
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:  # Adjust workers as needed
            futures = [executor.submit(evaluate_criterion, section, meta_result, client) for section in rubric_sections]

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

# @app.route('/chat', methods=['POST'])
# def handle_chat_message():
#    try:
#        data = request.json
#        if not data or 'message' not in data:
#            return jsonify({'error': 'Missing message'}), 400


#        user_message = data['message']
#        feedback_context = data.get('feedback', '')
#        chat_history = data.get('chatHistory', [])


#        # Format the chat history for the OpenAI API
#        formatted_history = []
#        for msg in chat_history:
#            role = "user" if msg.get('user', False) else "assistant"
#            formatted_history.append({"role": role, "content": msg['message']})


#        # Create system prompt
#        system_prompt = f"""You are an expert essay evaluator assistant.
#         Your task is to clarify and explain feedback given on an essay.


#         FEEDBACK CONTEXT:
#         {feedback_context}


#         Provide helpful, concise explanations about the feedback. If the student asks for improvement suggestions, provide specific, actionable advice based on the feedback context.
#         """
#        messages = [{"role": "system", "content": system_prompt}]
#        messages.extend(formatted_history)
#        messages.append({"role": "user", "content": user_message})


#        completion = client.chat.completions.create(
#            model="gpt-4o-mini",
#            messages=messages
#        )
#        assistant_response = completion.choices[0].message.content


#        return jsonify({
#            'success': True,
#            'response': assistant_response
#        })


#    except Exception as e:
#        print(f"Error in chat handler: {str(e)}")
#        return jsonify({
#            'success': False,
#            'error': str(e)
#        }), 500
   
if __name__ == '__main__':
    app.run(debug=True, port=5000)
