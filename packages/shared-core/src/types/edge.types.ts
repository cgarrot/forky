export interface Edge {
  id: string;
  source: string;
  target: string;
  createdAt: Date;
}

export interface EdgeMap {
  [edgeId: string]: Edge;
}

export interface EdgeCreate {
  source: string;
  target: string;
}
