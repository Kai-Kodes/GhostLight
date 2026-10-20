export type NodeKind =
  | 'File'
  | 'Module'
  | 'Package'
  | 'Function'
  | 'Method'
  | 'Class'
  | 'Test'
  | 'ExternalModule';

export type EdgeType = 'Imports' | 'Defines' | 'Calls' | 'Inherits' | 'References';

export type Confidence = 'Static' | 'Heuristic' | 'Uncertain';
export type ResolutionStatus = 'Resolved' | 'Ambiguous' | 'Unresolved';
export type ImpactType = 'Direct' | 'Transitive';

export interface GraphNodeDto {
  id: string;
  label: string;
  kind: NodeKind;
  file_id?: string;
  is_test: boolean;
}

export interface GraphEdgeDto {
  source: string;
  target: string;
  edge_type: EdgeType;
  confidence: Confidence;
  resolution: ResolutionStatus;
}

export interface GraphExportDto {
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  node_count: usize;
  edge_count: usize;
}

export type usize = number;

export interface PathStep {
  from: string;
  to: string;
  edge: {
    edge_type: EdgeType;
    confidence: Confidence;
    resolution: ResolutionStatus;
  };
}

export interface ExplanatoryPath {
  source: string;
  target: string;
  steps: PathStep[];
  hop_count: number;
}

export interface AffectedNode {
  node_id: string;
  name: string;
  kind: NodeKind;
  file_id?: string;
  impact_type: ImpactType;
  distance: number;
  explanatory_path?: ExplanatoryPath;
}

export interface TestCandidate {
  test_node_id: string;
  file_id: string;
  symbol_name: string;
  reason: 'DirectCall' | 'TransitiveCall' | 'DirectImport' | 'NamingConvention';
  confidence: Confidence;
  explanatory_path?: ExplanatoryPath;
}

export interface ImpactReport {
  target_id: string;
  target_name: string;
  direct_count: number;
  transitive_count: number;
  total_affected: number;
  affected_nodes: AffectedNode[];
  candidate_tests: TestCandidate[];
}

export interface PredictionComparison {
  candidate_test: string;
  selection_reason: string;
  observed_passed: bool;
  execution_confirmed: bool;
  notes: string;
}

export type bool = boolean;

export interface TestRunResult {
  engine_used: 'Docker' | 'RestrictedSubprocess';
  is_isolated: boolean;
  exit_code?: number;
  passed: boolean;
  duration_ms: number;
  timed_out: boolean;
  stdout: string;
  stderr: string;
  comparisons: PredictionComparison[];
}

export interface ScanResult {
  repository: string;
  fingerprint: string;
  file_count: number;
  files: {
    path: string;
    size_bytes: number;
    hash: string;
    is_test: boolean;
  }[];
}

export interface DoctorReport {
  rust_version: string;
  python_version: string;
  pytest_version: string;
  docker_available: boolean;
  security_status: string;
}
