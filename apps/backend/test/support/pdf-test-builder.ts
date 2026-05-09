function escapePdfText(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function buildPageContent(lines: string[]): string {
  if (lines.length === 0) {
    return 'BT\nET';
  }

  const [firstLine, ...remainingLines] = lines;
  const commands = ['BT', '/F1 12 Tf', '72 720 Td', `(${escapePdfText(firstLine)}) Tj`];

  for (const line of remainingLines) {
    commands.push('0 -18 Td');
    commands.push(`(${escapePdfText(line)}) Tj`);
  }

  commands.push('ET');

  return commands.join('\n');
}

export function buildTextPdf(pages: string[][]): Uint8Array {
  const fontObjectNumber = 3 + pages.length * 2;
  const objects: string[] = [];
  const pageReferences: string[] = [];

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  for (let index = 0; index < pages.length; index += 1) {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const content = buildPageContent(pages[index] ?? []);

    pageReferences.push(`${pageObjectNumber} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }

  objects.splice(1, 0, `<< /Type /Pages /Kids [${pageReferences.join(' ')}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((objectSource, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objectSource}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, 'utf8'));
}
