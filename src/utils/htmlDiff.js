import HtmlDiff from 'htmldiff-js';

export function getHtmlDiff(oldHtml, newHtml) {
  if (!oldHtml && !newHtml) return '';
  if (!oldHtml) return `<ins>${newHtml}</ins>`;
  if (!newHtml) return `<del>${oldHtml}</del>`;

  return HtmlDiff.execute(oldHtml, newHtml);
}
