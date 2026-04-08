"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { meowoneApi } from "@/lib/meowone-api";
import { cn } from "@/lib/utils";

// ============ 图标组件 ============
function RefreshIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function InfoCircleIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

// ============ 类型定义 ============
type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR";

type LogSource = "gateway" | "backend" | "scheduler" | "mcp" | "skill" | "all";

type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  session_id?: string;
  agent_name?: string;
  details?: string;
};

// ============ 主组件 ============
export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<LogSource>("all");
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 加载日志
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await meowoneApi.queryGatewayLogs({ limit: 200 });
      const mapped: LogEntry[] = (data.items || []).map((item: Record<string, unknown>, idx: number) => {
        let level: LogLevel = "INFO";
        let message = String(item.data || "");
        let details = "";
        const src = String(item.source || "gateway");

        if (src === "app") {
          try {
            const parsed = JSON.parse(String(item.data || "{}")) as {
              level?: string;
              message?: string;
              logger?: string;
            };
            if (parsed.level && ["DEBUG", "INFO", "WARNING", "ERROR"].includes(parsed.level)) {
              level = parsed.level as LogLevel;
            }
            const line = parsed.message || message;
            message = parsed.logger ? `[${parsed.logger}] ${line}` : line;
          } catch {
            /* raw text */
          }
          return {
            id: String(item.id ?? idx),
            timestamp: String(item.createdAt || new Date().toISOString()),
            level,
            source: "backend",
            message,
            session_id: item.sessionId ? String(item.sessionId) : undefined,
            details,
          };
        }

        try {
          const parsed = JSON.parse(String(item.data || "{}")) as Record<string, unknown>;
          if (typeof parsed.level === "string" && ["DEBUG", "INFO", "WARNING", "ERROR"].includes(parsed.level)) {
            level = parsed.level as LogLevel;
          }
          if (typeof parsed.message === "string") message = parsed.message;
          if (typeof parsed.details === "string") details = parsed.details;
          if (parsed.step !== undefined) {
            message = `[Step ${parsed.step}] ${parsed.description || message}`;
          }
        } catch {
          /* 非 JSON */
        }

        return {
          id: String(item.id ?? idx),
          timestamp: String(item.createdAt || new Date().toISOString()),
          level,
          source: "gateway",
          message,
          session_id: item.sessionId ? String(item.sessionId) : undefined,
          details,
        };
      });

      setLogs(
        mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载和自动刷新
  useEffect(() => {
    void loadLogs();
    
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        void loadLogs();
      }, 5000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [loadLogs, autoRefresh]);

  // 过滤日志
  const filteredLogs = logs.filter((log) => {
    // 级别过滤
    if (levelFilter !== "ALL" && log.level !== levelFilter) return false;
    
    // 来源过滤
    if (sourceFilter !== "all" && log.source !== sourceFilter) return false;
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        (log.session_id && log.session_id.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // 根据时间范围过滤
  const getTimeRangeFilter = () => {
    const now = Date.now();
    const ranges = { "1h": 3600000, "6h": 21600000, "24h": 86400000, "7d": 604800000 };
    const cutoff = now - ranges[timeRange];
    return new Date(cutoff).toISOString();
  };

  const timeFilteredLogs = filteredLogs.filter((log) => 
    new Date(log.timestamp).getTime() > new Date(getTimeRangeFilter()).getTime()
  );

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "DEBUG": return <InfoCircleIcon />;
      case "INFO": return <InfoCircleIcon />;
      case "WARNING": return <WarningIcon />;
      case "ERROR": return <ErrorIcon />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "DEBUG": return "text-gray-400";
      case "INFO": return "text-blue-500";
      case "WARNING": return "text-yellow-500";
      case "ERROR": return "text-red-500";
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      gateway: "bg-purple-100 text-purple-700",
      backend: "bg-slate-200 text-slate-800",
      scheduler: "bg-green-100 text-green-700",
      mcp: "bg-orange-100 text-orange-700",
      skill: "bg-blue-100 text-blue-700",
    };
    const label =
      source === "backend" ? "后端" : source === "gateway" ? "网关" : source;
    return (
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colors[source] || "bg-gray-100 text-gray-700")}>
        {label}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* 顶部工具栏 */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">日志中心</h1>
          
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索日志内容..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <SearchIcon />
            </div>
          </div>

          {/* 过滤器按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              showFilters ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <FilterIcon /> 筛选
          </button>

          {/* 自动刷新开关 */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
              autoRefresh ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <RefreshIcon />
            {autoRefresh ? "自动刷新" : "已暂停"}
          </button>

          {/* 手动刷新 */}
          <button
            onClick={() => void loadLogs()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            <RefreshIcon />
          </button>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {/* 日志级别 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">级别：</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LogLevel | "ALL")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="ALL">全部</option>
                <option value="DEBUG">调试</option>
                <option value="INFO">信息</option>
                <option value="WARNING">警告</option>
                <option value="ERROR">错误</option>
              </select>
            </div>

            {/* 日志来源 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">来源：</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as LogSource)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="all">全部</option>
                <option value="gateway">网关 SSE</option>
                <option value="backend">后端应用</option>
                <option value="scheduler">调度器</option>
                <option value="mcp">MCP</option>
                <option value="skill">技能</option>
              </select>
            </div>

            {/* 时间范围 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">时间：</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as "1h" | "6h" | "24h" | "7d")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="1h">最近 1 小时</option>
                <option value="6h">最近 6 小时</option>
                <option value="24h">最近 24 小时</option>
                <option value="7d">最近 7 天</option>
              </select>
            </div>

            {/* 统计信息 */}
            <div className="ml-auto text-sm text-gray-500">
              共 {timeFilteredLogs.length} 条日志
            </div>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="ml-3 text-gray-500">加载中...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <ErrorIcon />
            <p className="mt-2">{error}</p>
            <button onClick={() => void loadLogs()} className="mt-4 rounded-lg border border-red-300 px-4 py-2 hover:bg-red-50">
              重试
            </button>
          </div>
        ) : timeFilteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <InfoCircleIcon />
            <p className="mt-2">暂无日志</p>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {timeFilteredLogs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              return (
                <div
                  key={log.id}
                  className={cn(
                    "group rounded-lg border bg-white transition-all hover:shadow-sm",
                    log.level === "ERROR" ? "border-red-200" :
                    log.level === "WARNING" ? "border-yellow-200" : "border-gray-200"
                  )}
                >
                  <div
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    {/* 时间 */}
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatTimestamp(log.timestamp)}
                    </span>

                    {/* 级别图标 */}
                    <span className={cn("shrink-0", getLevelColor(log.level))}>
                      {getLevelIcon(log.level)}
                    </span>

                    {/* 来源 */}
                    {getSourceBadge(log.source)}

                    {/* 消息 */}
                    <span className="flex-1 text-sm text-gray-700">
                      {log.message}
                    </span>

                    {/* 展开指示器 */}
                    <span className={cn("shrink-0 text-gray-400 transition-transform", isExpanded && "rotate-180")}>
                      <ChevronDownIcon />
                    </span>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="font-medium text-gray-500">完整时间：</span>
                          <span className="text-gray-700">{log.timestamp}</span>
                        </div>
                        {log.session_id && (
                          <div>
                            <span className="font-medium text-gray-500">会话 ID：</span>
                            <span className="text-gray-700">{log.session_id}</span>
                          </div>
                        )}
                        {log.agent_name && (
                          <div>
                            <span className="font-medium text-gray-500">智能体：</span>
                            <span className="text-gray-700">{log.agent_name}</span>
                          </div>
                        )}
                      </div>
                      {log.details && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500">详情：</span>
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-xs text-gray-600">
                            {log.details}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
