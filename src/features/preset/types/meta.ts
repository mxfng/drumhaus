export interface InlineMeta {
  id: string;
  name: string;
}

export interface Meta extends InlineMeta {
  createdAt: string;
  updatedAt: string;
  author?: string;
}
