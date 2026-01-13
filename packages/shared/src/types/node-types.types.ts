export type NodeType = 
  | 'standard' 
  | 'plan' 
  | 'flashcard' 
  | 'presentation' 
  | 'checklist' 
  | 'reference' 
  | 'code' 
  | 'template' 
  | 'objective' 
  | 'note' 
  | 'research';

export interface NodeTypeConfig {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
}

export interface NodeWithType extends Record<string, any> {
  nodeType: NodeType;
}

export interface NodeTypeMap {
  [type: string]: NodeTypeConfig;
}
