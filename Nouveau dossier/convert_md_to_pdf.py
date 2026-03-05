from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib import colors
import re
import sys

def parse_markdown_to_pdf(md_file, pdf_file):
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        doc = SimpleDocTemplate(pdf_file, pagesize=A4,
                                rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            spaceBefore=20,
            borderWidth=2,
            borderColor=colors.HexColor('#0066cc'),
            borderPadding=8,
        )
        
        heading1_style = ParagraphStyle(
            'CustomHeading1',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#0066cc'),
            spaceAfter=10,
            spaceBefore=16,
        )
        
        heading2_style = ParagraphStyle(
            'CustomHeading2',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#0088cc'),
            spaceAfter=8,
            spaceBefore=12,
        )
        
        heading3_style = ParagraphStyle(
            'CustomHeading3',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#333333'),
            spaceAfter=6,
            spaceBefore=10,
            fontName='Helvetica-Bold',
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        )
        
        bullet_style = ParagraphStyle(
            'CustomBullet',
            parent=styles['BodyText'],
            fontSize=11,
            leftIndent=20,
            spaceAfter=4,
        )
        
        story = []
        
        lines = content.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                i += 1
                continue
            
            if line.startswith('# '):
                text = line[2:].strip()
                story.append(Paragraph(text, title_style))
                story.append(Spacer(1, 0.3*cm))
            
            elif line.startswith('## '):
                text = line[3:].strip()
                story.append(Paragraph(text, heading1_style))
                story.append(Spacer(1, 0.2*cm))
            
            elif line.startswith('### '):
                text = line[4:].strip()
                story.append(Paragraph(text, heading2_style))
                story.append(Spacer(1, 0.15*cm))
            
            elif line.startswith('#### '):
                text = line[5:].strip()
                story.append(Paragraph(text, heading3_style))
                story.append(Spacer(1, 0.1*cm))
            
            elif line.startswith('---'):
                story.append(Spacer(1, 0.5*cm))
            
            elif line.startswith('- ') or line.startswith('* '):
                text = '• ' + line[2:].strip()
                text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
                text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
                text = re.sub(r'`(.+?)`', r'<font face="Courier">\1</font>', text)
                text = text.replace('✅', '&#x2705;').replace('🔄', '&#x1F504;').replace('🚀', '&#x1F680;')
                text = text.replace('⭐', '&#x2B50;').replace('🔒', '&#x1F512;').replace('🎯', '&#x1F3AF;')
                text = text.replace('📊', '&#x1F4CA;').replace('📈', '&#x1F4C8;')
                story.append(Paragraph(text, bullet_style))
            
            elif line.startswith('|'):
                table_lines = [line]
                i += 1
                while i < len(lines) and lines[i].strip().startswith('|'):
                    table_lines.append(lines[i].strip())
                    i += 1
                i -= 1
                
                if len(table_lines) > 2:
                    table_data = []
                    for tline in table_lines:
                        if '---' not in tline:
                            cells = [cell.strip() for cell in tline.split('|')[1:-1]]
                            table_data.append(cells)
                    
                    if table_data:
                        t = Table(table_data)
                        t.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 11),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                        ]))
                        story.append(t)
                        story.append(Spacer(1, 0.3*cm))
            
            elif line.startswith('```'):
                code_lines = []
                i += 1
                while i < len(lines) and not lines[i].strip().startswith('```'):
                    code_lines.append(lines[i])
                    i += 1
                
                code_text = '<font face="Courier" size="9">' + '<br/>'.join(code_lines) + '</font>'
                story.append(Paragraph(code_text, body_style))
                story.append(Spacer(1, 0.2*cm))
            
            else:
                text = line
                text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
                text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
                text = re.sub(r'`(.+?)`', r'<font face="Courier">\1</font>', text)
                text = text.replace('✅', '&#x2705;').replace('🔄', '&#x1F504;').replace('🚀', '&#x1F680;')
                text = text.replace('⭐', '&#x2B50;').replace('🔒', '&#x1F512;').replace('🎯', '&#x1F3AF;')
                text = text.replace('📊', '&#x1F4CA;').replace('📈', '&#x1F4C8;')
                
                story.append(Paragraph(text, body_style))
            
            i += 1
        
        doc.build(story)
        print(f"✅ PDF créé avec succès: {pdf_file}", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la conversion: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = parse_markdown_to_pdf("PRD_LinkedIn_Agent.md", "PRD_LinkedIn_Agent.pdf")
    if success:
        print("✅ Conversion terminée avec succès!")
    else:
        print("❌ Échec de la conversion")
