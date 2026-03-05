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
        
        priority_critical = ParagraphStyle(
            'PriorityCritical',
            parent=styles['BodyText'],
            fontSize=11,
            textColor=colors.HexColor('#cc0000'),
            fontName='Helvetica-Bold',
            spaceAfter=6,
        )
        
        priority_important = ParagraphStyle(
            'PriorityImportant',
            parent=styles['BodyText'],
            fontSize=11,
            textColor=colors.HexColor('#ff9900'),
            fontName='Helvetica-Bold',
            spaceAfter=6,
        )
        
        priority_nice = ParagraphStyle(
            'PriorityNice',
            parent=styles['BodyText'],
            fontSize=11,
            textColor=colors.HexColor('#00aa00'),
            fontName='Helvetica-Bold',
            spaceAfter=6,
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
                story.append(Spacer(1, 0.2*cm))
            
            elif line.startswith('## '):
                text = line[3:].strip()
                if i > 0:
                    story.append(Spacer(1, 0.3*cm))
                story.append(Paragraph(text, heading1_style))
                story.append(Spacer(1, 0.15*cm))
            
            elif line.startswith('### '):
                text = line[4:].strip()
                
                if '🔴' in text or 'Priorité 1' in text or 'CRITIQUE' in text:
                    story.append(Paragraph(text, priority_critical))
                elif '🟡' in text or 'Priorité 2' in text or 'IMPORTANTE' in text:
                    story.append(Paragraph(text, priority_important))
                elif '🟢' in text or 'Priorité 3' in text or 'AVANCÉE' in text:
                    story.append(Paragraph(text, priority_nice))
                else:
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
                text = text.replace('🔴', '&#x1F534;').replace('🟡', '&#x1F7E1;').replace('🟢', '&#x1F7E2;')
                text = text.replace('⭐', '&#x2B50;')
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
                        col_count = len(table_data[0])
                        if col_count <= 4:
                            col_widths = [4*cm] * col_count
                        elif col_count == 5:
                            col_widths = [3.2*cm] * col_count
                        else:
                            col_widths = [2.8*cm] * col_count
                        
                        t = Table(table_data, colWidths=col_widths)
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
                text = text.replace('🔴', '&#x1F534;').replace('🟡', '&#x1F7E1;').replace('🟢', '&#x1F7E2;')
                text = text.replace('⭐', '&#x2B50;')
                
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
    success = parse_markdown_to_pdf("Fonctionnalites_Essentielles.md", "Fonctionnalites_Essentielles.pdf")
    if success:
        print("✅ Conversion terminée avec succès!")
    else:
        print("❌ Échec de la conversion")
