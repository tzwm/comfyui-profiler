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

function nodeDrawProfiler(node, attempt = 0) {
  if (!node.onDrawForeground) {
    // not ready yet - try again
    if (attempt < 5) {
      setTimeout(() => nodeDrawProfiler(node, attempt + 1), attempt * 1000);
    }
  }

  if (node.onDrawForeground._overwrited) {
    return;
  }
  const orig = node.onDrawForeground;
  node.onDrawForeground = function (ctx) {
    const ret = orig?.apply(node, arguments);
    drawText(ctx, node.profilingTime || '');
    return ret;
  };
  node.onDrawForeground._overwrited = true
}


app.registerExtension({
  name: "ComfyUI.Profiler",
  async setup() {
    api.addEventListener("profiler", (event) => {
      const data = event.detail;
      const node = app.graph._nodes.find((n) => n.id.toString() == data.node);
      if (node) {
        node.profilingTime = `${data.current_time.toFixed(PRECISION)}s`;
      }
    });
    app.ui.settings.addSetting({
      id: 'comfyui.profiler.label_precision',
      name: "🕚 Profiler Label Precision",
      type: 'integer',
      tooltip: 'set timing label precision',
      defaultValue: PRECISION,
      onChange(v) {
        PRECISION = v;
      },
    });

    const orig = app.graph.onNodeAdded;
    app.graph.onNodeAdded = function (node) {
      const ret = orig?.apply(node, arguments);
      nodeDrawProfiler(node);
      return ret;
    }
  },
  async afterConfigureGraph() {
    const nodes = app.graph._nodes;
    api.addEventListener("execution_start", (_) => {
      nodes.forEach(n => n.profilingTime = '');
    });
    nodes.forEach(node => {
      nodeDrawProfiler(node);
    });
  }
});
