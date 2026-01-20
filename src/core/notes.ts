/**
 * Notes and references support (FR-082)
 */

export type NoteType = 'INFO' | 'WARNING' | 'REQUIREMENT' | 'DECISION' | 'REFERENCE';

export type Note = {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  author?: string;
  created: Date;
  modified?: Date;
  tags?: string[];
};

export type Reference = {
  id: string;
  type: 'RFC' | 'URL' | 'DOCUMENT' | 'TICKET' | 'OTHER';
  title: string;
  url?: string;
  description?: string;
};

export type SubnetNotes = {
  cidr: string;
  notes: Note[];
  references: Reference[];
};

/**
 * Create a new note
 */
export function createNote(
  type: NoteType,
  title: string,
  content: string,
  options?: {
    author?: string;
    tags?: string[];
  }
): Note {
  return {
    id: generateId(),
    type,
    title,
    content,
    author: options?.author,
    created: new Date(),
    tags: options?.tags
  };
}

/**
 * Create a new reference
 */
export function createReference(
  type: Reference['type'],
  title: string,
  options?: {
    url?: string;
    description?: string;
  }
): Reference {
  return {
    id: generateId(),
    type,
    title,
    url: options?.url,
    description: options?.description
  };
}

/**
 * Update a note
 */
export function updateNote(note: Note, updates: Partial<Omit<Note, 'id' | 'created'>>): Note {
  return {
    ...note,
    ...updates,
    modified: new Date()
  };
}

/**
 * Format notes as markdown
 */
export function formatNotesAsMarkdown(subnetNotes: SubnetNotes): string {
  let md = `# Notes for ${subnetNotes.cidr}\n\n`;

  if (subnetNotes.notes.length > 0) {
    md += '## Notes\n\n';
    for (const note of subnetNotes.notes) {
      const icon = getNoteIcon(note.type);
      md += `### ${icon} ${note.title}\n\n`;
      md += `**Type:** ${note.type}\n`;
      if (note.author) {
        md += `**Author:** ${note.author}\n`;
      }
      md += `**Created:** ${note.created.toISOString()}\n`;
      if (note.modified) {
        md += `**Modified:** ${note.modified.toISOString()}\n`;
      }
      if (note.tags && note.tags.length > 0) {
        md += `**Tags:** ${note.tags.join(', ')}\n`;
      }
      md += `\n${note.content}\n\n`;
      md += '---\n\n';
    }
  }

  if (subnetNotes.references.length > 0) {
    md += '## References\n\n';
    for (const ref of subnetNotes.references) {
      md += `- **[${ref.type}]** ${ref.title}`;
      if (ref.url) {
        md += ` - [${ref.url}](${ref.url})`;
      }
      if (ref.description) {
        md += `\n  ${ref.description}`;
      }
      md += '\n';
    }
    md += '\n';
  }

  return md;
}

/**
 * Get emoji icon for note type
 */
function getNoteIcon(type: NoteType): string {
  switch (type) {
    case 'INFO':
      return 'ℹ️';
    case 'WARNING':
      return '⚠️';
    case 'REQUIREMENT':
      return '📋';
    case 'DECISION':
      return '✅';
    case 'REFERENCE':
      return '🔗';
  }
}

/**
 * Simple ID generator (timestamp + random)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Search notes by text
 */
export function searchNotes(subnetNotes: SubnetNotes[], query: string): SubnetNotes[] {
  const lowerQuery = query.toLowerCase();
  return subnetNotes.filter(sn => {
    // Search in CIDR
    if (sn.cidr.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // Search in notes
    if (sn.notes.some(n => 
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery) ||
      n.tags?.some(t => t.toLowerCase().includes(lowerQuery))
    )) {
      return true;
    }
    // Search in references
    if (sn.references.some(r =>
      r.title.toLowerCase().includes(lowerQuery) ||
      r.description?.toLowerCase().includes(lowerQuery)
    )) {
      return true;
    }
    return false;
  });
}

