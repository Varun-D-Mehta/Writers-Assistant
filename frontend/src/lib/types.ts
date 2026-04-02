export interface Project {
  slug: string;
  title: string;
  logo: string;
  created_at: string;
  updated_at: string;
}

export interface Part {
  slug: string;
  title: string;
  order: number;
  created_at: string;
}

export interface Chapter {
  slug: string;
  title: string;
  part_slug: string;
  order: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoryMetadata {
  title: string;
  genre: string;
  setting: string;
  time_period: string;
  pov: string;
  tone: string;
  synopsis: string;
}

export interface StoryObject {
  name: string;
  description: string;
  significance: string;
  notes: string;
}

export interface StoryBible {
  metadata: StoryMetadata;
  characters: Character[];
  events: StoryEvent[];
  environment: Environment[];
  objects: StoryObject[];
}

export interface Character {
  name: string;
  description: string;
  traits: string[];
  notes: string;
}

export interface StoryEvent {
  name: string;
  description: string;
  chapter_refs: string[];
}

export interface Environment {
  name: string;
  description: string;
  details: Record<string, string>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ContextIssue {
  id: string;
  severity: "error" | "warning" | "suggestion";
  type: string;
  title: string;
  description: string;
  quote: string;
  fix_instruction: string;
}

export interface Proposal {
  id: string;
  source: "chat" | "context-check";
  source_label: string;
  original_text: string;
  proposed_text: string;
  proposal_type: string;
  created_at: string;
}
