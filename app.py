import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Cache for fetched feed data to avoid excessive requests
feed_cache = {
    "data": None,
    "last_fetched": None
}

def clean_html_text(html):
    """Remove HTML tags to create plain text for tweets."""
    # Replace links with text (e.g. <a href="url">text</a> -> text (url))
    # Let's do a simple regex replacement for links
    text = re.sub(r'<a\s+href="([^"]+)"[^>]*>(.*?)</a>', r'\2 (\1)', html)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode common HTML entities
    entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    }
    for ent, val in entities.items():
        text = text.replace(ent, val)
    
    # Strip excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
    except urllib.error.URLError as e:
        print(f"Error fetching feed: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

    try:
        # Atom feed namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_data)
        
        entries = []
        for entry_node in root.findall('atom:entry', ns):
            title = entry_node.find('atom:title', ns)
            title_text = title.text if title is not None else "Unknown Date"
            
            updated = entry_node.find('atom:updated', ns)
            updated_text = updated.text if updated is not None else ""
            
            entry_id = entry_node.find('atom:id', ns)
            entry_id_text = entry_id.text if entry_id is not None else ""
            
            link = entry_node.find("atom:link[@rel='alternate']", ns)
            link_href = link.attrib.get('href', '') if link is not None else ""
            if not link_href:
                link = entry_node.find("atom:link", ns)
                link_href = link.attrib.get('href', '') if link is not None else ""
                
            content = entry_node.find('atom:content', ns)
            content_html = content.text if content is not None else ""
            
            # Decompose HTML content into logical update sub-items based on <h3> headers
            # Structure: <h3>Type</h3><p>Description</p>
            sub_items = []
            parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html, flags=re.IGNORECASE)
            
            if len(parts) > 1:
                # parts[0] is everything before the first <h3> (usually empty or spacer)
                for i in range(1, len(parts), 2):
                    item_type = parts[i].strip()
                    item_html = parts[i+1].strip() if i+1 < len(parts) else ""
                    
                    # Clean the html to get plain text for tweeting
                    plain_text = clean_html_text(item_html)
                    
                    sub_items.append({
                        "id": f"{entry_id_text}#sub-{i//2}",
                        "type": item_type,
                        "html": item_html,
                        "text": plain_text
                    })
            else:
                # Fallback if no <h3> tags
                plain_text = clean_html_text(content_html)
                sub_items.append({
                    "id": f"{entry_id_text}#sub-0",
                    "type": "General",
                    "html": content_html,
                    "text": plain_text
                })
                
            entries.append({
                "id": entry_id_text,
                "title": title_text,
                "updated": updated_text,
                "link": link_href,
                "updates": sub_items
            })
            
        return entries
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    releases = fetch_and_parse_feed()
    if releases is None:
        return jsonify({"error": "Failed to fetch or parse release notes feed"}), 500
    return jsonify(releases)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
