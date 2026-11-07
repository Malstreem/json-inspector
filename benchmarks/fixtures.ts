export interface JsonBenchmarkFixture {
  name: string;
  recordCount: number;
  source: string;
}

function createRecord(index: number) {
  return {
    id: `record-${index}`,
    name: `Example record ${index}`,
    active: index % 3 !== 0,
    score: (index * 17) % 1000,
    tags: [`tag-${index % 8}`, `group-${index % 5}`],
    metadata: {
      owner: `owner-${index % 12}`,
      updatedAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
    },
    events: [
      { type: 'created', sequence: index * 2 },
      { type: 'updated', sequence: index * 2 + 1 },
    ],
  };
}

export function createJsonFixture(name: string, recordCount: number): JsonBenchmarkFixture {
  const records = Array.from({ length: recordCount }, (_, index) => createRecord(index));
  return {
    name,
    recordCount,
    source: JSON.stringify({ version: 1, records }),
  };
}

export function createJsonFixtures(): JsonBenchmarkFixture[] {
  return [
    createJsonFixture('small', 10),
    createJsonFixture('medium', 250),
    createJsonFixture('large', 1500),
  ];
}
