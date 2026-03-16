import pdfplumber
import sys

def extract_pdf_text(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            print(f"Total pages: {num_pages}", file=sys.stderr)
            
            for i, page in enumerate(pdf.pages):
                text += f"\n--- Page {i + 1} ---\n"
                page_text = page.extract_text()
                if page_text:
                    text += page_text
                else:
                    text += "[No text found on this page]\n"
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None
    
    return text

if __name__ == "__main__":
    pdf_path = "LinkedIn_Agent_Standalone.pdf"
    content = extract_pdf_text(pdf_path)
    if content:
        with open("pdf_content.txt", "w", encoding="utf-8") as f:
            f.write(content)
        print("PDF content extracted successfully to pdf_content.txt", file=sys.stderr)
    else:
        print("Failed to extract PDF content", file=sys.stderr)
