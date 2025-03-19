# 📝 RubricXpert  

**RubricXpert** is an AI-powered essay analysis tool that provides **instant, detailed feedback** based on specific rubric criteria. It helps students refine their writing to meet high standards effortlessly.  

## 📌 About the Project  

RubricXpert enhances essay evaluation by mimicking human reading and analysis. It first builds a global understanding using Longformer encoders and refines coherence detection with MiniLM. GPT extracts the central theme, while rolling context preserves logical flow across paragraphs. Finally, GPT-4 generates nuanced, rubric-based feedback, ensuring deep, structured, and interactive suggestions. This multi-layered approach surpasses standard AI graders, delivering expert-level analysis efficiently.

---

## 🚀 Features  

- ✅ **Instant AI-Powered Essay Analysis** – Get immediate feedback on your writing.  
- ✅ **Rubric-Based Feedback System** – Ensure your work meets grading criteria.  
- ✅ **Detailed Improvement Suggestions** – Actionable insights to enhance writing quality.  
- ✅ **User-Friendly Interface** – Simple and intuitive design for easy navigation.  
- ✅ **Supports Multiple File Formats** – Upload and analyze essays in different formats.  

---

## 🏁 Getting Started  

### 📋 Prerequisites  

Before installing, ensure you have the following dependencies installed on your system:  

- **Node.js** (v14.0.0 or higher) – [Download](https://nodejs.org/)  
- **npm** (v6.0.0 or higher) – Installed with Node.js  

### 🔧 Installation  

```bash
# Clone the repository
git clone https://github.com/Mythventor/RubricXpert
cd rubricxpert

# Install dependencies
npm install

# Start the development server
npm run dev

# Backend (in a split/separate terminal)
cd src
cd backend

# Create a .env file and put in OPENAI_API_KEY=API_KEY_GOES HERE
# Ensure the OpenAI API Key is valid in the .env file

# Enter Python3 virtual environment:
python3 -m venv path/to/venv
source path/to/venv/bin/activate

# Install requirement
pip3 install -r requirements.txt

# Start
python3 app.py

# Enjoy the power of RubricXpert :)


```

# Contributors
* Mengpang Xing
* David Wang
* Zijian Wei
