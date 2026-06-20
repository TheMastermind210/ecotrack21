import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { SupplyChainNode } from '../../types';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  displayName: string;
  factor: number;
  unit: string;
  category: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  value: number;
}

/** Interactive D3 force-directed graph visualizing Scope 3 supply chain emission sources. */
export const Scope3Graph: React.FC<{ data: SupplyChainNode[] }> = ({ data }) => {
  const d3Container = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number, y: number,
    name: string, factor: number, unit: string
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800 });

  useEffect(() => {
    let rafId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setDimensions({
          width: containerRef.current?.clientWidth || 800
        });
      });
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !d3Container.current) return;

    const svg = d3.select(d3Container.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = Math.max(300, width * 0.5);

    svg
      .attr('viewBox', [0, 0, width, height].join(' '))
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // FIX: preserve the display name before D3 overwrites d.source on links
    const nodes = data.map(d => ({
      id: d.id,
      displayName: d.source, // store display name explicitly
      factor: d.factor,
      unit: d.unit,
      category: d.category,
    }));

    const graphNodes: GraphNode[] = nodes.map(n => ({ ...n }));

    const links = data.flatMap(d =>
      d.dependencies.map((dep: string) => ({
        source: d.id,
        target: dep,
        value: d.factor || 1,
      }))
    );

    const graphLinks: GraphLink[] = links.map(l => ({ ...l }));

    const simulation = d3
      .forceSimulation<GraphNode>(graphNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphLinks).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append('g')
      .selectAll('line')
      .data(graphLinks)
      .join('line')
      .attr('stroke', 'var(--border-color)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: GraphLink) => Math.sqrt(d.value));

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(graphNodes)
      .join('circle')
      .attr('r', (d: GraphNode) => (d.category === 'user' ? 12 : 6))
      .attr('fill', (d: GraphNode) =>
        d.category === 'user' ? 'var(--accent-color)' : '#3b82f6'
      )
      .attr('stroke', 'var(--bg-color)')
      .attr('stroke-width', 2)
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', (d: GraphNode) => `${d.displayName || d.id}: ${d.factor} ${d.unit}`)
      .attr('style', 'cursor: pointer; transition: opacity 0.2s ease, transform 0.2s ease; transform-box: fill-box; transform-origin: center; outline: none;')
      /* eslint-disable @typescript-eslint/no-explicit-any -- D3 drag generics don't match selection's BaseType union */
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */

    const linkedByIndex: Record<string, boolean> = {};
    graphLinks.forEach((d) => {
      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;
      linkedByIndex[`${sourceId},${targetId}`] = true;
    });

    function isConnected(a: GraphNode, b: GraphNode) {
      return (
        linkedByIndex[`${a.id},${b.id}`] ||
        linkedByIndex[`${b.id},${a.id}`] ||
        a.id === b.id
      );
    }

    // FIX: use d.displayName instead of d.source
    node
      .on('mouseenter', (event: MouseEvent, d: GraphNode) => {
        setTooltip({
          x: event.pageX,
          y: event.pageY,
          name: d.displayName || d.id,
          factor: d.factor,
          unit: d.unit,
        });
        node.style('opacity', (n: GraphNode) => (isConnected(d, n) ? 1 : 0.1));
        node.style('transform', (n: GraphNode) => (isConnected(d, n) ? 'scale(1)' : 'scale(0.85)'));
        link.style('opacity', (l: GraphLink) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return sId === d.id || tId === d.id ? 1 : 0.15;
        });
      })
      .on('mouseleave', () => {
        setTooltip(null);
        node.style('opacity', 1);
        node.style('transform', 'scale(1)');
        link.style('opacity', 0.6);
      })
      .on('focus', (event: FocusEvent, d: GraphNode) => {
        const rect = (event.target as Element).getBoundingClientRect();
        setTooltip({
          x: rect.x + rect.width / 2,
          y: rect.y,
          name: d.displayName || d.id,
          factor: d.factor,
          unit: d.unit,
        });
        node.style('opacity', (n: GraphNode) => (isConnected(d, n) ? 1 : 0.1));
        node.style('transform', (n: GraphNode) => (isConnected(d, n) ? 'scale(1)' : 'scale(0.85)'));
        link.style('opacity', (l: GraphLink) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return sId === d.id || tId === d.id ? 1 : 0.15;
        });
        d3.select(event.currentTarget as Element).attr('stroke', 'var(--accent-color)').attr('stroke-width', 4);
      })
      .on('blur', (event) => {
        setTooltip(null);
        node.style('opacity', 1);
        node.style('transform', 'scale(1)');
        link.style('opacity', 0.6);
        d3.select(event.currentTarget as Element).attr('stroke', 'var(--bg-color)').attr('stroke-width', 2);
      })
      .on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          // Keep tooltip visible or do some action
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          const nodesArr = node.nodes();
          const idx = nodesArr.indexOf(event.target as SVGCircleElement);
          if (idx >= 0 && idx < nodesArr.length - 1) {
            (nodesArr[idx + 1] as HTMLElement).focus();
          }
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          const nodesArr = node.nodes();
          const idx = nodesArr.indexOf(event.target as SVGCircleElement);
          if (idx > 0) {
            (nodesArr[idx - 1] as HTMLElement).focus();
          }
        }
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d: GraphLink) => typeof d.source === 'object' ? d.source.x || 0 : 0)
        .attr('y1', (d: GraphLink) => typeof d.source === 'object' ? d.source.y || 0 : 0)
        .attr('x2', (d: GraphLink) => typeof d.target === 'object' ? d.target.x || 0 : 0)
        .attr('y2', (d: GraphLink) => typeof d.target === 'object' ? d.target.y || 0 : 0);
      node.attr('cx', (d: GraphNode) => d.x || 0).attr('cy', (d: GraphNode) => d.y || 0);
    });

    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, dimensions]);

  return (
    <div
      ref={containerRef}
      className="scope3-container"
    >
      <svg
        ref={d3Container}
        width="100%"
        height="100%"
        aria-label={`Scope 3 Supply Chain Network. ${data.length} emission sources mapped. Use arrow keys to navigate nodes.`}
        role="application"
      />
      {tooltip && (
        <div
          className="scope3-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y - 32 }}
        >
          <strong className="scope3-tooltip-name">
            {tooltip.name}
          </strong>
          <span className="scope3-tooltip-detail">
            {tooltip.factor} {tooltip.unit}
          </span>
        </div>
      )}
    </div>
  );
};
