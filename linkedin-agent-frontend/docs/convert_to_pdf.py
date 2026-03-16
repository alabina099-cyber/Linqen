import markdown2
from weasyprint import HTML, CSS
import sys

def markdown_to_pdf(md_file, pdf_file):
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        html_content = markdown2.markdown(md_content, extras=['tables', 'fenced-code-blocks', 'header-ids'])
        
        css = CSS(string='''
            @page {
                size: A4;
                margin: 2cm;
            }
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                font-size: 11pt;
            }
            h1 {
                color: #1a1a1a;
                font-size: 24pt;
                margin-top: 20pt;
                margin-bottom: 12pt;
                border-bottom: 2px solid #0066cc;
                padding-bottom: 8pt;
            }
            h2 {
                color: #0066cc;
                font-size: 18pt;
                margin-top: 16pt;
                margin-bottom: 10pt;
            }
            h3 {
                color: #0088cc;
                font-size: 14pt;
                margin-top: 12pt;
                margin-bottom: 8pt;
            }
            h4 {
                color: #333;
                font-size: 12pt;
                margin-top: 10pt;
                margin-bottom: 6pt;
                font-weight: bold;
            }
            p {
                margin-bottom: 8pt;
                text-align: justify;
            }
            ul, ol {
                margin-bottom: 10pt;
                padding-left: 20pt;
            }
            li {
                margin-bottom: 4pt;
            }
            table {
                border-collapse: collapse;
                width: 100%;
                margin: 12pt 0;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8pt;
                text-align: left;
            }
            th {
                background-color: #0066cc;
                color: white;
                font-weight: bold;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            code {
                background-color: #f4f4f4;
                padding: 2pt 4pt;
                border-radius: 3pt;
                font-family: 'Courier New', monospace;
                font-size: 10pt;
            }
            pre {
                background-color: #f4f4f4;
                padding: 10pt;
                border-radius: 5pt;
                overflow-x: auto;
                margin: 10pt 0;
            }
            pre code {
                background-color: transparent;
                padding: 0;
            }
            strong {
                color: #0066cc;
                font-weight: bold;
            }
            hr {
                border: none;
                border-top: 1px solid #ddd;
                margin: 16pt 0;
            }
            blockquote {
                border-left: 4px solid #0066cc;
                padding-left: 12pt;
                margin-left: 0;
                color: #666;
                font-style: italic;
            }
        ''')
        
        html_template = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>PRD - LinkedIn Agent</title>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        '''
        
        HTML(string=html_template).write_pdf(pdf_file, stylesheets=[css])
        print(f"PDF créé avec succès: {pdf_file}", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"Erreur lors de la conversion: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = markdown_to_pdf("PRD_LinkedIn_Agent.md", "PRD_LinkedIn_Agent.pdf")
    if success:
        print("✅ Conversion terminée avec succès!")
    else:
        print("❌ Échec de la conversion")
