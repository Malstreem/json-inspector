export function readJsonFile(file: File): Promise<string> {
  return file.text();
}
