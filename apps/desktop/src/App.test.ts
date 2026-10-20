import { describe, it, expect } from 'vitest';
import { GraphEdgeDto, GraphNodeDto, ImpactReport } from './types';

describe('Frontend Component Baseline & Domain Contracts', () => {
  it('types and contracts are well-formed', () => {
    const node: GraphNodeDto = {
      id: 'file:src/test.py',
      label: 'src/test.py',
      kind: 'File',
      is_test: true,
    };
    expect(node.id).toBe('file:src/test.py');
    expect(node.is_test).toBe(true);
  });

  it('validates graph structural calculations for hubs and degrees', () => {
    const nodes: GraphNodeDto[] = [
      { id: 'file:a.py', label: 'a.py', kind: 'File', is_test: false },
      { id: 'sym:func_a', label: 'func_a', kind: 'Function', is_test: false },
      { id: 'sym:func_b', label: 'func_b', kind: 'Function', is_test: false },
      { id: 'sym:test_a', label: 'test_a', kind: 'Test', is_test: true },
    ];

    const edges: GraphEdgeDto[] = [
      { source: 'sym:func_a', target: 'sym:func_b', edge_type: 'Calls', confidence: 'Static', resolution: 'Resolved' },
      { source: 'sym:test_a', target: 'sym:func_a', edge_type: 'Calls', confidence: 'Static', resolution: 'Resolved' },
    ];

    const inDegrees: Record<string, number> = {};
    const outDegrees: Record<string, number> = {};
    for (const n of nodes) {
      inDegrees[n.id] = 0;
      outDegrees[n.id] = 0;
    }
    for (const e of edges) {
      inDegrees[e.target]++;
      outDegrees[e.source]++;
    }

    expect(inDegrees['sym:func_b']).toBe(1);
    expect(outDegrees['sym:test_a']).toBe(1);
    expect(inDegrees['sym:test_a']).toBe(0);
  });

  it('validates cycle detection logic', () => {
    const adj: Record<string, string[]> = { a: ['b'], b: ['c'], c: ['a'] };
    const visited: Record<string, boolean> = {};
    const inStack: Record<string, boolean> = {};
    let cycleFound = false;

    const dfs = (curr: string) => {
      visited[curr] = true;
      inStack[curr] = true;
      for (const next of adj[curr] || []) {
        if (!visited[next]) {
          dfs(next);
        } else if (inStack[next]) {
          cycleFound = true;
        }
      }
      inStack[curr] = false;
    };

    dfs('a');
    expect(cycleFound).toBe(true);
  });

  it('validates blast radius and candidate test reporting model', () => {
    const report: ImpactReport = {
      target_id: 'sym:core_func',
      target_name: 'core_func',
      direct_count: 2,
      transitive_count: 3,
      total_affected: 5,
      affected_nodes: [
        {
          node_id: 'sym:service',
          name: 'service',
          kind: 'Function',
          impact_type: 'Direct',
          distance: 1,
        },
        {
          node_id: 'sym:test_suite',
          name: 'test_suite',
          kind: 'Test',
          impact_type: 'Transitive',
          distance: 2,
        },
      ],
      candidate_tests: [
        {
          test_node_id: 'sym:test_suite',
          file_id: 'tests/test_core.py',
          symbol_name: 'test_suite',
          reason: 'TransitiveCall',
          confidence: 'Static',
        },
      ],
    };

    expect(report.total_affected).toBe(5);
    expect(report.candidate_tests.length).toBe(1);
    expect(report.candidate_tests[0].reason).toBe('TransitiveCall');
  });
});
