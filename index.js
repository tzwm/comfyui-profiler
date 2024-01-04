import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

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

app.registerExtension({
  name: "ComfyUI.Profiler",
  async setup() {
    const nodes = app.graph._nodes;
    api.addEventListener("profiler", (event) => {
      const data = event.detail;
      const node = nodes.find((n) => n.id.toString() == data.node);
      if (node) {
        node.profilingTime = `${data.current_time.toFixed(2)}s`;
      }
    });
    api.addEventListener("execution_start", (_) => {
      nodes.forEach(n => n.profilingTime = '');
    });
    nodes.forEach(node => {
      const orig = node.onDrawForeground;
      node.onDrawForeground = function (ctx) {
        const ret = orig(ctx, arguments);
        drawText(ctx, node.profilingTime || '');
        return ret;
      };
    });
	},
});
