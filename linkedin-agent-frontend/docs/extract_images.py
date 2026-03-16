import pdfplumber
from PIL import Image
import io
import sys

def extract_images_from_pdf(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Total pages: {len(pdf.pages)}", file=sys.stderr)
            
            for i, page in enumerate(pdf.pages):
                print(f"\nPage {i+1}:", file=sys.stderr)
                print(f"  Width: {page.width}, Height: {page.height}", file=sys.stderr)
                
                if hasattr(page, 'images') and page.images:
                    print(f"  Found {len(page.images)} images", file=sys.stderr)
                    for j, img in enumerate(page.images):
                        print(f"    Image {j+1}: {img}", file=sys.stderr)
                else:
                    print(f"  No images found", file=sys.stderr)
                
                im = page.to_image(resolution=150)
                im.save(f"page_{i+1}.png")
                print(f"  Saved as page_{i+1}.png", file=sys.stderr)
                
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    extract_images_from_pdf("LinkedIn_Agent_Standalone.pdf")
