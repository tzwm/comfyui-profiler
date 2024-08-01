import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

let PRECISION = 2;

function drawText(ctx, text) {
  if (!text) {
    return;
  }

  const fgColor = "white";
  const bgColor = "#0F1F0F";
  const px = 6;
  const py = 10;

  ctx.save();
  ctx.font = "12px sans-serif";
  const sz = ctx.measureText(text);
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(0, -LiteGraph.NODE_TITLE_HEIGHT - py * 2, sz.width + px * 2, px * 2, 5);
  ctx.fill();

  ctx.fillStyle = fgColor;
  ctx.fillText(text, px, -LiteGraph.NODE_TITLE_HEIGHT - px);
  ctx.restore();
}

function overwriteOnDrawForeground(node) {
  if (node.onDrawForeground?._overwrited) {
    return;
  }
  const orig = node.onDrawForeground;
  node.onDrawForeground = function(ctx) {
    const ret = orig?.apply(ctx, arguments);
    drawText(ctx, node.durationStr || '');
    return ret;
  };
  node.onDrawForeground._overwrited = true
}

class NodeProfiler {
  constructor() {
    this.onExecutingEvent = this.onExecutingEvent.bind(this);
  }

  reset() {
    this.curNode = null;
    this.curNodeStartTimeMs = null;
    this.globalStartTimeMs = performance.now();
  }

  onExecutingEvent(e) {
    const nodeId = e.detail;
    const newNode = app.graph._nodes.find((n) => n.id.toString() == nodeId);
    if (this.curNode !== null) {
      let duration = (performance.now() - this.curNodeStartTimeMs) / 1000;

      this.curNode.durationStr = `${duration.toFixed(PRECISION)}s `;
      if (duration > 1) {
        this.curNode.durationStr += "🔥"
      }
      if (duration > 5) {
        this.curNode.durationStr += "🔥"
      }
      if (duration > 10) {
        this.curNode.durationStr += "🔥"
      }
      console.log(`Node "${this.curNode.title}"(${this.curNode.type}) took ${this.curNode.durationStr}`);
    }
    if (newNode == null) { // This is the ComfyUI way of signaling execution is done
      console.log(`Prompt executed in ${((performance.now() - this.globalStartTimeMs) / 1000).toFixed(PRECISION)}s`);
    }
    this.curNode = newNode;
    this.curNodeStartTimeMs = performance.now();
  }
}
const profiler = new NodeProfiler();

app.registerExtension({
  name: "ComfyUI.Profiler",
  async setup() {
    const orig = app.graph.onNodeAdded;
    app.graph.onNodeAdded = function(node) {
      const ret = orig?.apply(node, arguments);
      overwriteOnDrawForeground(node);
      return ret;
    }
  },
  async afterConfigureGraph() {
    const nodes = app.graph._nodes;
    api.addEventListener("execution_start", (_) => {
      profiler.reset();
      nodes.forEach(n => n.durationStr = '');
    });
    nodes.forEach(node => {
      overwriteOnDrawForeground(node);
    });
    api.addEventListener("executing", profiler.onExecutingEvent);
  }
});
