interface InlineMeta {
  id: string;
  name: string;
}

interface Meta extends InlineMeta {
  createdAt: string;
  updatedAt: string;
  author?: string;
}

export type { InlineMeta, Meta };
