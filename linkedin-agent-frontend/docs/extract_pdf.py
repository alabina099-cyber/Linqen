import PyPDF2
import sys

def extract_pdf_text(pdf_path):
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            print(f"Total pages: {num_pages}", file=sys.stderr)
            
            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                text += f"\n--- Page {page_num + 1} ---\n"
                text += page.extract_text()
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
