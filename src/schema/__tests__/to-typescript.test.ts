import { describe, expect, it } from 'vitest';
import { jsonToTypeScript } from '../to-typescript';

describe('jsonToTypeScript', () => {
  it('generates interface for simple object', () => {
    const input = { name: 'Alice', age: 30, active: true };
    const ts = jsonToTypeScript(input, { rootName: 'User' });
    expect(ts).toContain('export interface User {');
    expect(ts).toContain('name: string;');
    expect(ts).toContain('age: number;');
    expect(ts).toContain('active: boolean;');
  });

  it('generates nested interfaces for objects within objects', () => {
    const input = {
      id: 1,
      profile: {
        bio: 'Developer',
        location: 'Earth',
      },
    };
    const ts = jsonToTypeScript(input, { rootName: 'Account' });
    expect(ts).toContain('export interface Account {');
    expect(ts).toContain('profile: Profile;');
    expect(ts).toContain('export interface Profile {');
    expect(ts).toContain('bio: string;');
  });

  it('handles arrays of primitives and objects', () => {
    const input = {
      tags: ['typescript', 'json'],
      scores: [100, 95],
      users: [{ id: 1, name: 'Bob' }],
    };
    const ts = jsonToTypeScript(input, { rootName: 'Data' });
    expect(ts).toContain('tags: string[];');
    expect(ts).toContain('scores: number[];');
    expect(ts).toContain('users: User[];');
    expect(ts).toContain('export interface User {');
  });

  it('handles root array of objects', () => {
    const input = [{ id: 'A', count: 1 }];
    const ts = jsonToTypeScript(input, { rootName: 'ItemList' });
    expect(ts).toContain('export type ItemList = ItemListItem[];');
    expect(ts).toContain('export interface ItemListItem {');
  });

  it('quotes keys with special characters', () => {
    const input = { 'first-name': 'John', 'user.email': 'john@test.com' };
    const ts = jsonToTypeScript(input);
    expect(ts).toContain('"first-name": string;');
    expect(ts).toContain('"user.email": string;');
  });

  it('supports type aliases instead of interfaces', () => {
    const input = { id: 123 };
    const ts = jsonToTypeScript(input, { rootName: 'Item', useTypeAlias: true });
    expect(ts).toContain('export type Item = {');
  });
});
