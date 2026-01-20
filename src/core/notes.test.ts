import { describe, it, expect } from 'vitest';
import {
  createNote,
  createReference,
  updateNote,
  formatNotesAsMarkdown,
  searchNotes,
  type SubnetNotes
} from './notes';

describe('Notes and References (FR-082)', () => {
  describe('createNote', () => {
    it('should create a note with required fields', () => {
      const note = createNote('INFO', 'Test Note', 'This is a test note');
      
      expect(note.id).toBeDefined();
      expect(note.type).toBe('INFO');
      expect(note.title).toBe('Test Note');
      expect(note.content).toBe('This is a test note');
      expect(note.created).toBeInstanceOf(Date);
      expect(note.modified).toBeUndefined();
    });

    it('should create a note with optional fields', () => {
      const note = createNote('REQUIREMENT', 'Requirement', 'Must support IPv6', {
        author: 'John Doe',
        tags: ['ipv6', 'requirement']
      });
      
      expect(note.author).toBe('John Doe');
      expect(note.tags).toEqual(['ipv6', 'requirement']);
    });
  });

  describe('createReference', () => {
    it('should create a reference with required fields', () => {
      const ref = createReference('RFC', 'RFC 3021');
      
      expect(ref.id).toBeDefined();
      expect(ref.type).toBe('RFC');
      expect(ref.title).toBe('RFC 3021');
    });

    it('should create a reference with optional fields', () => {
      const ref = createReference('URL', 'IANA IPv4 Registry', {
        url: 'https://www.iana.org/assignments/ipv4-address-space',
        description: 'Official IPv4 address space registry'
      });
      
      expect(ref.url).toBe('https://www.iana.org/assignments/ipv4-address-space');
      expect(ref.description).toBe('Official IPv4 address space registry');
    });
  });

  describe('updateNote', () => {
    it('should update note fields and set modified date', () => {
      const note = createNote('INFO', 'Original', 'Original content');
      const updated = updateNote(note, {
        title: 'Updated',
        content: 'Updated content'
      });
      
      expect(updated.id).toBe(note.id);
      expect(updated.created).toBe(note.created);
      expect(updated.title).toBe('Updated');
      expect(updated.content).toBe('Updated content');
      expect(updated.modified).toBeInstanceOf(Date);
    });
  });

  describe('formatNotesAsMarkdown', () => {
    it('should format subnet notes as markdown', () => {
      const subnetNotes: SubnetNotes = {
        cidr: '10.0.0.0/24',
        notes: [
          createNote('INFO', 'Network Info', 'This is the main office network', {
            author: 'Admin',
            tags: ['office', 'production']
          })
        ],
        references: [
          createReference('RFC', 'RFC 1918', {
            url: 'https://tools.ietf.org/html/rfc1918',
            description: 'Private address space'
          })
        ]
      };

      const md = formatNotesAsMarkdown(subnetNotes);
      
      expect(md).toContain('# Notes for 10.0.0.0/24');
      expect(md).toContain('## Notes');
      expect(md).toContain('### ℹ️ Network Info');
      expect(md).toContain('**Type:** INFO');
      expect(md).toContain('**Author:** Admin');
      expect(md).toContain('**Tags:** office, production');
      expect(md).toContain('This is the main office network');
      expect(md).toContain('## References');
      expect(md).toContain('**[RFC]** RFC 1918');
      expect(md).toContain('https://tools.ietf.org/html/rfc1918');
      expect(md).toContain('Private address space');
    });

    it('should handle empty notes and references', () => {
      const subnetNotes: SubnetNotes = {
        cidr: '192.168.0.0/16',
        notes: [],
        references: []
      };

      const md = formatNotesAsMarkdown(subnetNotes);
      
      expect(md).toContain('# Notes for 192.168.0.0/16');
      expect(md).not.toContain('## Notes');
      expect(md).not.toContain('## References');
    });
  });

  describe('searchNotes', () => {
    const testData: SubnetNotes[] = [
      {
        cidr: '10.0.0.0/24',
        notes: [
          createNote('INFO', 'Office Network', 'Main office subnet', {
            tags: ['office', 'production']
          })
        ],
        references: [
          createReference('RFC', 'RFC 1918')
        ]
      },
      {
        cidr: '192.168.1.0/24',
        notes: [
          createNote('WARNING', 'Legacy System', 'Old system still using this range')
        ],
        references: []
      },
      {
        cidr: '172.16.0.0/16',
        notes: [],
        references: [
          createReference('DOCUMENT', 'Network Design Doc', {
            description: 'Corporate network design document'
          })
        ]
      }
    ];

    it('should search by CIDR', () => {
      const results = searchNotes(testData, '10.0.0');
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr).toBe('10.0.0.0/24');
    });

    it('should search by note title', () => {
      const results = searchNotes(testData, 'office');
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr).toBe('10.0.0.0/24');
    });

    it('should search by note content', () => {
      const results = searchNotes(testData, 'legacy');
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr).toBe('192.168.1.0/24');
    });

    it('should search by tags', () => {
      const results = searchNotes(testData, 'production');
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr).toBe('10.0.0.0/24');
    });

    it('should search by reference title', () => {
      const results = searchNotes(testData, 'rfc 1918');
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr).toBe('10.0.0.0/24');
    });

    it('should search by reference description', () => {
      const results = searchNotes(testData, 'corporate');
      expect(results).toHaveLength(1);
      expect(results[0]!.cidr).toBe('172.16.0.0/16');
    });

    it('should return empty array for no matches', () => {
      const results = searchNotes(testData, 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });
});

