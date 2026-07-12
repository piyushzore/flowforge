import React from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const status = (data as any)?.status as string | undefined;
  const throughput = (data as any)?.throughput as number | undefined;

  // Colors for each state
  const colorMap: Record<string, { stroke: string; glow: string; particle: string }> = {
    idle:    { stroke: '#94a3b8', glow: 'none',                              particle: 'transparent' },
    queued:  { stroke: '#94a3b8', glow: 'none',                              particle: 'transparent' },
    running: { stroke: '#22d3ee', glow: 'drop-shadow(0 0 4px #22d3ee)',      particle: '#22d3ee' },
    success: { stroke: '#22c55e', glow: 'drop-shadow(0 0 6px #22c55e80)',    particle: '#22c55e' },
    failed:  { stroke: '#ef4444', glow: 'drop-shadow(0 0 8px #ef444480)',    particle: '#ef4444' },
    streaming: { stroke: '#22c55e', glow: 'drop-shadow(0 0 4px #22c55e60)', particle: '#22c55e' },
  };

  const colors = colorMap[status || 'idle'] || colorMap.idle;
  const isActive = status === 'running' || status === 'streaming';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  // Unique gradient ID per edge
  const gradientId = `edge-gradient-${id}`;
  const filterId = `edge-glow-${id}`;
  const particleSpeed = status === 'streaming' ? '0.8s' : '1.4s';

  return (
    <>
      <defs>
        {/* Glow filter */}
        {(isActive || isSuccess || isFailed) && (
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isFailed ? 3 : 2} result="blur" />
            <feFlood floodColor={colors.stroke} floodOpacity={isFailed ? 0.5 : 0.3} result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}

        {/* Flowing gradient for active edges */}
        {isActive && (
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3">
              <animate attributeName="offset" values="-0.3;1" dur={particleSpeed} repeatCount="indefinite" />
            </stop>
            <stop offset="30%" stopColor={colors.stroke} stopOpacity="1">
              <animate attributeName="offset" values="0;1.3" dur={particleSpeed} repeatCount="indefinite" />
            </stop>
            <stop offset="60%" stopColor={colors.stroke} stopOpacity="0.3">
              <animate attributeName="offset" values="0.3;1.6" dur={particleSpeed} repeatCount="indefinite" />
            </stop>
          </linearGradient>
        )}
      </defs>

      {/* Glow underneath layer */}
      {(isActive || isSuccess || isFailed) && (
        <path
          d={edgePath}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={isActive ? 6 : isFailed ? 5 : 4}
          strokeOpacity={0.15}
          className={isFailed ? 'edge-glow-failed' : isActive ? 'edge-glow-active' : ''}
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: colors.stroke,
          strokeWidth: isActive ? 2.5 : isSuccess ? 2 : isFailed ? 2.5 : 1.5,
          filter: (isActive || isSuccess || isFailed) ? `url(#${filterId})` : 'none',
          transition: 'stroke 0.4s ease, stroke-width 0.3s ease',
          ...(isActive ? { strokeDasharray: '8 4' } : {}),
        }}
        markerEnd={markerEnd}
        className={isActive ? 'edge-dash-flow' : ''}
      />

      {/* Flowing data particles — multiple for streaming */}
      {isActive && (
        <>
          {/* Primary particle */}
          <circle r="4" fill={colors.particle} opacity="0.9">
            <animateMotion dur={particleSpeed} repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="7" fill={colors.particle} opacity="0.2">
            <animateMotion dur={particleSpeed} repeatCount="indefinite" path={edgePath} />
          </circle>

          {/* Staggered particles for streaming mode */}
          {status === 'streaming' && (
            <>
              <circle r="3.5" fill={colors.particle} opacity="0.7">
                <animateMotion dur="0.8s" begin="0.27s" repeatCount="indefinite" path={edgePath} />
              </circle>
              <circle r="3" fill={colors.particle} opacity="0.5">
                <animateMotion dur="0.8s" begin="0.53s" repeatCount="indefinite" path={edgePath} />
              </circle>
            </>
          )}
        </>
      )}

      {/* Success static particles — gentle flowing dots */}
      {isSuccess && (
        <>
          <circle r="3" fill={colors.particle} opacity="0.6">
            <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2" fill={colors.particle} opacity="0.3">
            <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}

      {/* Failed — pulsing X at midpoint */}
      {isFailed && (
        <>
          <circle r="3" fill="#ef4444" opacity="0.8">
            <animateMotion dur="0.8s" repeatCount="indefinite" path={edgePath} />
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Throughput label */}
      {throughput !== undefined && throughput > 0 && (isActive || isSuccess) && (
        <text>
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle" dominantBaseline="text-after-edge">
            <tspan
              dy="-10"
              fill={colors.stroke}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fontWeight="500"
            >
              {throughput >= 1000 ? `${(throughput / 1000).toFixed(1)}k` : throughput} rows/s
            </tspan>
          </textPath>
        </text>
      )}
    </>
  );
}

export const edgeTypes = {
  animated: AnimatedEdge,
};
