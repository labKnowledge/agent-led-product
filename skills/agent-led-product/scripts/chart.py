#!/usr/bin/env python3
"""Scoreboard + per-question coverage charts from a scores JSON.

scores.json: {"Product A": [q1..q10], "Product B": [...]}   (values 0 / 0.5 / 1)
usage: chart.py scores.json <out_dir> [--title "Portfolio name"]
Writes <out_dir>/agent-readiness-scoreboard.png and agent-readiness-gaps.png.
Palette: validated reference palette (dataviz skill) — status colors for bands, single blue for magnitude.
"""
import json
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

SURF, INK, INK2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df"
CRIT, WARN, GOOD, BLUE = "#d03b3b", "#fab219", "#0ca30c", "#2a78d6"
Q = ["Q1 API / MCP", "Q2 CLI", "Q3 Agent docs", "Q4 Scoped keys", "Q5 Per-action pricing",
     "Q6 Proprietary data", "Q7 Sells outcome", "Q8 Audit + approval", "Q9 UI inside agents", "Q10 Model-resilient"]


def style(ax):
    ax.set_facecolor(SURF)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(colors=INK2, length=0)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(2)
    title = "Agent-readiness"
    if "--title" in args:
        title = args[args.index("--title") + 1]
    P = json.load(open(args[0]))
    out = args[1]
    for k, v in P.items():
        if len(v) != 10:
            sys.exit(f"{k}: expected 10 values, got {len(v)}")
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11})

    items = sorted(P.items(), key=lambda kv: sum(kv[1]))
    names = [k for k, _ in items]
    scores = [sum(v) for _, v in items]
    n = len(P)
    avg = sum(scores) / n
    nat = sum(s >= 8 for s in scores)
    tra = sum(4 <= s < 8 for s in scores)
    risk = sum(s < 4 for s in scores)

    fig, ax = plt.subplots(figsize=(10, max(3.2, 0.37 * n + 1.8)), dpi=160, facecolor=SURF)
    style(ax)
    colors = [GOOD if s >= 8 else (WARN if s >= 4 else CRIT) for s in scores]
    ax.barh(names, scores, color=colors, height=0.72, edgecolor=SURF, linewidth=2)
    for i, s in enumerate(scores):
        ax.text(s + 0.12, i, f"{s:g}", va="center", ha="left", color=INK, fontsize=10)
    for x, lab in ((4, "4 = transitioning"), (8, "8 = agent-native")):
        ax.axvline(x, color=INK2, linewidth=1, linestyle=(0, (3, 3)))
        ax.text(x + 0.05, n - 0.3, lab, color=INK2, fontsize=9, va="bottom")
    ax.set_xlim(0, 10)
    ax.set_ylim(-0.6, n + 0.4)
    ax.tick_params(axis="y", labelcolor=INK, labelsize=10)
    ax.set_xlabel("Agent-readiness score (0–10)", color=INK2)
    fig.suptitle(f"{title}: agent-readiness score by product", x=0.03, ha="left", color=INK, fontsize=15, fontweight="bold")
    ax.set_title(f"{n} products · avg {avg:.1f} / 10 · {nat} agent-native · {tra} transitioning · {risk} at risk",
                 loc="left", color=INK2, fontsize=10, pad=14)
    ax.legend(handles=[Patch(color=CRIT, label="At risk (0–3.5)"), Patch(color=WARN, label="Transitioning (4–7.5)"),
                       Patch(color=GOOD, label="Agent-native (8–10)")], loc="lower right", frameon=False, labelcolor=INK)
    fig.tight_layout()
    fig.savefig(f"{out}/agent-readiness-scoreboard.png", facecolor=SURF)

    cov = [sum(v[i] for v in P.values()) / n * 100 for i in range(10)]
    order = sorted(range(10), key=lambda i: cov[i])
    fig, ax = plt.subplots(figsize=(10, 6), dpi=160, facecolor=SURF)
    style(ax)
    ax.barh([Q[i] for i in order], [cov[i] for i in order], color=BLUE, height=0.66, edgecolor=SURF, linewidth=2)
    for j, i in enumerate(order):
        ax.text(cov[i] + 1, j, f"{cov[i]:.0f}%", va="center", color=INK, fontsize=10)
    ax.set_xlim(0, 100)
    ax.tick_params(axis="y", labelcolor=INK, labelsize=10.5)
    ax.set_xlabel(f"Coverage (% of max points across {n} products)", color=INK2)
    weakest = ", ".join(Q[i].split(" ", 1)[1] for i in order[:3])
    fig.suptitle("Where readiness is weakest: coverage per question", x=0.03, ha="left", color=INK, fontsize=15, fontweight="bold")
    ax.set_title(f"Weakest: {weakest}", loc="left", color=INK2, fontsize=10, pad=12)
    fig.tight_layout()
    fig.savefig(f"{out}/agent-readiness-gaps.png", facecolor=SURF)
    print(json.dumps({"avg": round(avg, 2), "agent_native": nat, "transitioning": tra, "at_risk": risk,
                      "coverage": {Q[i]: round(cov[i]) for i in range(10)}}, indent=1))


if __name__ == "__main__":
    main()
