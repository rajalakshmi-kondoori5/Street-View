/**
 * Closed-tour TSP heuristics. A tour is a list of matrix indices that starts with the depot (0)
 * and visits every other index once; returning to the depot is implied.
 */

export function tourCost(tour: number[], m: number[][]): number {
  if (tour.length < 2) return 0;
  let cost = 0;
  for (let i = 0; i < tour.length - 1; i++) cost += m[tour[i]][tour[i + 1]];
  return cost + m[tour[tour.length - 1]][tour[0]];
}

/** Nearest Neighbour construction: from the depot, always drive to the closest unvisited bin. */
export function nearestNeighbor(m: number[][]): number[] {
  const n = m.length;
  if (n === 0) return [];
  const visited = new Array<boolean>(n).fill(false);
  const tour = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const from = tour[tour.length - 1];
    let best = -1;
    for (let j = 0; j < n; j++) {
      if (!visited[j] && (best === -1 || m[from][j] < m[from][best])) best = j;
    }
    visited[best] = true;
    tour.push(best);
  }
  return tour;
}

/**
 * 2-opt improvement: reverse the segment tour[i..k] whenever that shortens the closed tour,
 * until no improving move remains. The depot (position 0) never moves.
 * Costs are re-evaluated in full so this is also correct for asymmetric road matrices
 * (one-way streets), where reversing a segment changes the cost of the edges inside it.
 */
export function twoOpt(tour: number[], m: number[][], maxPasses = 200): number[] {
  let best = tour.slice();
  let bestCost = tourCost(best, m);
  for (let pass = 0; pass < maxPasses; pass++) {
    let improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        const cost = tourCost(candidate, m);
        if (cost < bestCost - 1e-9) {
          best = candidate;
          bestCost = cost;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return best;
}
