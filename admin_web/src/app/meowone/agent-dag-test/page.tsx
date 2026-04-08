"use client";

import { useCallback, useEffect, useMemo } from "react";
import ELK from "elkjs/lib/elk.bundled.js";
import { useTheme } from "next-themes";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

type AgentNodeData = {
  title: string;
  role: string;
  model: string;
  status: "online" | "idle" | "offline";
};

const elk = new ELK();
const NODE_WIDTH = 260;
const NODE_HEIGHT = 124;

const initialNodes: Node<AgentNodeData>[] = [
  {
    id: "planner",
    type: "agent",
    data: { title: "Planner", role: "任务规划", model: "gpt-4o-mini", status: "online" },
    position: { x: 0, y: 0 },
  },
  {
    id: "retriever",
    type: "agent",
    data: { title: "Retriever", role: "检索增强", model: "bge-m3", status: "online" },
    position: { x: 0, y: 0 },
  },
  {
    id: "coder",
    type: "agent",
    data: { title: "Coder", role: "代码生成", model: "deepseek-coder", status: "idle" },
    position: { x: 0, y: 0 },
  },
  {
    id: "reviewer",
    type: "agent",
    data: { title: "Reviewer", role: "代码审阅", model: "gpt-4.1", status: "online" },
    position: { x: 0, y: 0 },
  },
  {
    id: "executor",
    type: "agent",
    data: { title: "Executor", role: "任务执行", model: "qwen-max", status: "offline" },
    position: { x: 0, y: 0 },
  },
];

const initialEdges: Edge[] = [
  { id: "e1", source: "planner", target: "retriever", animated: true, label: "上下文准备" },
  { id: "e2", source: "planner", target: "coder", animated: true, label: "派发任务" },
  { id: "e3", source: "retriever", target: "coder", label: "补充知识" },
  { id: "e4", source: "coder", target: "reviewer", animated: true, label: "提交评审" },
  { id: "e5", source: "reviewer", target: "executor", label: "批准发布" },
];

function statusBadge(status: AgentNodeData["status"]) {
  if (status === "online") return "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
  if (status === "idle") return "bg-amber-500/20 text-amber-300 border-amber-400/40";
  return "bg-rose-500/20 text-rose-300 border-rose-400/40";
}

function AgentNode({ data }: NodeProps<AgentNodeData>) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return (
    <div
      className={
        isDark
          ? "w-[260px] rounded-2xl border border-[#36558c] bg-[linear-gradient(165deg,#172b4d_0%,#101f39_100%)] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
          : "w-[260px] rounded-2xl border border-[#d7e3f8] bg-[linear-gradient(165deg,#ffffff_0%,#f5f8ff_100%)] p-4 shadow-[0_8px_20px_rgba(19,49,99,0.12)]"
      }
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-0 !bg-sky-300" />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className={isDark ? "text-base font-semibold tracking-wide text-white" : "text-base font-semibold tracking-wide text-slate-800"}>
            {data.title}
          </p>
          <p className={isDark ? "text-xs text-slate-300" : "text-xs text-slate-500"}>{data.role}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge(data.status)}`}>
          {data.status}
        </span>
      </div>
      <div
        className={
          isDark
            ? "rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-slate-200"
            : "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600"
        }
      >
        model: <span className="font-medium text-sky-300">{data.model}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-0 !bg-indigo-300" />
    </div>
  );
}

async function applyElkLayout(nodes: Node[], edges: Edge[]) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.edgeRouting": "POLYLINE",
    },
    children: nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const layouted = await elk.layout(graph);
  const positioned = nodes.map((node) => {
    const hit = layouted.children?.find((c) => c.id === node.id);
    return {
      ...node,
      position: { x: hit?.x ?? 0, y: hit?.y ?? 0 },
    };
  });

  return { nodes: positioned, edges };
}

function AgentDagCanvas() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    void applyElkLayout(initialNodes, initialEdges).then((layouted) => {
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    });
  }, [setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges],
  );

  const nodeTypes = useMemo(() => ({ agent: AgentNode }), []);

  return (
    <div
      className={
        isDark
          ? "h-[calc(100vh-14rem)] rounded-2xl border border-[#2a3f66] bg-[linear-gradient(180deg,#0f1c33_0%,#0b1528_100%)]"
          : "h-[calc(100vh-14rem)] rounded-2xl border border-[#d9e3f5] bg-[linear-gradient(180deg,#fdfefe_0%,#f4f8ff_100%)]"
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.18 }}
      >
        <MiniMap
          className={isDark ? "!bg-[#0b1528]" : "!bg-[#eef3ff]"}
          nodeColor={isDark ? "#5b7fc0" : "#6a88c8"}
          maskColor={isDark ? "rgba(11,21,40,0.65)" : "rgba(238,243,255,0.65)"}
        />
        <Controls
          className={
            isDark
              ? "[&>button]:!border-[#355483] [&>button]:!bg-[#132443] [&>button]:!text-slate-200"
              : "[&>button]:!border-[#c9d8f3] [&>button]:!bg-white [&>button]:!text-slate-600"
          }
        />
        <Background color={isDark ? "#2e4670" : "#c9d8f3"} gap={24} />
      </ReactFlow>
    </div>
  );
}

export default function AgentDagTestPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-title-md2 font-semibold text-dark dark:text-white">Agent DAG 演示</h1>
      <p className="text-sm text-slate-500 dark:text-slate-300">
        基于 React Flow + ELK.js 的有向无环图示例。可拖拽节点、缩放画布、后续可接入真实 Agent 关系数据。
      </p>
      <ReactFlowProvider>
        <AgentDagCanvas />
      </ReactFlowProvider>
    </div>
  );
}

