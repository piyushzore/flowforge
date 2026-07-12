import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { nodeTypes } from './nodes/PipelineNodes';
import { edgeTypes } from './edges/AnimatedEdge';
import type { PipelineNode, PipelineEdge, PipelineNodeData, NodeCategory } from '../../types/pipeline';

interface PipelineCanvasProps {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  onNodesChange: (nodes: PipelineNode[]) => void;
  onEdgesChange: (edges: PipelineEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onSnapshot: () => void;
  isRunning?: boolean;
}

function CanvasInner({
  nodes,
  edges,
  onNodesChange: setNodes,
  onEdgesChange: setEdges,
  onNodeSelect,
  onSnapshot,
  isRunning,
}: PipelineCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updated = applyNodeChanges(changes, nodes) as PipelineNode[];
      setNodes(updated);

      // Snapshot on drag end
      const hasDragEnd = changes.some(
        (c) => c.type === 'position' && (c as any).dragging === false
      );
      if (hasDragEnd) onSnapshot();
    },
    [nodes, setNodes, onSnapshot]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updated = applyEdgeChanges(changes, edges) as PipelineEdge[];
      setEdges(updated);
    },
    [edges, setEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge: PipelineEdge = {
        ...connection,
        id: `e-${uuidv4()}`,
        type: 'animated',
      } as PipelineEdge;
      setEdges(addEdge(newEdge, edges) as PipelineEdge[]);
      onSnapshot();
    },
    [edges, setEdges, onSnapshot]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type') as NodeCategory;
      const subType = event.dataTransfer.getData('application/reactflow-subtype');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (!type || !subType) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: PipelineNode = {
        id: `node-${uuidv4()}`,
        type: type,
        position,
        data: {
          label: label || subType.replace(/-/g, ' '),
          category: type as NodeCategory,
          subType: subType as any,
          configured: false,
          runStatus: 'idle',
        } as PipelineNodeData,
      };

      setNodes([...nodes, newNode]);
      onSnapshot();
      onNodeSelect(newNode.id);
    },
    [nodes, setNodes, reactFlowInstance, onSnapshot, onNodeSelect]
  );

  // Connection validation
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const source = nodes.find((n) => n.id === connection.source);
      const target = nodes.find((n) => n.id === connection.target);
      if (!source || !target) return false;

      // Can't connect to self
      if (source.id === target.id) return false;

      // Destination can't be a source for other nodes
      const sourceCategory = (source.data as PipelineNodeData).category;
      const targetCategory = (target.data as PipelineNodeData).category;

      // Note nodes can't connect
      if (sourceCategory === 'note' || targetCategory === 'note') return false;

      // Orchestration nodes can only output
      if (targetCategory === 'orchestration') return false;

      return true;
    },
    [nodes]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          const nodeIds = new Set(selectedNodes.map((n) => n.id));
          setNodes(nodes.filter((n) => !nodeIds.has(n.id)));
          setEdges(
            edges.filter(
              (e) => !e.selected && !nodeIds.has(e.source) && !nodeIds.has(e.target)
            )
          );
          onSnapshot();
          onNodeSelect(null);
        }
      }

      // Ctrl+A select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setNodes(nodes.map((n) => ({ ...n, selected: true })));
      }

      // Ctrl+D duplicate selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const selected = nodes.filter((n) => n.selected);
        if (selected.length > 0) {
          const newNodes = selected.map((n) => ({
            ...n,
            id: `node-${uuidv4()}`,
            position: { x: n.position.x + 50, y: n.position.y + 50 },
            selected: false,
          }));
          setNodes([...nodes, ...newNodes]);
          onSnapshot();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, setNodes, setEdges, onSnapshot, onNodeSelect]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={{
          type: 'animated',
          animated: false,
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        className="canvas-bg"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--color-canvas-dot)"
        />
        <Controls
          showInteractive={false}
          className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !rounded-lg !shadow-md"
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const category = (node.data as PipelineNodeData)?.category;
            switch (category) {
              case 'source': return '#10b981';
              case 'transform': return '#3b82f6';
              case 'destination': return '#8b5cf6';
              case 'control': return '#f59e0b';
              case 'orchestration': return '#6b7280';
              default: return '#e2e8f0';
            }
          }}
          maskColor="rgba(0,0,0,0.08)"
          className="!bg-white/80 dark:!bg-slate-900/80 !border-slate-200 dark:!border-slate-700 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

export default function PipelineCanvas(props: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
