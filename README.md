# BigQuery Release Notes Tracker

A sleek, modern web application that fetches, parses, and formats the official Google Cloud BigQuery release notes. It decomposes daily updates into interactive, categorized cards (Features, Issues, Changes, Deprecations) and allows you to compile, draft, and post updates directly to Twitter/X.

## 🚀 Features

* **Sub-Item Decomposition:** Automatically parses complex HTML structures from the Google Atom feed, breaking single-day updates into individual category cards.
* **Premium Space-Black Theme:** Responsive layout styled with CSS glassmorphism, glowing custom variables, and micro-animations.
* **Selective Sharing:** Click cards to select them. A floating action bar tracks selection size, aggregates the text, and compiles it for a single Twitter/X draft.
* **Smart Twitter Composer:** Preview and edit drafts in-app. Features a real-time character validator (280-character limit check) and shares instantly via Twitter Web Intent.
* **Dynamic Search & Filtering:** Search by keywords or filter by update type (Feature, Issue, Change, etc.) in real-time.
* **Background Refresher:** Pulls fresh release notes asynchronously with a loading state, updating system metrics and the last-refreshed timestamp.

---

## 🛠️ Technology Stack

* **Backend:** Python 3.x, Flask
* **Frontend:** Vanilla HTML5, CSS3 (Variables, Gradients, Glassmorphic panels), JavaScript (ES6+ State Machine)
* **API Feed Source:** [BigQuery Release Notes XML Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)

---

## 📂 Directory Structure

```text
bq-releases-notes/
├── app.py                  # Flask application entry point (XML parsing logic)
├── templates/
│   └── index.html          # Main HTML structure
├── static/
│   ├── app.js              # Client state manager & event handlers
│   └── style.css           # Styling system & dark theme design
├── .gitignore              # Standard ignore configurations
└── README.md               # Project documentation (this file)
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have Python 3 installed. If you don't have Flask, install it using pip:
```bash
pip install flask
```

### 2. Run the Server
From the root directory of the project, run:
```bash
python app.py
```

The application will start in development debug mode on your local machine:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📦 Pushing to GitHub

If you want to upload this code to your own GitHub repository, execute the following commands in your terminal:

```bash
# Initialize local repo and make first commit
git init
git branch -M main
git add .
git commit -m "Initial commit of BigQuery Release Notes Tracker"

# Link to your remote repository (replace with your username)
git remote add origin https://github.com/<your-username>/antigravity-event-talks-app.git

# Push changes (force override if repo was initialized with README/License on GitHub)
git push -u origin main --force
```

---

## 🔒 License
Distributed under the MIT License. See the official repository files for details.
