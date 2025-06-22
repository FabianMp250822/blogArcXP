// Lista simple de palabras no permitidas. En una aplicación real, esto sería más robusto.
const badWords: string[] = [
  'palabrota1', 'insulto', 'ofensa', 'spam', 'viagra',
  // Añadir más palabras según sea necesario
];

const badWordsRegex = new RegExp(badWords.join('|'), 'i');

export function containsBadWords(text: string): boolean {
  if (!text) return false;
  return badWordsRegex.test(text);
}
