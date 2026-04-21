import { STORAGE_KEYS } from './constants';
import type { Author, Tag } from './types';

const MAX_TAGS = 20;
const MAX_AUTHOR_TAGS = 5;

function dedupeTags(tags: string[]): string[] {
  return [...new Set(tags)].slice(0, MAX_AUTHOR_TAGS);
}

function mergeAuthor(existing: Author | undefined, incoming: Author): Author {
  if (!existing) {
    return {
      ...incoming,
      tags: dedupeTags(incoming.tags),
    };
  }

  return {
    ...existing,
    nickname: incoming.nickname || existing.nickname,
    profile_url: incoming.profile_url || existing.profile_url,
    tags: dedupeTags([...existing.tags, ...incoming.tags]),
    note: existing.note ?? incoming.note,
    profile_summary: existing.profile_summary ?? incoming.profile_summary,
  };
}

function normalizeTagName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function addTagsWithLimit(existingTags: string[], incomingTags: string[]): string[] {
  return dedupeTags([...existingTags, ...incomingTags]);
}

export const storage = {
  async getAuthors(): Promise<Author[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTHORS);
    return result[STORAGE_KEYS.AUTHORS] ?? [];
  },

  async clearAuthors(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTHORS]: [] });
  },

  async upsertAuthors(incomingAuthors: Author[]): Promise<{
    authors: Author[];
    added: number;
    merged: number;
  }> {
    const currentAuthors = await this.getAuthors();
    const authorMap = new Map(currentAuthors.map((author) => [author.user_id, author]));

    let added = 0;
    let merged = 0;

    for (const incoming of incomingAuthors) {
      const previous = authorMap.get(incoming.user_id);
      authorMap.set(incoming.user_id, mergeAuthor(previous, incoming));
      if (previous) {
        merged += 1;
      } else {
        added += 1;
      }
    }

    const authors = Array.from(authorMap.values());
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTHORS]: authors });

    return { authors, added, merged };
  },

  async getTags(): Promise<Tag[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TAGS);
    return result[STORAGE_KEYS.TAGS] ?? [];
  },

  async createTag(name: string): Promise<Tag> {
    const normalized = normalizeTagName(name);
    if (!normalized) {
      throw new Error('标签名不能为空。');
    }
    if (normalized.length > 20) {
      throw new Error('标签名称不能超过 20 个字符。');
    }

    const tags = await this.getTags();
    if (tags.length >= MAX_TAGS) {
      throw new Error('标签数量已达到上限 20 个。');
    }

    const exists = tags.find((tag) => tag.name === normalized);
    if (exists) {
      throw new Error('该标签已存在。');
    }

    const newTag: Tag = {
      id: crypto.randomUUID(),
      name: normalized,
    };
    const nextTags = [...tags, newTag];
    await chrome.storage.local.set({ [STORAGE_KEYS.TAGS]: nextTags });
    return newTag;
  },

  async ensureTags(tagNames: string[]): Promise<Tag[]> {
    const normalizedNames = [...new Set(tagNames.map(normalizeTagName).filter(Boolean))];
    const tags = await this.getTags();
    const existingNameSet = new Set(tags.map((tag) => tag.name));
    const nextTags = [...tags];
    const createdTags: Tag[] = [];

    for (const name of normalizedNames) {
      if (existingNameSet.has(name)) {
        continue;
      }

      if (nextTags.length >= MAX_TAGS) {
        break;
      }

      const newTag: Tag = {
        id: crypto.randomUUID(),
        name,
      };
      nextTags.push(newTag);
      createdTags.push(newTag);
      existingNameSet.add(name);
    }

    if (createdTags.length > 0) {
      await chrome.storage.local.set({ [STORAGE_KEYS.TAGS]: nextTags });
    }

    return nextTags;
  },

  async deleteTag(tagId: string): Promise<void> {
    const tags = await this.getTags();
    const tagToDelete = tags.find((tag) => tag.id === tagId);
    if (!tagToDelete) {
      return;
    }

    const nextTags = tags.filter((tag) => tag.id !== tagId);
    const authors = await this.getAuthors();
    const nextAuthors = authors.map((author) => ({
      ...author,
      tags: author.tags.filter((tagName) => tagName !== tagToDelete.name),
    }));

    await chrome.storage.local.set({
      [STORAGE_KEYS.TAGS]: nextTags,
      [STORAGE_KEYS.AUTHORS]: nextAuthors,
    });
  },

  async toggleAuthorTag(userId: string, tagName: string): Promise<Author[]> {
    const authors = await this.getAuthors();
    const nextAuthors = authors.map((author) => {
      if (author.user_id !== userId) {
        return author;
      }

      const hasTag = author.tags.includes(tagName);
      if (hasTag) {
        return {
          ...author,
          tags: author.tags.filter((currentTag) => currentTag !== tagName),
        };
      }

      if (author.tags.length >= MAX_AUTHOR_TAGS) {
        throw new Error('每位博主最多只能添加 5 个标签。');
      }

      return {
        ...author,
        tags: [...author.tags, tagName],
      };
    });

    await chrome.storage.local.set({ [STORAGE_KEYS.AUTHORS]: nextAuthors });
    return nextAuthors;
  },

  async applyAuthorTags(userId: string, tagNames: string[]): Promise<Author[]> {
    const normalizedIncoming = dedupeTags(tagNames);
    await this.ensureTags(normalizedIncoming);
    const authors = await this.getAuthors();
    const nextAuthors = authors.map((author) => {
      if (author.user_id !== userId) {
        return author;
      }

      return {
        ...author,
        tags: addTagsWithLimit(author.tags, normalizedIncoming),
      };
    });

    await chrome.storage.local.set({ [STORAGE_KEYS.AUTHORS]: nextAuthors });
    return nextAuthors;
  },

  async updateAuthorNote(userId: string, note: string): Promise<Author[]> {
    const normalizedNote = note.trim();
    const authors = await this.getAuthors();
    const nextAuthors = authors.map((author) =>
      author.user_id === userId
        ? {
            ...author,
            note: normalizedNote,
          }
        : author,
    );

    await chrome.storage.local.set({ [STORAGE_KEYS.AUTHORS]: nextAuthors });
    return nextAuthors;
  },

  async updateAuthorProfiles(
    updates: Array<{
      user_id: string;
      nickname?: string;
      profile_summary?: string;
    }>,
  ): Promise<Author[]> {
    const updateMap = new Map(updates.map((item) => [item.user_id, item]));
    const authors = await this.getAuthors();
    const nextAuthors = authors.map((author) => {
      const update = updateMap.get(author.user_id);
      if (!update) {
        return author;
      }

      return {
        ...author,
        nickname: update.nickname || author.nickname,
        profile_summary: update.profile_summary || author.profile_summary,
      };
    });

    await chrome.storage.local.set({ [STORAGE_KEYS.AUTHORS]: nextAuthors });
    return nextAuthors;
  },

  async setTags(tags: Tag[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.TAGS]: tags });
  },
};
