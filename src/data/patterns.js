/**
 * patterns.js — the pattern cheat sheet shown from the LIST tab ("? PATTERNS").
 * Pure data, like plan.js: edit the rows here, the overlay just renders them.
 *
 *   CLUES       [ [what the problem says, what to think] ]
 *   CONSTRAINTS [ [input size, target complexity] ]
 */

export const CLUES = [
  ["contiguous subarray / substring with a condition", "sliding window"],
  ["pairs in a sorted array, compare from both ends", "two pointers"],
  ["subarray sum equals K, with negatives", "prefix sum + hash map"],
  ["next greater / smaller, contribution of each element as min/max", "monotonic stack"],
  ["window max/min", "monotonic deque"],
  ["parentheses, expression evaluation, remove adjacent", "stack"],
  ["all subsets / permutations / combinations", "backtracking"],
  ["sorted or rotated array", "binary search"],
  ["minimize the maximum / maximize the minimum", "binary search on the answer"],
  ["top K / Kth largest / running median", "heap"],
  ["overlapping intervals, meetings, rooms", "sort + greedy / sweep line"],
  ["linked list cycle or middle", "fast & slow pointers"],
  ["frequency, anagram, duplicates", "hash map / count array"],
  ["shortest path", "unweighted → BFS; weighted → Dijkstra"],
  ["dependencies / ordering of tasks", "topological sort"],
  ["groups that merge, connected components", "DSU (union-find)"],
  ["prefix matching on many words", "trie"],
  ["XOR, single number, subsets of small n", "bit manipulation"],
  ["count ways / min cost / longest something with choices", "DP"],
  ["longest increasing", "DP or binary search (LIS)"],
  ["palindrome", "two pointers / expand around center / DP"],
];

export const CONSTRAINTS = [
  ["n ≤ 10", "O(n!) permutations"],
  ["n ≤ 20", "O(2ⁿ) backtracking / bitmask"],
  ["n ≤ 500", "O(n³)"],
  ["n ≤ 5,000", "O(n²)"],
  ["n ≤ 10⁶", "O(n log n) or O(n)"],
  ["n ≤ 10⁹ or more", "O(log n) or O(1)"],
];
