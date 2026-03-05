from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether
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
            fontSize=22,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=8,
            spaceBefore=15,
            fontName='Helvetica-Bold',
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#666666'),
            spaceAfter=12,
            spaceBefore=5,
            fontName='Helvetica-Oblique',
        )
        
        heading1_style = ParagraphStyle(
            'CustomHeading1',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#0066cc'),
            spaceAfter=8,
            spaceBefore=14,
            fontName='Helvetica-Bold',
            borderWidth=1,
            borderColor=colors.HexColor('#0066cc'),
            borderPadding=6,
            backColor=colors.HexColor('#f0f8ff'),
        )
        
        heading2_style = ParagraphStyle(
            'CustomHeading2',
            parent=styles['Heading2'],
            fontSize=13,
            textColor=colors.HexColor('#0088cc'),
            spaceAfter=6,
            spaceBefore=10,
            fontName='Helvetica-Bold',
        )
        
        heading3_style = ParagraphStyle(
            'CustomHeading3',
            parent=styles['Heading3'],
            fontSize=11,
            textColor=colors.HexColor('#333333'),
            spaceAfter=5,
            spaceBefore=8,
            fontName='Helvetica-Bold',
        )
        
        heading4_style = ParagraphStyle(
            'CustomHeading4',
            parent=styles['Heading3'],
            fontSize=10,
            textColor=colors.HexColor('#0066cc'),
            spaceAfter=4,
            spaceBefore=6,
            fontName='Helvetica-Bold',
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=10,
            alignment=TA_LEFT,
            spaceAfter=6,
            leading=14,
        )
        
        bullet_style = ParagraphStyle(
            'CustomBullet',
            parent=styles['BodyText'],
            fontSize=10,
            leftIndent=15,
            spaceAfter=3,
            leading=13,
        )
        
        code_style = ParagraphStyle(
            'CustomCode',
            parent=styles['Code'],
            fontSize=8,
            fontName='Courier',
            leftIndent=10,
            spaceAfter=4,
            backColor=colors.HexColor('#f4f4f4'),
            borderWidth=1,
            borderColor=colors.HexColor('#dddddd'),
            borderPadding=4,
        )
        
        story = []
        
        lines = content.split('\n')
        i = 0
        in_code_block = False
        code_lines = []
        
        while i < len(lines):
            line = lines[i].strip()
            
            if not line and not in_code_block:
                i += 1
                continue
            
            if line.startswith('```'):
                if not in_code_block:
                    in_code_block = True
                    code_lines = []
                else:
                    in_code_block = False
                    if code_lines:
                        code_text = '\n'.join(code_lines)
                        code_para = Paragraph(f'<font face="Courier" size="8">{code_text.replace("<", "&lt;").replace(">", "&gt;")}</font>', code_style)
                        story.append(code_para)
                        story.append(Spacer(1, 0.2*cm))
                i += 1
                continue
            
            if in_code_block:
                code_lines.append(line)
                i += 1
                continue
            
            if line.startswith('# '):
                text = line[2:].strip()
                story.append(Paragraph(text, title_style))
                story.append(Spacer(1, 0.2*cm))
            
            elif line.startswith('## '):
                text = line[3:].strip()
                if i > 0:
                    story.append(Spacer(1, 0.3*cm))
                story.append(Paragraph(text, heading1_style))
                story.append(Spacer(1, 0.15*cm))
            
            elif line.startswith('### '):
                text = line[4:].strip()
                story.append(Paragraph(text, heading2_style))
                story.append(Spacer(1, 0.1*cm))
            
            elif line.startswith('#### '):
                text = line[5:].strip()
                story.append(Paragraph(text, heading4_style))
                story.append(Spacer(1, 0.08*cm))
            
            elif line.startswith('---'):
                story.append(Spacer(1, 0.4*cm))
            
            elif line.startswith('- ') or line.startswith('* '):
                text = '• ' + line[2:].strip()
                text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
                text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
                text = re.sub(r'`(.+?)`', r'<font face="Courier" size="9">\1</font>', text)
                text = text.replace('✅', '&#x2705;').replace('⚠️', '&#x26A0;')
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
                        t = Table(table_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
                        t.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0066cc')),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 9),
                            ('FONTSIZE', (0, 1), (-1, -1), 8),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                            ('TOPPADDING', (0, 0), (-1, 0), 8),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ]))
                        story.append(t)
                        story.append(Spacer(1, 0.3*cm))
            
            else:
                text = line
                text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
                text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
                text = re.sub(r'`(.+?)`', r'<font face="Courier" size="9">\1</font>', text)
                text = text.replace('✅', '&#x2705;').replace('⚠️', '&#x26A0;')
                
                if text:
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
    success = parse_markdown_to_pdf("Open_Source_Tools_Stack.md", "Open_Source_Tools_Stack.pdf")
    if success:
        print("✅ Conversion terminée avec succès!")
    else:
        print("❌ Échec de la conversion")
